import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Clock, CheckCircle2, Flame, AlertCircle, Trash2, CreditCard } from 'lucide-react';

const COLUMNS = ['Nuevos Pedidos', 'En Horno', 'Para Entregar'];

const getColumnColor = (column) => {
  switch (column) {
    case 'Nuevos Pedidos': return 'bg-blue-50 border-blue-200';
    case 'En Horno': return 'bg-orange-50 border-orange-200';
    case 'Para Entregar': return 'bg-green-50 border-green-200';
    default: return 'bg-gray-50 border-gray-200';
  }
};

const getColumnIcon = (column) => {
  switch (column) {
    case 'Nuevos Pedidos': return <AlertCircle className="w-5 h-5 text-blue-500" />;
    case 'En Horno': return <Flame className="w-5 h-5 text-orange-500" />;
    case 'Para Entregar': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    default: return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

const KanbanBoard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders real-time: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const moveOrder = async (orderId, currentStatus, direction) => {
    const currentIndex = COLUMNS.indexOf(currentStatus);
    const newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < COLUMNS.length) {
      const newStatus = COLUMNS[newIndex];
      try {
        await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      } catch (error) {
        console.error("Error updating order status: ", error);
      }
    }
  };

  const deleteOrder = async (orderId) => {
    if(window.confirm("¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.")) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
      } catch (error) {
        console.error("Error deleting order: ", error);
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500 font-medium">Cargando pedidos en tiempo real...</div>;
  }

  return (
    <div className="flex gap-6 h-full items-start overflow-x-auto pb-4">
      {COLUMNS.map((column) => {
        const columnOrders = orders.filter(o => o.status === column);
        
        return (
          <div key={column} className="flex flex-col flex-shrink-0 w-80 bg-gray-50/50 rounded-2xl border border-gray-200 h-full max-h-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-2xl shadow-sm z-10">
              <div className="flex items-center gap-2 font-bold text-gray-800">
                {getColumnIcon(column)}
                {column}
              </div>
              <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-sm font-semibold">
                {columnOrders.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {columnOrders.map((order) => (
                <div key={order.id} className={`p-4 rounded-xl border shadow-sm flex flex-col gap-3 ${getColumnColor(column)} relative group`}>
                  
                  {/* Delete Button (visible on hover) */}
                  <button 
                    onClick={() => deleteOrder(order.id)}
                    className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 z-10"
                    title="Eliminar Pedido"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          #{order.id.slice(-5)}
                        </span>
                        {/* Indicador de Tipo de Pedido */}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-gray-200 text-gray-700">
                          {order.orderType === 'pickup' ? 'Recoger' : 'Delivery'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1 mt-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {order.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <span className="font-black text-gray-900 bg-white/60 px-2 py-1 rounded-lg">
                      {order.subtotal?.toFixed(2)}€
                    </span>
                  </div>
                  
                  {/* Indicador de Estado de Pago */}
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {order.paymentStatus === 'Pagado' ? (
                      <span className="flex items-center gap-1 text-green-700 bg-green-100/80 px-2 py-1 rounded-md border border-green-200 w-full">
                        <CheckCircle2 className="w-3 h-3" /> Pagado ({order.paymentMethod === 'apple_pay' ? 'Apple Pay' : order.paymentMethod === 'google_pay' ? 'Google Pay' : order.paymentMethod})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-100/80 px-2 py-1 rounded-md border border-amber-200 w-full">
                        <CreditCard className="w-3 h-3" /> Pago Pendiente (Efectivo)
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mt-1">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div className="text-sm font-medium text-gray-800 flex items-start gap-2">
                          <span className="bg-white/80 px-1.5 py-0.5 rounded text-xs font-bold border border-black/5">{item.quantity}x</span>
                          <span className="leading-tight mt-0.5">{item.name}</span>
                        </div>
                        {item.modifiers && (
                          <span className="text-xs text-red-600 font-semibold ml-8 mt-0.5">
                            {item.modifiers}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="text-xs p-2 bg-yellow-100/50 text-yellow-800 rounded-lg border border-yellow-200 mt-1">
                      <span className="font-bold">Notas:</span> {order.notes}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2 pt-3 border-t border-black/5">
                    <button 
                      onClick={() => moveOrder(order.id, column, -1)}
                      disabled={column === COLUMNS[0]}
                      className="flex-1 py-1.5 text-xs font-semibold bg-white rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <button 
                      onClick={() => moveOrder(order.id, column, 1)}
                      disabled={column === COLUMNS[COLUMNS.length - 1]}
                      className="flex-1 py-1.5 text-xs font-semibold bg-white rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-red-600 border border-transparent hover:border-red-100"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ))}
              
              {columnOrders.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm font-medium">
                  Sin pedidos
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
