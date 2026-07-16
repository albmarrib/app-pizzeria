import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Map, Phone, CheckCircle2, Navigation, MapPin, Search, QrCode, Banknote, CreditCard, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const DeliveryDriver = () => {
  const [orders, setOrders] = useState([]);
  const [driverFilter, setDriverFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Payment Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'cash', 'card', 'qr'
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'OUT_FOR_DELIVERY')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData.sort((a,b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const visibleOrders = driverFilter 
    ? orders.filter(o => o.driverName?.toLowerCase().includes(driverFilter.toLowerCase()))
    : orders;

  const handleOpenMapsMulti = () => {
    if (visibleOrders.length === 0) return;
    const destinations = visibleOrders.map(o => o.customerInfo?.address).filter(Boolean);
    if (destinations.length === 0) return;

    // Use current location as origin, the last address as destination, and the rest as waypoints
    const finalDest = destinations.pop();
    const waypoints = destinations.join('|');

    const url = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${encodeURIComponent(finalDest)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ''}`;
    window.open(url, '_blank');
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder || (!paymentMethod && selectedOrder.paymentStatus !== 'paid')) return;
    setIsProcessing(true);
    try {
      const updateData = { status: 'COMPLETED' };
      if (selectedOrder.paymentStatus !== 'paid') {
        updateData.paymentMethod = paymentMethod;
        updateData.paymentStatus = 'paid';
      }
      
      await updateDoc(doc(db, 'orders', selectedOrder.id), updateData);
      setSelectedOrder(null);
      setPaymentMethod('');
    } catch (err) {
      console.error("Error confirming delivery", err);
      alert("Error al confirmar la entrega.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-gray-500">Cargando rutas...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* App Bar */}
      <div className="bg-red-600 text-white p-4 shadow-md sticky top-0 z-40">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black flex items-center gap-2">
              <Navigation className="w-6 h-6" /> Reparto
            </h1>
            <Link to="/pos" className="text-red-200 text-sm font-bold underline">Volver al TPV</Link>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="w-5 h-5 text-red-300" />
            </div>
            <input 
              type="text" 
              placeholder="Filtra por tu nombre..." 
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="w-full bg-red-700 text-white placeholder-red-300 pl-10 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-white border border-red-500 font-bold"
            />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 mt-2 space-y-6">
        
        {/* Multi-Route Button */}
        {visibleOrders.length > 1 && (
          <button 
            onClick={handleOpenMapsMulti}
            className="w-full bg-black text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <Map className="w-6 h-6 text-blue-400" />
            Ruta Completa ({visibleOrders.length} paradas)
          </button>
        )}

        {visibleOrders.length === 0 && (
          <div className="text-center py-20 text-gray-400 flex flex-col items-center gap-4">
            <CheckCircle2 className="w-16 h-16 opacity-50" />
            <p className="text-lg font-bold">No tienes entregas pendientes</p>
          </div>
        )}

        <div className="space-y-4">
          {visibleOrders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <span className="text-xs font-black text-gray-400 bg-gray-100 px-2 py-1 rounded-md mb-2 inline-block">#{order.id.slice(-4)}</span>
                  <h3 className="font-black text-xl text-gray-900 leading-tight">{order.customerInfo?.name}</h3>
                  <div className="flex items-start gap-2 mt-2 text-gray-600">
                    <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                    <span className="font-medium text-sm">{order.customerInfo?.address || 'Sin dirección especificada'}</span>
                  </div>
                  {order.notes && (
                    <div className="mt-3 text-sm p-3 bg-yellow-50 text-yellow-900 rounded-xl border border-yellow-200">
                      <span className="font-bold">Notas:</span> {order.notes}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="block font-black text-2xl text-gray-900">{order.total?.toFixed(2)}€</span>
                  {order.paymentStatus === 'paid' ? (
                     <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md mt-1 inline-block border border-green-200">Pagado</span>
                  ) : (
                     <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md mt-1 inline-block border border-orange-200">Pendiente</span>
                  )}
                </div>
              </div>

              <div className="flex p-2 gap-2 bg-gray-50">
                <a 
                  href={`tel:${order.customerInfo?.phone}`}
                  className="flex-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-transform"
                >
                  <Phone className="w-5 h-5" /> Llamar
                </a>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customerInfo?.address)}`}
                  target="_blank" rel="noreferrer"
                  className="flex-1 bg-blue-50 border border-blue-200 text-blue-700 font-bold py-3 rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-transform"
                >
                  <Navigation className="w-5 h-5" /> Navegar
                </a>
              </div>
              
              <div className="p-4">
                <button 
                  onClick={() => setSelectedOrder(order)}
                  className="w-full bg-green-500 text-white font-black py-4 rounded-xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform text-lg"
                >
                  Cobrar y Entregar <CheckCircle2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            
            <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Cobro y Entrega</h2>
                <p className="text-gray-500 font-medium">#{selectedOrder.id.slice(-4)} - {selectedOrder.customerInfo?.name}</p>
              </div>
              <button 
                onClick={() => { setSelectedOrder(null); setPaymentMethod(''); }} 
                className="p-3 bg-white border border-gray-200 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 space-y-6">
              
              <div className="text-center">
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-1">Total a cobrar</p>
                <p className="text-5xl font-black text-gray-900">{selectedOrder.total?.toFixed(2)}€</p>
              </div>

              {selectedOrder.paymentStatus === 'paid' ? (
                <div className="bg-green-50 text-green-700 p-6 rounded-2xl border border-green-200 text-center flex flex-col items-center gap-3">
                  <CheckCircle2 className="w-12 h-12" />
                  <p className="font-black text-xl">Este pedido ya está pagado online</p>
                  <p className="text-sm">Solo tienes que entregarlo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-900 font-bold mb-2">Selecciona Método de Pago:</p>
                  
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className={`p-3 rounded-xl ${paymentMethod === 'cash' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      <Banknote className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-lg text-gray-900">Efectivo</p>
                      <p className="text-sm text-gray-500">Cobro en metálico</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className={`p-3 rounded-xl ${paymentMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-lg text-gray-900">Datáfono</p>
                      <p className="text-sm text-gray-500">Tarjeta física</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setPaymentMethod('qr')}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${paymentMethod === 'qr' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className={`p-3 rounded-xl ${paymentMethod === 'qr' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-lg text-gray-900">QR / Móvil</p>
                      <p className="text-sm text-gray-500">Google Pay / Apple Pay</p>
                    </div>
                  </button>
                </div>
              )}

              {paymentMethod === 'qr' && selectedOrder.paymentStatus !== 'paid' && (
                <div className="mt-6 flex flex-col items-center bg-gray-50 p-6 rounded-3xl border border-gray-200">
                  <p className="text-sm font-bold text-gray-600 mb-4 text-center">Muestra este código al cliente para que lo escanee y pague.</p>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PagoPizzeria-${selectedOrder.id}`} 
                      alt="QR de Pago" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

            </div>
            
            <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
              <button 
                onClick={handleConfirmDelivery}
                disabled={isProcessing || (!paymentMethod && selectedOrder.paymentStatus !== 'paid')}
                className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 text-white font-black py-5 rounded-2xl transition-colors flex justify-center items-center gap-2 text-xl"
              >
                {isProcessing ? 'Procesando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDriver;
