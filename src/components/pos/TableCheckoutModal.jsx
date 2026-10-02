import React, { useState } from 'react';
import { X, Plus, CreditCard, SplitSquareHorizontal, Users, List, Minus, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const TableCheckoutModal = ({ table, order, onClose, onOpenManualOrder }) => {
  const [view, setView] = useState('menu'); // 'menu' | 'split' | 'payment'
  const [isProcessing, setIsProcessing] = useState(false);

  // Split state
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'items'
  const [splitParts, setSplitParts] = useState(2);
  const [selectedItems, setSelectedItems] = useState({}); // { [item.cartItemId || item.id]: quantity }

  // Calculations
  const total = order?.total || 0;
  const paidAmount = order?.paidAmount || 0;
  const remainingAmount = Math.max(0, total - paidAmount);
  
  const payments = order?.payments || [];
  const orderItems = order?.items || [];

  const handleFullPayment = async (method) => {
    await processPayment(remainingAmount, method);
  };

  const processPayment = async (amount, method) => {
    if (amount <= 0 || amount > remainingAmount + 0.01) {
       alert("Cantidad inválida");
       return;
    }
    
    setIsProcessing(true);
    try {
      const newPayment = { amount, method, createdAt: Date.now() };
      const updatedPayments = [...payments, newPayment];
      const newPaidAmount = paidAmount + amount;
      
      const isFullyPaid = newPaidAmount >= total - 0.01;

      // Update items if in 'items' mode
      let updatedItems = orderItems;
      if (splitMode === 'items' && Object.keys(selectedItems).length > 0) {
        updatedItems = orderItems.map((item, idx) => {
          const itemKey = String(item.cartItemId || item.id || idx);
          const selectedQty = selectedItems[itemKey] || 0;
          if (selectedQty > 0) {
            return { ...item, paidQty: (item.paidQty || 0) + selectedQty };
          }
          return item;
        });
      }

      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        payments: updatedPayments,
        paidAmount: newPaidAmount,
        ...(splitMode === 'items' ? { items: updatedItems } : {}),
        ...(isFullyPaid ? {
          status: 'COMPLETED',
          paymentStatus: 'Pagado',
          paymentMethod: updatedPayments.length > 1 ? 'split' : method
        } : {
          paymentStatus: 'Parcial'
        })
      });

      if (isFullyPaid) {
        onClose();
      } else {
        // Reset states for partial payment success
        if (splitMode === 'equal') {
           setSplitParts(Math.max(1, splitParts - 1));
        } else {
           setSelectedItems({});
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pago.");
    } finally {
      setIsProcessing(false);
    }
  };

  // equal mode part calculation
  const partAmount = splitParts > 0 ? remainingAmount / splitParts : 0;

  // items mode calculation
  const itemsAmountToPay = orderItems.reduce((sum, item, idx) => {
    const itemKey = String(item.cartItemId || item.id || idx);
    const qty = selectedItems[itemKey] || 0;
    return sum + (qty * item.price);
  }, 0);

  const toggleItemSelection = (itemKey, delta, maxQty) => {
    setSelectedItems(prev => {
      const current = prev[itemKey] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      if (next === 0) {
        const { [itemKey]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemKey]: next };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up max-h-[95vh]">
        
        {/* Cabecera */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Mesa {table?.label}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${order?.status === 'SERVED' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                {order?.status === 'SERVED' ? 'SERVIDA' : 'EN COCINA'}
              </span>
              <p className="text-gray-500 font-medium text-sm">Total: {total.toFixed(2)}€</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Ticket Viewer */}
          {view === 'menu' && (
             <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto">
                <h4 className="font-bold text-gray-800 border-b border-yellow-200 pb-2 mb-2 text-sm">Resumen del Pedido</h4>
                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex gap-2 text-gray-800">
                        <span className="font-bold text-gray-600">{item.quantity}x</span>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.modifiers && <p className="text-xs text-red-500">{item.modifiers}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-bold text-gray-900">{(item.price * item.quantity).toFixed(2)}€</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          item.status === 'SERVED' ? 'bg-indigo-100 text-indigo-700' :
                          item.status === 'READY' || item.status === 'Listo' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {item.status === 'SERVED' ? 'EN MESA' : (item.status === 'READY' || item.status === 'Listo' ? 'EN PASE' : 'COCINANDO')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {view === 'menu' && (
            <>
               {/* Resumen de pagos si ya hay alguno parcial */}
               {paidAmount > 0 && (
                 <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center text-sm font-bold text-green-800">
                      <span>Total Pagado:</span>
                      <span>{paidAmount.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-black text-red-600 mt-1">
                      <span>Pendiente:</span>
                      <span>{remainingAmount.toFixed(2)}€</span>
                    </div>
                 </div>
               )}

              <button 
                onClick={onOpenManualOrder}
                className="w-full bg-blue-50 border-2 border-blue-200 hover:border-blue-500 text-blue-700 font-bold py-4 px-6 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex flex-col text-left">
                  <span className="text-lg">Añadir más productos</span>
                  <span className="text-sm font-medium opacity-80">Enviar otra ronda a cocina</span>
                </div>
                <div className="bg-white p-3 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <Plus className="w-6 h-6" />
                </div>
              </button>

              <button 
                onClick={() => setView('payment')}
                className="w-full bg-green-500 border-2 border-green-600 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-between group transition-all shadow-lg shadow-green-500/20"
              >
                <div className="flex flex-col text-left">
                  <span className="text-lg">{paidAmount > 0 ? 'Cobrar Resto' : 'Cobrar Mesa (Total)'}</span>
                  <span className="text-sm font-medium opacity-90">Pagar {remainingAmount.toFixed(2)}€</span>
                </div>
                <div className="bg-white/20 p-3 rounded-full group-hover:scale-110 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
              </button>

              <button 
                onClick={() => setView('split')}
                className="w-full bg-gray-50 border-2 border-gray-200 hover:border-gray-900 text-gray-800 font-bold py-4 px-6 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex flex-col text-left">
                  <span className="text-lg">Dividir Cuenta</span>
                  <span className="text-sm font-medium opacity-70">A partes iguales o por productos</span>
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <SplitSquareHorizontal className="w-6 h-6" />
                </div>
              </button>
            </>
          )}

          {view === 'payment' && (
            <div className="space-y-4">
               <h3 className="text-center font-bold text-gray-700 mb-6">Selecciona método de pago para {remainingAmount.toFixed(2)}€</h3>
               
               <button disabled={isProcessing} onClick={() => handleFullPayment('cash')} className="w-full bg-black text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50">
                 Cobrar en Efectivo
               </button>
               <button disabled={isProcessing} onClick={() => handleFullPayment('card')} className="w-full bg-white border-2 border-gray-200 text-gray-900 hover:bg-gray-50 font-bold py-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50">
                 <CreditCard className="w-5 h-5" /> Cobrar con Tarjeta
               </button>
               
               <button onClick={() => setView('menu')} className="w-full mt-4 text-gray-500 font-bold py-2 underline text-sm">
                 Volver
               </button>
            </div>
          )}

          {view === 'split' && (
             <div className="space-y-6">
               <div className="flex bg-gray-100 p-1 rounded-xl">
                 <button 
                   onClick={() => setSplitMode('equal')}
                   className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${splitMode === 'equal' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                 >
                   <Users className="w-4 h-4" /> Partes Iguales
                 </button>
                 <button 
                   onClick={() => setSplitMode('items')}
                   className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${splitMode === 'items' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                 >
                   <List className="w-4 h-4" /> Por Productos
                 </button>
               </div>

               <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-200">
                 <p className="text-sm font-bold text-gray-500 mb-1">Pendiente de Cobro</p>
                 <div className="flex items-center justify-center gap-2">
                   <p className="text-4xl font-black text-gray-900">{(remainingAmount - (splitMode === 'items' ? itemsAmountToPay : 0)).toFixed(2)}€</p>
                 </div>
                 {splitMode === 'items' && itemsAmountToPay > 0 && (
                   <p className="text-sm font-bold text-red-500 mt-2">
                     (-{itemsAmountToPay.toFixed(2)}€ seleccionados ahora)
                   </p>
                 )}
               </div>

               {splitMode === 'equal' && (
                 <div className="space-y-6">
                   <div className="flex items-center justify-center gap-6">
                     <button 
                       onClick={() => setSplitParts(Math.max(1, splitParts - 1))}
                       className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-700"
                     >
                       <Minus className="w-6 h-6" />
                     </button>
                     <div className="text-center">
                       <span className="text-3xl font-black">{splitParts}</span>
                       <span className="block text-sm text-gray-500 font-bold uppercase mt-1">Partes</span>
                     </div>
                     <button 
                       onClick={() => setSplitParts(splitParts + 1)}
                       className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-700"
                     >
                       <Plus className="w-6 h-6" />
                     </button>
                   </div>
                   
                   <div className="pt-4 border-t border-gray-100">
                     <p className="text-center text-sm font-bold text-gray-600 mb-4">A cobrar ahora: <span className="text-2xl text-gray-900 ml-1">{partAmount.toFixed(2)}€</span></p>
                     <div className="flex gap-3">
                       <button disabled={isProcessing} onClick={() => processPayment(partAmount, 'cash')} className="flex-1 bg-black text-white font-bold py-4 rounded-xl disabled:opacity-50 text-sm">
                         Efectivo
                       </button>
                       <button disabled={isProcessing} onClick={() => processPayment(partAmount, 'card')} className="flex-1 bg-white border-2 border-gray-200 text-gray-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                         <CreditCard className="w-4 h-4" /> Tarjeta
                       </button>
                     </div>
                   </div>
                 </div>
               )}

               {splitMode === 'items' && (
                 <div className="space-y-4">
                   <h4 className="font-bold text-gray-700 text-sm border-b border-gray-200 pb-2">Selecciona los productos a cobrar:</h4>
                   <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                     {orderItems.map((item, idx) => {
                       const itemKey = String(item.cartItemId || item.id || idx);
                       const paidQty = item.paidQty || 0;
                       const unpaidQty = item.quantity - paidQty;
                       const selectedQty = selectedItems[itemKey] || 0;
                       
                       const isFullyPaid = unpaidQty <= 0;

                       return (
                         <div key={itemKey} className={`flex justify-between items-center p-3 rounded-xl border transition-all ${isFullyPaid ? 'bg-gray-100 border-gray-200 opacity-60' : (selectedQty > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200')}`}>
                           <div>
                             <p className={`font-bold flex items-center gap-1 ${selectedQty > 0 ? 'text-red-900' : 'text-gray-800'}`}>
                               {isFullyPaid && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                               {item.name}
                               {isFullyPaid && <span className="ml-1 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-black uppercase">Pagado</span>}
                             </p>
                             <p className="text-xs text-gray-500 font-medium">
                               {item.price.toFixed(2)}€ / ud {item.quantity > 1 ? `(Pagados: ${paidQty}/${item.quantity})` : ''}
                             </p>
                           </div>
                           
                           {!isFullyPaid ? (
                             <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1">
                               <button 
                                 onClick={() => toggleItemSelection(itemKey, -1, unpaidQty)}
                                 className={`p-1.5 rounded-md transition-colors ${selectedQty > 0 ? 'text-red-600 hover:bg-red-50' : 'text-gray-300'}`}
                               >
                                 <Minus className="w-4 h-4" />
                               </button>
                               <span className="w-4 text-center font-black text-sm">{selectedQty}</span>
                               <button 
                                 onClick={() => toggleItemSelection(itemKey, 1, unpaidQty)}
                                 className={`p-1.5 rounded-md transition-colors ${selectedQty < unpaidQty ? 'text-red-600 hover:bg-red-50' : 'text-gray-300'}`}
                               >
                                 <Plus className="w-4 h-4" />
                               </button>
                             </div>
                           ) : (
                             <div className="text-green-600 font-bold text-sm">
                               Completado
                             </div>
                           )}
                         </div>
                       );
                     })}
                     {orderItems.every(i => (i.paidQty || 0) >= i.quantity) && (
                       <p className="text-center text-green-600 font-bold py-4">Todos los productos han sido pagados.</p>
                     )}
                   </div>
                   
                   <div className="pt-4 border-t border-gray-200">
                     <p className="text-center text-sm font-bold text-gray-600 mb-4">A cobrar ahora: <span className="text-2xl text-gray-900 ml-1">{itemsAmountToPay.toFixed(2)}€</span></p>
                     <div className="flex gap-3">
                       <button 
                         disabled={isProcessing || itemsAmountToPay <= 0 || itemsAmountToPay > remainingAmount} 
                         onClick={() => processPayment(itemsAmountToPay, 'cash')} 
                         className="flex-1 bg-black text-white font-bold py-4 rounded-xl disabled:opacity-50 text-sm"
                       >
                         Efectivo
                       </button>
                       <button 
                         disabled={isProcessing || itemsAmountToPay <= 0 || itemsAmountToPay > remainingAmount} 
                         onClick={() => processPayment(itemsAmountToPay, 'card')} 
                         className="flex-1 bg-white border-2 border-gray-200 text-gray-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                       >
                         <CreditCard className="w-4 h-4" /> Tarjeta
                       </button>
                     </div>
                   </div>
                 </div>
               )}

               {/* Historial de pagos si existen */}
               {payments.length > 0 && (
                 <div className="mt-6 pt-6 border-t border-gray-200">
                   <h4 className="text-xs font-black uppercase text-gray-400 mb-3">Pagos realizados ({payments.length})</h4>
                   <div className="space-y-2">
                     {payments.map((p, idx) => (
                       <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg text-sm border border-gray-100">
                         <span className="font-bold text-gray-600 flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4 text-green-500" />
                           {p.method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                         </span>
                         <span className="font-black text-gray-900">{p.amount.toFixed(2)}€</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               <button onClick={() => setView('menu')} className="w-full mt-4 text-gray-500 font-bold py-2 underline text-sm">
                 Volver al menú de mesa
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableCheckoutModal;
