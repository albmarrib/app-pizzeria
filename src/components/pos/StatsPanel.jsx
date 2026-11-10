import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { BarChart3, Banknote, CreditCard, ShoppingBag, TrendingUp, CheckCircle2, Calendar, ListOrdered, AlertCircle, Download, Receipt, FileText, Printer } from 'lucide-react';
import StatCard from './StatCard';
import { printCompletedOrdersReport, printClosingTicketZ } from '../../utils/printer';

const StatsPanel = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageTicket: 0,
    cashTotal: 0,
    cardTotal: 0,
    invoiceTotal: 0,
    ticketTotal: 0,
    base10: 0,
    iva10: 0,
    base21: 0,
    iva21: 0,
    ticketCount: 0,
    invoiceCount: 0
  });
  
  const [productRanking, setProductRanking] = useState([]);
  const [hasActiveOrders, setHasActiveOrders] = useState(false);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  
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
  
  // To pass settings to printer
  const [globalSettings, setGlobalSettings] = useState({});

  useEffect(() => {
    // Fetch global settings once for the printer
    const fetchSettings = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'settings')));
        const settingsData = snap.docs.find(d => d.id === 'general')?.data() || {};
        setGlobalSettings(settingsData);
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

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
      let invoiceTotal = 0;
      let ticketTotal = 0;
      let base10Total = 0;
      let iva10Total = 0;
      let base21Total = 0;
      let iva21Total = 0;
      let ticketCount = 0;
      let invoiceCount = 0;
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

        if (data.status === 'COMPLETED') {
          completedOrders.push({ id: doc.id, ...data, createdAt: data.createdAt?.toDate() || new Date() });
        }

        const amount = Number(data.total) || 0;
        totalSales += amount;
        totalOrders += 1;

        if (data.payments && data.payments.length > 0) {
          data.payments.forEach(p => {
            if (p.method === 'cash') cashTotal += Number(p.amount) || 0;
            else cardTotal += Number(p.amount) || 0;
          });
        } else {
          if (data.paymentMethod === 'cash') {
            cashTotal += amount;
          } else {
            cardTotal += amount;
          }
        }
        
        if (data.invoiceId) {
          invoiceTotal += amount;
          invoiceCount += 1;
        } else {
          ticketTotal += amount;
          ticketCount += 1;
        }

        let oTotal10 = 0;
        let oTotal21 = 0;
        if (data.items && data.items.length > 0) {
          data.items.forEach(item => {
            const tax = Number(item.taxRate) || 10;
            const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
            if (tax === 21) oTotal21 += itemTotal;
            else oTotal10 += itemTotal;
          });
        } else {
          oTotal10 = amount;
        }
        if (data.deliveryFee) oTotal10 += Number(data.deliveryFee) || 0;

        const b10 = oTotal10 / 1.10;
        const i10 = oTotal10 - b10;
        const b21 = oTotal21 / 1.21;
        const i21 = oTotal21 - b21;

        base10Total += b10;
        iva10Total += i10;
        base21Total += b21;
        iva21Total += i21;
        
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
        cardTotal,
        invoiceTotal,
        ticketTotal,
        base10: base10Total,
        iva10: iva10Total,
        base21: base21Total,
        iva21: iva21Total,
        ticketCount,
        invoiceCount
      });
      setProductRanking(ranking);
      setHasActiveOrders(activeCount > 0);
      setCompletedOrders(completedOrders.sort((a,b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseRegister = async () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar la caja del periodo seleccionado? Se guardará el cierre y se emitirá el Ticket Z en la impresora.')) {
      setIsClosing(true);
      try {
        const closingData = {
          date: serverTimestamp(),
          periodStart: startDate,
          periodEnd: endDate,
          totalSales: stats.totalSales,
          totalOrders: stats.totalOrders,
          cashTotal: stats.cashTotal,
          cardTotal: stats.cardTotal,
          base10: stats.base10 || 0,
          iva10: stats.iva10 || 0,
          base21: stats.base21 || 0,
          iva21: stats.iva21 || 0,
          ticketCount: stats.ticketCount || 0,
          invoiceCount: stats.invoiceCount || 0,
          closedBy: 'Admin',
        };

        const docRef = await addDoc(collection(db, 'daily_closings'), closingData);
        
        // Emitir Ticket Z automáticamente
        printClosingTicketZ({ id: docRef.id, ...closingData, ...stats }, globalSettings);

        setClosedSuccess(true);
        setClosedDocId(docRef.id);
        setIsAlreadyClosed(true);

        // Reiniciar los totales en la vista
        setStats({
          totalSales: 0,
          totalOrders: 0,
          averageTicket: 0,
          cashTotal: 0,
          cardTotal: 0,
          invoiceTotal: 0,
          ticketTotal: 0,
          base10: 0,
          iva10: 0,
          base21: 0,
          iva21: 0,
          ticketCount: 0,
          invoiceCount: 0
        });
        setProductRanking([]);
        
        setTimeout(() => setClosedSuccess(false), 5000);
      } catch (error) {
        console.error("Error closing register:", error);
        alert("Hubo un error al cerrar la caja.");
      } finally {
        setIsClosing(false);
      }
    }
  };

  const handleReprintClosingTicketZ = async () => {
    try {
      if (closedDocId) {
        const snap = await getDoc(doc(db, 'daily_closings', closedDocId));
        if (snap.exists()) {
          const d = snap.data();
          printClosingTicketZ({ id: snap.id, ...d }, globalSettings);
          return;
        }
      }
      printClosingTicketZ({
        periodStart: startDate,
        periodEnd: endDate,
        ...stats,
        closedBy: 'Admin'
      }, globalSettings);
    } catch (err) {
      console.error(err);
      alert("Error reimprimiendo Ticket Z");
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

      // Cargar facturas emitidas para cruzar NIF y número oficial
      const invoicesMap = {};
      try {
        const invSnap = await getDocs(collection(db, 'invoices'));
        invSnap.forEach(invDoc => {
          const invData = invDoc.data();
          invoicesMap[invDoc.id] = invData;
          if (invData.orderId) {
            invoicesMap[invData.orderId] = invData;
          }
        });
      } catch (errInvoices) {
        console.warn("No se pudieron precargar facturas nominativas:", errInvoices);
      }

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const s = String(val).replace(/\r?\n|\r/g, ' ').trim();
        if (s.includes(';') || s.includes('"')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const formatNum = (num) => {
        const n = Number(num) || 0;
        return n.toFixed(2).replace('.', ',');
      };

      const headers = [
        "Fecha",
        "Hora",
        "Nº Pedido",
        "ID Interno",
        "Tipo Documento",
        "Nº Factura Oficial",
        "NIF / CIF Cliente",
        "Cliente / Razón Social",
        "Tipo Pedido",
        "Método de Cobro",
        "Base 10% (€)",
        "Cuota IVA 10% (€)",
        "Base 21% (€)",
        "Cuota IVA 21% (€)",
        "Total Base Imponible (€)",
        "Total Cuota IVA (€)",
        "Total Facturado (€)",
        "Cobrado Efectivo (€)",
        "Cobrado Tarjeta (€)"
      ];

      let grandBase10 = 0;
      let grandIva10 = 0;
      let grandBase21 = 0;
      let grandIva21 = 0;
      let grandTotalBase = 0;
      let grandTotalIVA = 0;
      let grandTotalCobrado = 0;
      let grandCash = 0;
      let grandCard = 0;

      // Extraer y ordenar pedidos cronológicamente (antiguos a recientes)
      const validOrders = [];
      querySnapshot.forEach(docSnap => {
        const orderData = docSnap.data();
        if (orderData.status === 'CANCELED') return;
        validOrders.push({ id: docSnap.id, ...orderData });
      });

      validOrders.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeA - timeB;
      });

      const rows = validOrders.map(orderData => {
        const createdAtDate = orderData.createdAt?.toDate ? orderData.createdAt.toDate() : (orderData.createdAt ? new Date(orderData.createdAt) : new Date());
        const dateStr = createdAtDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = createdAtDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        const shortId = `#${orderData.id.slice(-6).toUpperCase()}`;
        const inv = orderData.invoiceId ? invoicesMap[orderData.invoiceId] : (invoicesMap[orderData.id] || null);
        const isFactura = Boolean(inv || orderData.invoiceId);
        const docType = isFactura ? 'Factura Nominativa' : 'Ticket Simplificado';
        const invoiceNum = inv?.invoiceNumber || (orderData.invoiceId ? 'Factura Emitida' : '-');
        const customerNif = inv?.customer?.nif || '-';
        const customerName = inv?.customer?.businessName || orderData.customerInfo?.name || (orderData.tableNumber ? `Mesa ${orderData.tableNumber}` : 'Cliente Contado');
        const orderTypeStr = orderData.orderType === 'delivery' ? 'A Domicilio' : (orderData.orderType === 'pickup' ? 'Para Recoger' : 'Local / Mesa');

        let cashAmount = 0;
        let cardAmount = 0;
        if (orderData.payments && orderData.payments.length > 0) {
          orderData.payments.forEach(p => {
            const amt = Number(p.amount) || 0;
            if (p.method === 'cash') cashAmount += amt;
            else cardAmount += amt;
          });
        } else {
          const totalAmt = Number(orderData.total) || 0;
          if (orderData.paymentMethod === 'cash') {
            cashAmount = totalAmt;
          } else {
            cardAmount = totalAmt;
          }
        }

        let methodStr = 'Tarjeta';
        if (cashAmount > 0 && cardAmount > 0) {
          methodStr = `Mixto (Ef: ${formatNum(cashAmount)} € / Tarj: ${formatNum(cardAmount)} €)`;
        } else if (cashAmount > 0) {
          methodStr = 'Efectivo';
        } else {
          methodStr = 'Tarjeta';
        }

        let total10 = 0;
        let total21 = 0;
        let total4 = 0;
        let total0 = 0;

        if (orderData.items && orderData.items.length > 0) {
          orderData.items.forEach(item => {
            const tax = Number(item.taxRate) || 10;
            const itemTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
            if (tax === 10) total10 += itemTotal;
            else if (tax === 21) total21 += itemTotal;
            else if (tax === 4) total4 += itemTotal;
            else if (tax === 0) total0 += itemTotal;
            else total10 += itemTotal;
          });
        } else {
          total10 = Number(orderData.total) || 0;
        }
        
        if (orderData.deliveryFee) {
          total10 += Number(orderData.deliveryFee) || 0;
        }

        const base10 = total10 / 1.10;
        const iva10 = total10 - base10;
        const base21 = total21 / 1.21;
        const iva21 = total21 - base21;
        const base4 = total4 / 1.04;
        const iva4 = total4 - base4;

        const totalBase = base10 + base21 + base4 + total0;
        const totalIVA = iva10 + iva21 + iva4;
        const totalFacturado = Number(orderData.total) || (totalBase + totalIVA);

        grandBase10 += base10;
        grandIva10 += iva10;
        grandBase21 += base21;
        grandIva21 += iva21;
        grandTotalBase += totalBase;
        grandTotalIVA += totalIVA;
        grandTotalCobrado += totalFacturado;
        grandCash += cashAmount;
        grandCard += cardAmount;

        return [
          dateStr,
          timeStr,
          shortId,
          orderData.id,
          escapeCSV(docType),
          escapeCSV(invoiceNum),
          escapeCSV(customerNif),
          escapeCSV(customerName),
          escapeCSV(orderTypeStr),
          escapeCSV(methodStr),
          formatNum(base10),
          formatNum(iva10),
          formatNum(base21),
          formatNum(iva21),
          formatNum(totalBase),
          formatNum(totalIVA),
          formatNum(totalFacturado),
          formatNum(cashAmount),
          formatNum(cardAmount)
        ].join(';');
      });

      const totalsRow = [
        'TOTALES PERIODO',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        formatNum(grandBase10),
        formatNum(grandIva10),
        formatNum(grandBase21),
        formatNum(grandIva21),
        formatNum(grandTotalBase),
        formatNum(grandTotalIVA),
        formatNum(grandTotalCobrado),
        formatNum(grandCash),
        formatNum(grandCard)
      ].join(';');

      const csvContent = "\uFEFF" + headers.join(';') + '\n' + rows.join('\n') + '\n' + totalsRow + '\n';

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Facturacion_Gestoria_${startDate}_al_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(err) {
      console.error(err);
      alert('Error exportando archivo de gestoría');
    }
  };

  const handleExportClosingsCSV = async () => {
    try {
      const snap = await getDocs(collection(db, 'daily_closings'));
      if (snap.empty) {
        alert("No hay registros de cierre de caja guardados.");
        return;
      }

      const closings = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.periodStart >= startDate && d.periodStart <= endDate) {
          closings.push({ id: docSnap.id, ...d });
        }
      });

      if (closings.length === 0) {
        alert("No hay registros de cierre de caja en este rango de fechas.");
        return;
      }

      closings.sort((a, b) => (a.periodStart || '').localeCompare(b.periodStart || ''));

      const formatNum = (num) => Number(num || 0).toFixed(2).replace('.', ',');
      const headers = [
        "Fecha Arqueo",
        "Periodo Inicio",
        "Periodo Fin",
        "Total Pedidos",
        "Total Ventas (€)",
        "Efectivo en Caja (€)",
        "Tarjeta / Digital (€)",
        "Cerrado Por"
      ];

      let grandOrders = 0;
      let grandSales = 0;
      let grandCash = 0;
      let grandCard = 0;

      const rows = closings.map(c => {
        const dateStr = c.date?.toDate ? c.date.toDate().toLocaleString('es-ES') : '';
        const sales = Number(c.totalSales) || 0;
        const cash = Number(c.cashTotal) || 0;
        const card = Number(c.cardTotal) || 0;
        const orders = Number(c.totalOrders) || 0;

        grandOrders += orders;
        grandSales += sales;
        grandCash += cash;
        grandCard += card;

        return [
          dateStr,
          c.periodStart || '',
          c.periodEnd || '',
          orders,
          formatNum(sales),
          formatNum(cash),
          formatNum(card),
          c.closedBy || 'Admin'
        ].join(';');
      });

      const totalsRow = [
        'TOTALES',
        '',
        '',
        grandOrders,
        formatNum(grandSales),
        formatNum(grandCash),
        formatNum(grandCard),
        ''
      ].join(';');

      const csvContent = "\uFEFF" + headers.join(';') + '\n' + rows.join('\n') + '\n' + totalsRow + '\n';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Cierres_Caja_${startDate}_al_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exportando cierres de caja:", err);
      alert("Hubo un error al exportar los cierres de caja.");
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
            title="Descargar libro de ventas e IVA para gestoría (Compatible 100% con Excel)"
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold transition-colors ml-2 flex items-center gap-1.5 border border-emerald-200 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Excel Gestoría
          </button>
          <button 
            onClick={handleExportClosingsCSV}
            title="Descargar historial de cierres diarios de caja para Excel"
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-bold transition-colors ml-1 flex items-center gap-1.5 border border-blue-200 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Cierres de Caja
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
              onClick={() => setShowOrdersModal(true)}
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

                <h3 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">Control para Gestoría</h3>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5" /> Facturas Nominativas
                    </h4>
                    <p className="text-4xl font-black text-blue-900">{stats.invoiceTotal.toFixed(2)}€</p>
                    <p className="text-xs text-blue-600 mt-2">Ventas con Factura Nominativa</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                    <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                      <Receipt className="w-5 h-5" /> Tickets Simplificados
                    </h4>
                    <p className="text-4xl font-black text-green-900">{stats.ticketTotal.toFixed(2)}€</p>
                    <p className="text-xs text-green-600 mt-2">Ventas de Mostrador (Sin cliente asignado)</p>
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
                  <div className="w-full text-center p-4 bg-gray-50 text-gray-700 rounded-2xl font-bold flex flex-col items-center gap-3 border border-gray-200">
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-xl border border-green-200 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span>La caja de este periodo ya fue cerrada y registrada.</span>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-1">
                      <button 
                        onClick={handleReprintClosingTicketZ}
                        type="button"
                        className="text-sm bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        Reimprimir Ticket Z
                      </button>
                      <button 
                        onClick={handleReopenRegister}
                        type="button"
                        className="text-sm bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl font-bold transition-colors border border-red-200 cursor-pointer"
                      >
                        Anular Cierre (Modo Pruebas)
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 text-center mb-4 max-w-lg">
                      Asegúrate de contar el efectivo en la caja y comprobar que coincide con el "Esperado en Caja". Al confirmar, se guardará el registro y se emitirá el Ticket Z en la impresora.
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
                        className="w-full md:w-auto bg-black hover:bg-gray-900 text-white font-bold py-4 px-12 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Printer className="w-5 h-5" />
                        {isClosing ? 'Cerrando y emitiendo...' : 'Confirmar Cierre y Emitir Ticket Z'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {/* Completed Orders Modal */}
      {showOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                Pedidos Completados
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                  {completedOrders.length}
                </span>
              </h2>
              <button 
                onClick={() => setShowOrdersModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <CheckCircle2 className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            {/* Resumen del Periodo */}
            <div className="bg-white border-b border-gray-200 p-6 flex flex-wrap gap-4 sm:gap-8 justify-between sm:justify-start text-sm font-medium text-gray-700 shadow-inner">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Pedidos</span>
                <span className="text-2xl font-black text-gray-900">{stats.totalOrders}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">T. Simplificados</span>
                <span className="text-2xl font-black text-gray-900">{completedOrders.filter(o => !o.invoiceId).length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">F. Nominativas</span>
                <span className="text-2xl font-black text-gray-900">{completedOrders.filter(o => o.invoiceId).length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Esperado Caja</span>
                <span className="text-2xl font-black text-green-600">{stats.cashTotal.toFixed(2)}€</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Tarjeta/Online</span>
                <span className="text-2xl font-black text-blue-600">{stats.cardTotal.toFixed(2)}€</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Acumulado</span>
                <span className="text-2xl font-black text-purple-600">{stats.totalSales.toFixed(2)}€</span>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-gray-50">
              {completedOrders.length === 0 ? (
                <div className="text-center text-gray-500 py-10">No hay pedidos completados en este periodo.</div>
              ) : (
                completedOrders.map((order, i) => (
                  <div key={order.id || i} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4 hover:border-blue-300 transition-colors">
                    <div>
                      <div className="flex gap-2 items-center mb-2">
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">#{order.id.slice(-4).toUpperCase()}</span>
                        <span className="font-bold text-gray-800">{order.customerInfo?.name || 'Cliente'}</span>
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>{order.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {order.orderType === 'delivery' ? 'A Domicilio' : order.orderType === 'pickup' ? 'Recoger' : 'En Mesa'}</p>
                        <p className="font-medium text-gray-700">Total: {Number(order.total || 0).toFixed(2)}€ ({order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod === 'split' ? 'Mixto' : 'Tarjeta'})</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="font-bold">{item.quantity}x</span>
                          <span className="truncate max-w-[200px]">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t bg-white flex justify-end">
              <button 
                onClick={() => printCompletedOrdersReport(completedOrders, stats, globalSettings)} 
                className="px-6 py-2 bg-gray-800 text-white font-bold rounded-xl hover:bg-black transition-colors flex gap-2 items-center"
              >
                <FileText className="w-5 h-5" /> Imprimir Listado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
