import React, { useState } from 'react';
import { X, Plus, CreditCard, SplitSquareHorizontal, CheckCircle2 } from 'lucide-react';
import ManualOrderPanel from './ManualOrderPanel';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const TableCheckoutModal = ({ table, order, onClose, onOpenManualOrder }) => {
  const [view, setView] = useState('menu'); // 'menu' | 'split' | 'payment'

  const handleFullPayment = async (method) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'COMPLETED',
        paymentStatus: 'Pagado',
        paymentMethod: method
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error al cobrar la mesa.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Mesa {table?.label}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${order?.status === 'SERVED' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                {order?.status === 'SERVED' ? 'SERVIDA' : 'EN COCINA'}
              </span>
              <p className="text-gray-500 font-medium text-sm">Total: {order?.total?.toFixed(2)}€</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Ticket Viewer */}
          <div className="bg-yellow-50/50 border border-yellow-200 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto">
            <h4 className="font-bold text-gray-800 border-b border-yellow-200 pb-2 mb-2 text-sm">Resumen del Pedido</h4>
            <div className="space-y-2">
              {order?.items?.map((item, idx) => (
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

          {view === 'menu' && (
            <>
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
                  <span className="text-lg">Cobrar Mesa (Total)</span>
                  <span className="text-sm font-medium opacity-90">Pagar todo junto ({order?.total?.toFixed(2)}€)</span>
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
                  <span className="text-lg">Dividir Cuenta (Próximamente)</span>
                  <span className="text-sm font-medium opacity-70">Pagar a medias o por productos</span>
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <SplitSquareHorizontal className="w-6 h-6" />
                </div>
              </button>
            </>
          )}

          {view === 'payment' && (
            <div className="space-y-4">
               <h3 className="text-center font-bold text-gray-700 mb-6">Selecciona método de pago para {order?.total?.toFixed(2)}€</h3>
               
               <button onClick={() => handleFullPayment('cash')} className="w-full bg-black text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2">
                 Cobrar en Efectivo
               </button>
               <button onClick={() => handleFullPayment('card')} className="w-full bg-white border-2 border-gray-200 text-gray-900 hover:bg-gray-50 font-bold py-4 rounded-xl flex justify-center items-center gap-2">
                 <CreditCard className="w-5 h-5" /> Cobrar con Tarjeta
               </button>
               
               <button onClick={() => setView('menu')} className="w-full mt-4 text-gray-500 font-bold py-2 underline text-sm">
                 Volver
               </button>
            </div>
          )}

          {view === 'split' && (
             <div className="text-center py-10 text-gray-500">
               <SplitSquareHorizontal className="w-16 h-16 mx-auto mb-4 opacity-50" />
               <p className="font-bold">Módulo de Split Bill en desarrollo</p>
               <button onClick={() => setView('menu')} className="mt-6 text-gray-500 font-bold py-2 underline text-sm">
                 Volver
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableCheckoutModal;
