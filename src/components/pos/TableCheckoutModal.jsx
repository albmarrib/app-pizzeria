import React, { useState } from 'react';
import { 
  X, Plus, CreditCard, SplitSquareHorizontal, Users, List, Minus, 
  CheckCircle2, Printer, Trash2, Tag, RotateCcw, AlertTriangle, Gift, ArrowLeft
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { printOrderSummary } from '../../utils/printer';

const TableCheckoutModal = ({ table, order, globalSettings, onClose, onOpenManualOrder }) => {
  const [view, setView] = useState('menu'); // 'menu' | 'split' | 'payment' | 'discount'
  const [isProcessing, setIsProcessing] = useState(false);

  // Split state
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'items'
  const [splitParts, setSplitParts] = useState(2);
  const [selectedItems, setSelectedItems] = useState({}); // { [item.cartItemId || item.id]: quantity }

  // Free table / delete order confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Invitación / Regalo a clientes');

  // Discount state
  const [customTotalInput, setCustomTotalInput] = useState('');
  const [customDiscountInput, setCustomDiscountInput] = useState('');
  const [discountReasonInput, setDiscountReasonInput] = useState('');
  const [discountError, setDiscountError] = useState('');

  // Calculations
  const orderItems = order?.items || [];
  const itemsSubtotal = orderItems.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 0);
  
  const total = Number(order?.total ?? itemsSubtotal);
  const originalTotal = Number(order?.originalTotal ?? (order?.discount ? total + Number(order.discount) : (itemsSubtotal > 0 ? itemsSubtotal : total)));
  const discount = Number(order?.discount ?? (originalTotal > total + 0.009 ? originalTotal - total : 0));
  const hasDiscount = discount > 0.009;

  const paidAmount = Number(order?.paidAmount || 0);
  const remainingAmount = Math.max(0, total - paidAmount);
  
  const payments = order?.payments || [];

  // ===================== PAGO COMPLETO / PARCIAL =====================
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

      const shouldComplete = isFullyPaid && (order.orderType === 'dine_in' || order.status === 'READY_FOR_ASSEMBLY');

      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        payments: updatedPayments,
        paidAmount: newPaidAmount,
        ...(splitMode === 'items' ? { items: updatedItems } : {}),
        ...(isFullyPaid ? {
          ...(shouldComplete ? { status: 'COMPLETED' } : {}),
          paymentStatus: 'Pagado',
          paymentMethod: updatedPayments.length > 1 ? 'split' : method
        } : {
          paymentStatus: 'Parcial'
        }),
        updatedAt: serverTimestamp()
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

  // ===================== LIBERAR MESA SIN COBRAR (ELIMINAR CUENTA) =====================
  const handleFreeTableWithoutPayment = async () => {
    if (!order?.id) return;
    setIsProcessing(true);
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'CANCELED',
        paymentStatus: 'Invitación / Anulado',
        cancellationReason: deleteReason.trim() || 'Mesa liberada sin cobrar (Invitación/Regalo)',
        isGift: true,
        freedWithoutPayment: true,
        canceledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error("Error al liberar la mesa:", err);
      alert("Error al liberar la mesa sin cobrar.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ===================== MODIFICAR PRECIO / DESCUENTO =====================
  const openDiscountView = () => {
    setCustomTotalInput(total.toFixed(2));
    setCustomDiscountInput(discount > 0 ? discount.toFixed(2) : '');
    setDiscountReasonInput(order?.discountReason || '');
    setDiscountError('');
    setView('discount');
  };

  const handleCustomTotalChange = (val) => {
    setCustomTotalInput(val);
    setDiscountError('');
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      const calcDiscount = Math.max(0, originalTotal - num);
      setCustomDiscountInput(calcDiscount.toFixed(2));
    } else {
      setCustomDiscountInput('');
    }
  };

  const handleCustomDiscountChange = (val) => {
    setCustomDiscountInput(val);
    setDiscountError('');
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      const calcTotal = Math.max(0, originalTotal - num);
      setCustomTotalInput(calcTotal.toFixed(2));
    } else {
      setCustomTotalInput('');
    }
  };

  const handleApplyPercentage = (pct) => {
    setDiscountError('');
    const calcDiscount = Number((originalTotal * (pct / 100)).toFixed(2));
    const calcTotal = Math.max(0, Number((originalTotal - calcDiscount).toFixed(2)));
    setCustomDiscountInput(calcDiscount.toString());
    setCustomTotalInput(calcTotal.toString());
  };

  const handleApplyDiscount = async () => {
    const finalTotal = parseFloat(customTotalInput);
    const finalDiscount = parseFloat(customDiscountInput) || 0;

    if (isNaN(finalTotal) || finalTotal < 0) {
      setDiscountError('Introduce un importe total válido mayor o igual a 0€');
      return;
    }

    if (paidAmount > 0 && finalTotal < paidAmount - 0.01) {
      setDiscountError(`El nuevo total no puede ser inferior a lo que ya se ha cobrado (${paidAmount.toFixed(2)}€)`);
      return;
    }

    setIsProcessing(true);
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        total: Number(finalTotal.toFixed(2)),
        originalTotal: Number(originalTotal.toFixed(2)),
        discount: Number(finalDiscount.toFixed(2)),
        discountReason: discountReasonInput.trim(),
        updatedAt: serverTimestamp()
      });
      setView('menu');
    } catch (err) {
      console.error(err);
      setDiscountError('Error al guardar el nuevo precio');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveDiscount = async () => {
    setIsProcessing(true);
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        total: Number(originalTotal.toFixed(2)),
        discount: 0,
        discountReason: '',
        updatedAt: serverTimestamp()
      });
      setView('menu');
    } catch (err) {
      console.error(err);
      alert('Error al restablecer el precio original');
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

  const handlePrintSummary = () => {
    printOrderSummary({
      ...order,
      total,
      originalTotal,
      discount,
      discountReason: order?.discountReason || discountReasonInput
    }, globalSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up max-h-[95vh]">
        
        {/* Cabecera */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Mesa {table?.label}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${order?.status === 'SERVED' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                {order?.status === 'SERVED' ? 'SERVIDA' : 'EN COCINA'}
              </span>
              <p className="text-gray-900 font-black text-sm">
                Total: {total.toFixed(2)}€
              </p>
              {hasDiscount && (
                <>
                  <span className="text-xs text-gray-400 line-through">
                    {originalTotal.toFixed(2)}€
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                    <Tag className="w-3 h-3" /> -{discount.toFixed(2)}€ DTO
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* ======================= VISTA PRINCIPAL (MENU) ======================= */}
          {view === 'menu' && !showDeleteConfirm && (
            <>
              {/* Ticket Resumen */}
              <div className="bg-yellow-50/60 border border-yellow-200 rounded-2xl p-4 mb-2 max-h-52 overflow-y-auto">
                <div className="flex justify-between items-center border-b border-yellow-200 pb-2 mb-2">
                  <h4 className="font-bold text-gray-800 text-sm">Resumen del Pedido</h4>
                  {hasDiscount && (
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Descuento activo
                    </span>
                  )}
                </div>
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

                {hasDiscount && (
                  <div className="mt-3 pt-3 border-t border-yellow-200/80 text-xs space-y-1">
                    <div className="flex justify-between text-gray-500">
                      <span>Total inicial de productos:</span>
                      <span className="line-through">{originalTotal.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Descuento aplicado{order?.discountReason ? ` (${order.discountReason})` : ''}:</span>
                      <span>-{discount.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-gray-900 pt-1">
                      <span>Total final a cobrar:</span>
                      <span>{total.toFixed(2)}€</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen de pagos si ya hay alguno parcial */}
              {paidAmount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-2">
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

              {/* Botón 1: Añadir más productos */}
              <button 
                onClick={onOpenManualOrder}
                className="w-full bg-blue-50 border-2 border-blue-200 hover:border-blue-500 text-blue-700 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex flex-col text-left">
                  <span className="text-base font-bold">Añadir más productos</span>
                  <span className="text-xs font-medium opacity-80">Enviar otra ronda a cocina</span>
                </div>
                <div className="bg-white p-2.5 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <Plus className="w-5 h-5" />
                </div>
              </button>

              {/* Botón 2: Imprimir Pre-cuenta */}
              <button 
                onClick={handlePrintSummary}
                className="w-full bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-500 text-indigo-700 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex flex-col text-left">
                  <span className="text-base font-bold">Imprimir Pre-cuenta</span>
                  <span className="text-xs font-medium opacity-80">
                    Ticket con desglose {hasDiscount ? '(refleja descuento)' : ''}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <Printer className="w-5 h-5" />
                </div>
              </button>

              {/* Botón 3: Modificar Precio / Descuento */}
              <button 
                onClick={openDiscountView}
                className={`w-full border-2 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-between group transition-all ${
                  hasDiscount 
                    ? 'bg-amber-100/60 border-amber-400 text-amber-900 shadow-sm' 
                    : 'bg-amber-50 border-amber-200 hover:border-amber-500 text-amber-800'
                }`}
              >
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">Modificar Precio / Descuento</span>
                    {hasDiscount && (
                      <span className="bg-amber-300/80 text-amber-900 text-[11px] px-2 py-0.5 rounded-full font-black">
                        -{discount.toFixed(2)}€ DTO
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium opacity-80">
                    {hasDiscount 
                      ? `Total ajustado a ${total.toFixed(2)}€ (Original: ${originalTotal.toFixed(2)}€)` 
                      : 'Cambiar importe total o hacer descuento al cliente'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <Tag className="w-5 h-5 text-amber-600" />
                </div>
              </button>

              {/* Botón 4: Cobrar Mesa */}
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

              {/* Botón 5: Dividir Cuenta */}
              <button 
                onClick={() => setView('split')}
                className="w-full bg-gray-50 border-2 border-gray-200 hover:border-gray-900 text-gray-800 font-bold py-3.5 px-6 rounded-2xl flex items-center justify-between group transition-all"
              >
                <div className="flex flex-col text-left">
                  <span className="text-base font-bold">Dividir Cuenta</span>
                  <span className="text-xs font-medium opacity-70">A partes iguales o por productos</span>
                </div>
                <div className="bg-white border border-gray-200 p-2.5 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <SplitSquareHorizontal className="w-5 h-5" />
                </div>
              </button>

              {/* Separador y Botón 6: Eliminar Cuenta / Liberar Mesa sin cobrar */}
              <div className="pt-2 border-t border-gray-100">
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-50/80 border-2 border-red-200 hover:border-red-500 text-red-700 font-bold py-3 px-5 rounded-2xl flex items-center justify-between group transition-all"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-black flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-red-500" /> Eliminar Cuenta (Liberar Mesa)
                    </span>
                    <span className="text-[11px] font-medium opacity-80">
                      Liberar mesa sin cobrar (Invitación o regalo)
                    </span>
                  </div>
                  <div className="bg-white border border-red-200 p-2 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ======================= CONFIRMACIÓN LIBERAR MESA ======================= */}
          {view === 'menu' && showDeleteConfirm && (
            <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 space-y-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0 mt-1">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-900">¿Liberar Mesa {table?.label} sin cobrar?</h3>
                  <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                    Esta acción eliminará la cuenta activa (por ejemplo por invitación o regalo a clientes) y dejará la mesa libre de inmediato.
                  </p>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-red-200 text-xs space-y-1.5 shadow-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Importe total del pedido:</span>
                  <span className="font-bold text-gray-900">{total.toFixed(2)}€</span>
                </div>
                {paidAmount > 0 && (
                  <div className="flex justify-between text-amber-700 font-bold">
                    <span>Cobrado previamente:</span>
                    <span>{paidAmount.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-red-600 pt-1 border-t border-gray-100">
                  <span>Importe a condonar / regalo:</span>
                  <span>{remainingAmount.toFixed(2)}€</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Motivo de la liberación (opcional):
                </label>
                <input 
                  type="text"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="Ej: Invitación de la casa, cortesía, etc."
                  className="w-full text-sm bg-white border border-red-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button 
                  disabled={isProcessing}
                  onClick={handleFreeTableWithoutPayment}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Sí, Liberar Mesa
                </button>
                <button 
                  disabled={isProcessing}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3.5 px-4 rounded-xl transition-all text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ======================= VISTA MODIFICAR PRECIO / DESCUENTO ======================= */}
          {view === 'discount' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <button 
                  onClick={() => setView('menu')}
                  className="flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-black transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver
                </button>
                <h3 className="font-black text-gray-900 text-base">Modificar Precio / Descuento</h3>
                <div className="w-12"></div>
              </div>

              {/* Tarjeta de info del precio original */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                    Precio teórico original
                  </span>
                  <span className="text-xs text-amber-600">Suma total de los productos servidos</span>
                </div>
                <span className="text-2xl font-black text-gray-900">
                  {originalTotal.toFixed(2)}€
                </span>
              </div>

              {/* Botones de porcentaje rápido */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Descuento rápido:
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {[5, 10, 15, 20, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyPercentage(pct)}
                      className="bg-gray-100 hover:bg-amber-100 hover:text-amber-900 text-gray-800 text-xs font-black py-2 rounded-xl border border-gray-200 transition-colors"
                    >
                      {pct === 100 ? 'Gratis' : `-${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs vinculados */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nuevo Total (€):
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={customTotalInput}
                    onChange={e => handleCustomTotalChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border border-gray-300 font-black text-lg text-gray-900 rounded-xl p-2 outline-none focus:ring-2 focus:ring-black"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Importe final a cobrar</span>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Descuento (€):
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={customDiscountInput}
                    onChange={e => handleCustomDiscountChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white border border-gray-300 font-black text-lg text-emerald-600 rounded-xl p-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Rebaja sobre el total</span>
                </div>
              </div>

              {/* Motivo del descuento */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Motivo del descuento (aparecerá en el ticket):
                </label>
                <input 
                  type="text"
                  value={discountReasonInput}
                  onChange={e => setDiscountReasonInput(e.target.value)}
                  placeholder="Ej: Invitación de la casa, descuento amigos, etc."
                  className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Vista previa en tiempo real */}
              <div className="bg-gray-900 text-white rounded-2xl p-4 space-y-1.5 text-xs shadow-md">
                <div className="flex justify-between text-gray-400">
                  <span>Precio teórico:</span>
                  <span>{originalTotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Descuento reflejado:</span>
                  <span>-{parseFloat(customDiscountInput || 0).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-1.5 border-t border-gray-800">
                  <span>COBRADO FINALMENTE:</span>
                  <span className="text-xl text-yellow-400">
                    {(parseFloat(customTotalInput) || 0).toFixed(2)}€
                  </span>
                </div>
              </div>

              {discountError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {discountError}
                </p>
              )}

              {/* Botones de acción */}
              <div className="space-y-2 pt-1">
                <button 
                  disabled={isProcessing}
                  onClick={handleApplyDiscount}
                  className="w-full bg-black hover:bg-gray-800 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-lg shadow-black/10"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Guardar Precio y Aplicar Descuento
                </button>

                {hasDiscount && (
                  <button 
                    disabled={isProcessing}
                    onClick={handleRemoveDiscount}
                    className="w-full bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Quitar descuento y restaurar original ({originalTotal.toFixed(2)}€)
                  </button>
                )}

                <button 
                  onClick={() => setView('menu')}
                  className="w-full text-gray-500 font-bold py-2 text-xs hover:text-gray-900 transition-colors"
                >
                  Cancelar y volver
                </button>
              </div>
            </div>
          )}

          {/* ======================= VISTA METODOS DE PAGO ======================= */}
          {view === 'payment' && (
            <div className="space-y-4">
               <h3 className="text-center font-bold text-gray-700 mb-6">
                 Selecciona método de pago para {remainingAmount.toFixed(2)}€
               </h3>
               
               <button 
                 disabled={isProcessing} 
                 onClick={() => handleFullPayment('cash')} 
                 className="w-full bg-black text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50 hover:bg-gray-800 transition-colors"
               >
                 Cobrar en Efectivo
               </button>
               <button 
                 disabled={isProcessing} 
                 onClick={() => handleFullPayment('card')} 
                 className="w-full bg-white border-2 border-gray-200 text-gray-900 hover:bg-gray-50 font-bold py-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50 transition-colors"
               >
                 <CreditCard className="w-5 h-5" /> Cobrar con Tarjeta
               </button>
               
               <button onClick={() => setView('menu')} className="w-full mt-4 text-gray-500 font-bold py-2 underline text-sm">
                 Volver al menú de mesa
               </button>
            </div>
          )}

          {/* ======================= VISTA DIVIDIR CUENTA ======================= */}
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
                  {hasDiscount && splitMode === 'items' && (
                    <p className="text-xs font-semibold text-amber-700 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      * Nota: Hay un descuento global aplicado al total. Se recomienda dividir a partes iguales.
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
