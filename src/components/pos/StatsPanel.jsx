import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { BarChart3, Banknote, CreditCard, ShoppingBag, TrendingUp, CheckCircle2, Calendar, ListOrdered, AlertCircle, Download } from 'lucide-react';
import StatCard from './StatCard';

const StatsPanel = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageTicket: 0,
    cashTotal: 0,
    cardTotal: 0,
  });
  
  const [productRanking, setProductRanking] = useState([]);
  const [hasActiveOrders, setHasActiveOrders] = useState(false);
  
  // By default, start of today and end of today
  const defaultStart = new Date();
  defaultStart.setHours(0,0,0,0);
  const defaultEnd = new Date();
  defaultEnd.setHours(23,59,59,999);
  
  // We use YYYY-MM-DD for date inputs
  const formatDateForInput = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(formatDateForInput(defaultStart));
  const [endDate, setEndDate] = useState(formatDateForInput(defaultEnd));
  
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [closedSuccess, setClosedSuccess] = useState(false);
  const [isAlreadyClosed, setIsAlreadyClosed] = useState(false);
  const [closedDocId, setClosedDocId] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'orders'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end)
      );
      
      const querySnapshot = await getDocs(q);
      
      let totalSales = 0;
      let totalOrders = 0;
      let cashTotal = 0;
      let cardTotal = 0;
      let activeCount = 0;
      const productCounts = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Track active orders
        if (data.status !== 'COMPLETED' && data.status !== 'CANCELED') {
          activeCount++;
        }

        // Skip canceled orders
        if (data.status === 'CANCELED') return;

        const amount = Number(data.total) || 0;
        totalSales += amount;
        totalOrders += 1;

        if (data.paymentMethod === 'cash') {
          cashTotal += amount;
        } else {
          cardTotal += amount;
        }
        
        if (data.items) {
          data.items.forEach(item => {
            if (productCounts[item.name]) {
              productCounts[item.name] += item.quantity;
            } else {
              productCounts[item.name] = item.quantity;
            }
          });
        }
      });

      // Check if already closed for this exact period
      const closingsQ = query(
        collection(db, 'daily_closings'),
        where('periodStart', '==', startDate),
        where('periodEnd', '==', endDate)
      );
      const closingsSnap = await getDocs(closingsQ);
      if (!closingsSnap.empty) {
        setIsAlreadyClosed(true);
        setClosedDocId(closingsSnap.docs[0].id);
      } else {
        setIsAlreadyClosed(false);
        setClosedDocId(null);
      }

      const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      const ranking = Object.keys(productCounts).map(name => ({
        name,
        quantity: productCounts[name]
      })).sort((a, b) => b.quantity - a.quantity);

      setStats({
        totalSales,
        totalOrders,
        averageTicket,
        cashTotal,
        cardTotal
      });
      setProductRanking(ranking);
      setHasActiveOrders(activeCount > 0);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseRegister = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar la caja del periodo seleccionado? Esta acción guardará los totales mostrados.')) {
      setIsClosing(true);
      try {
        const docRef = await addDoc(collection(db, 'daily_closings'), {
          date: serverTimestamp(),
          periodStart: startDate,
          periodEnd: endDate,
          totalSales: stats.totalSales,
          totalOrders: stats.totalOrders,
          cashTotal: stats.cashTotal,
          cardTotal: stats.cardTotal,
          closedBy: 'Admin', // Static for now, could be derived from auth
        });
        setClosedSuccess(true);
        // Reiniciar los totales en la vista
        setStats({
          totalSales: 0,
          totalOrders: 0,
          averageTicket: 0,
          cashTotal: 0,
          cardTotal: 0,
        });
        setProductRanking([]);
        setIsAlreadyClosed(true);
        setClosedDocId(docRef.id);
        
        setTimeout(() => setClosedSuccess(false), 5000);
      } catch (error) {
        console.error("Error closing register:", error);
        alert("Hubo un error al cerrar la caja.");
      } finally {
        setIsClosing(false);
      }
    }
  };

  const handleReopenRegister = async () => {
    if (window.confirm('¿Seguro que quieres anular este cierre de caja (Modo Pruebas)? Esto eliminará el registro actual y restaurará los totales en pantalla.')) {
      try {
        const closingsQ = query(
          collection(db, 'daily_closings'),
          where('periodStart', '==', startDate),
          where('periodEnd', '==', endDate)
        );
        const closingsSnap = await getDocs(closingsQ);
        
        const deletePromises = closingsSnap.docs.map(d => deleteDoc(doc(db, 'daily_closings', d.id)));
        await Promise.all(deletePromises);
        
        setIsAlreadyClosed(false);
        setClosedDocId(null);
        
        // Pequeña pausa para asegurar sincronización de Firebase antes de recargar
        setTimeout(() => {
          fetchStats();
        }, 500);
      } catch (err) {
        console.error("Error anulando cierre", err);
        alert("No se pudo anular el cierre.");
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'orders'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end)
      );
      
      const querySnapshot = await getDocs(q);
      
      let csvContent = "Fecha,ID Pedido,Metodo Pago,Total IVA 10%,Total IVA 21%,Base Imponible Total,Cuota IVA Total,Total Cobrado,Factura Oficial\n";

      querySnapshot.forEach(docSnap => {
        const orderData = docSnap.data();
        if (orderData.status === 'CANCELED') return;
        
        let total10 = 0;
        let total21 = 0;
        let total4 = 0;
        let total0 = 0;

        if (orderData.items) {
          orderData.items.forEach(item => {
            const tax = Number(item.taxRate) || 10;
            const itemTotal = item.price * item.quantity;
            if (tax === 10) total10 += itemTotal;
            else if (tax === 21) total21 += itemTotal;
            else if (tax === 4) total4 += itemTotal;
            else if (tax === 0) total0 += itemTotal;
          });
        }
        
        if (orderData.deliveryFee) total10 += orderData.deliveryFee;

        const base10 = total10 / 1.10;
        const iva10 = total10 - base10;
        const base21 = total21 / 1.21;
        const iva21 = total21 - base21;

        const totalBase = base10 + base21 + total4/1.04 + total0;
        const totalIVA = iva10 + iva21 + (total4 - total4/1.04);
        
        const dateStr = orderData.createdAt?.toDate().toLocaleDateString('es-ES') || '';
        const orderId = docSnap.id;
        const isFactura = orderData.invoiceId ? 'SI' : 'NO';
        const method = orderData.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta';

        csvContent += `${dateStr},${orderId},${method},${total10.toFixed(2)},${total21.toFixed(2)},${totalBase.toFixed(2)},${totalIVA.toFixed(2)},${Number(orderData.total).toFixed(2)},${isFactura}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Contabilidad_Pizzeria_${startDate}_al_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(err) {
      console.error(err);
      alert('Error exportando CSV');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header and Date Picker */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estadísticas y Cierre</h2>
          <p className="text-gray-500 text-sm">Resumen de ventas y pedidos por rango de fechas.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm font-medium text-gray-700 outline-none bg-transparent"
            />
          </div>
          <span className="text-gray-300">-</span>
          <div className="flex items-center gap-2 px-2">
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm font-medium text-gray-700 outline-none bg-transparent"
            />
          </div>
          <button 
            onClick={fetchStats}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors ml-2"
          >
            Actualizar
          </button>
          <button 
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-bold transition-colors ml-2 flex items-center gap-1 border border-blue-200"
          >
            <Download className="w-4 h-4" />
            CSV Gestoría
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center">
          <p className="text-gray-500 font-medium">Cargando estadísticas...</p>
        </div>
      ) : (
        <>
          {/* Tarjetas de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Ventas Totales" 
              value={`${stats.totalSales.toFixed(2)}€`}
              icon={TrendingUp}
              colorClass="bg-green-100 text-green-600"
            />
            <StatCard 
              title="Pedidos Completados" 
              value={stats.totalOrders.toString()}
              icon={ShoppingBag}
              colorClass="bg-blue-100 text-blue-600"
            />
            <StatCard 
              title="Ticket Medio" 
              value={`${stats.averageTicket.toFixed(2)}€`}
              icon={BarChart3}
              colorClass="bg-purple-100 text-purple-600"
            />
            <StatCard 
              title="Total en Efectivo" 
              value={`${stats.cashTotal.toFixed(2)}€`}
              icon={Banknote}
              colorClass="bg-yellow-100 text-yellow-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Lista de Productos más vendidos */}
            <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-gray-400" />
                Productos Vendidos
              </h3>
              <div className="overflow-y-auto pr-2 space-y-3 max-h-[600px]">
                {productRanking.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm mt-10">No hay ventas en este periodo</p>
                ) : (
                  productRanking.map((product, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="font-black text-gray-400 text-sm w-4">{idx + 1}.</span>
                        <span className="font-bold text-gray-800 text-sm truncate">{product.name}</span>
                      </div>
                      <span className="bg-white border border-gray-200 text-gray-600 text-xs font-black px-2 py-1 rounded-lg">
                        {product.quantity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sección de Cierre de Caja */}
            <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Cierre de Caja del Periodo</h3>
                
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 p-6 rounded-2xl">
                    <h4 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2">
                      <Banknote className="w-5 h-5" /> Esperado en Caja (Efectivo)
                    </h4>
                    <p className="text-4xl font-black text-gray-900">{stats.cashTotal.toFixed(2)}€</p>
                    <p className="text-xs text-gray-500 mt-2">Solo pedidos cobrados en efectivo</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl">
                    <h4 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" /> Pagos por Tarjeta / Online
                    </h4>
                    <p className="text-4xl font-black text-gray-900">{stats.cardTotal.toFixed(2)}€</p>
                    <p className="text-xs text-gray-500 mt-2">Pagos digitales procesados</p>
                  </div>
                </div>

                {closedSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-medium">¡Cierre de caja guardado con éxito!</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center border-t border-gray-100 pt-6 mt-4">
                {isAlreadyClosed ? (
                  <div className="w-full text-center p-4 bg-gray-100 text-gray-600 rounded-xl font-bold flex flex-col items-center gap-3">
                    <span>La caja de este periodo ya fue cerrada.</span>
                    <button 
                      onClick={handleReopenRegister}
                      className="text-sm bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg font-bold transition-colors border border-red-200"
                    >
                      Anular Cierre (Modo Pruebas)
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 text-center mb-4 max-w-lg">
                      Asegúrate de contar el efectivo en la caja y comprobar que coincide con el "Esperado en Caja". Una vez confirmado, puedes cerrar el día.
                    </p>
                    {hasActiveOrders ? (
                      <div className="w-full text-center p-4 bg-red-50 text-red-700 rounded-xl font-bold flex flex-col items-center gap-2 border border-red-200">
                        <AlertCircle className="w-6 h-6" />
                        <span>No puedes cerrar la caja. Aún hay pedidos pendientes.</span>
                        <span className="text-sm font-normal">Finaliza, entrega o cancela todos los pedidos activos para poder cerrar el día.</span>
                      </div>
                    ) : (
                      <button 
                        onClick={handleCloseRegister}
                        disabled={isClosing}
                        className="w-full md:w-auto bg-black hover:bg-gray-900 text-white font-bold py-4 px-12 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {isClosing ? 'Guardando...' : 'Confirmar Cierre de Caja'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatsPanel;
