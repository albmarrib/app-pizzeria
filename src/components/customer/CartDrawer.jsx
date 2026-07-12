import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Trash2, ArrowRight, CreditCard, Apple, Store, MapPin, Phone, User, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Utilidad para generar códigos cortos únicos
const generateOrderCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Evitar O/0, I/1
  let result = 'PZ-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const CartDrawer = ({ isOpen, onClose, cart, onUpdateQuantity }) => {
  const [step, setStep] = useState(1); // 1: Carrito, 2: Datos
  const [orderType, setOrderType] = useState('delivery'); // 'delivery' o 'pickup'
  
  // Datos del formulario
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    postalCode: '',
    notes: ''
  });

  const [deliveryFee, setDeliveryFee] = useState(2.50);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderCode, setOrderCode] = useState('');

  // Sincronizar fee desde settings globales o locales si es necesario
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists() && docSnap.data().deliveryFee !== undefined) {
          setDeliveryFee(Number(docSnap.data().deliveryFee));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    if (isOpen) fetchSettings();
  }, [isOpen]);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = orderType === 'delivery' ? subtotal + deliveryFee : subtotal;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCheckout = async (paymentMethodMock = 'cash') => {
    if (cart.length === 0) return;
    
    // Validaciones
    if (orderType === 'pickup' && !customerInfo.name.trim()) {
      return alert("El nombre es obligatorio para recoger en tienda.");
    }
    if (orderType === 'delivery') {
      if (!customerInfo.name.trim() || !customerInfo.address.trim() || !customerInfo.phone.trim() || !customerInfo.postalCode.trim()) {
        return alert("Por favor, rellena nombre, teléfono, dirección y código postal.");
      }
      
      // Validación real de SaaS
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      const settings = docSnap.exists() ? docSnap.data() : {};
      
      if (settings.deliveryType === 'postal_codes') {
        const validCodes = (settings.postalCodes || '').split(',').map(c => c.trim());
        if (!validCodes.includes(customerInfo.postalCode.trim())) {
          return alert(`Lo sentimos, no repartimos en el código postal ${customerInfo.postalCode}.`);
        }
      } else if (settings.deliveryType === 'km') {
        // En un caso real aquí llamaríamos a Google Maps API para ver la distancia.
        // Por MVP lo damos por válido asumiendo que el cliente sabe.
      }
    }

    setIsCheckingOut(true);
    try {
      const isPaid = paymentMethodMock === 'apple_pay' || paymentMethodMock === 'google_pay';
      const code = orderType === 'pickup' ? generateOrderCode() : '';
      
      const orderData = {
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.modifiers || ''
        })),
        subtotal,
        total,
        deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
        customerInfo,
        orderType,
        orderCode: code,
        paymentStatus: isPaid ? 'Pagado' : 'Pendiente',
        paymentMethod: paymentMethodMock,
        status: 'Nuevos Pedidos', 
        source: 'Customer Web',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'orders'), orderData);
      
      if (code) setOrderCode(code);
      setOrderSuccess(true);
      
      // Si es a domicilio, cerramos en 4s. Si es recoger, dejamos la tarjeta a la vista
      if (orderType === 'delivery') {
        setTimeout(() => {
          handleClose();
        }, 4000);
      }
      
    } catch (error) {
      console.error("Error creating order: ", error);
      alert("Hubo un error al procesar tu pedido.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleClose = () => {
    setOrderSuccess(false);
    setStep(1);
    setOrderCode('');
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 transition-opacity backdrop-blur-sm" onClick={handleClose} />
      )}
      
      <div className={`fixed top-0 right-0 w-full max-w-md h-full bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step === 2 && !orderSuccess && (
              <button onClick={() => setStep(1)} className="p-1.5 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {orderSuccess ? 'Pedido Confirmado' : step === 1 ? 'Tu Pedido' : 'Datos y Pago'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
            <ShoppingCartIcon className="w-16 h-16 mb-4 text-gray-200" />
            <p className="text-lg">Tu carrito está vacío</p>
          </div>
        ) : orderSuccess ? (
          // PANTALLA DE ÉXITO
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {orderType === 'pickup' ? (
              <div className="bg-white rounded-3xl p-8 shadow-xl text-center border-t-8 border-black">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-gray-900 mb-2">¡Pagado y Confirmado!</h3>
                <p className="text-gray-500 mb-8">Acércate al mostrador cuando te avisemos y muestra este código:</p>
                <div className="bg-gray-100 py-6 px-4 rounded-2xl mb-8">
                  <span className="text-4xl md:text-5xl font-black tracking-widest text-black">{orderCode}</span>
                </div>
                <button onClick={handleClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-colors">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">🛵</span>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">¡Marchando!</h3>
                <p className="text-gray-600">Tu pedido a domicilio está en la cocina. El repartidor saldrá en breve.</p>
              </div>
            )}
          </div>
        ) : step === 1 ? (
          // PASO 1: RESUMEN DE CARRITO Y SELECCIÓN DE TIPO
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Order Type Selection */}
              <div className="bg-gray-50 p-1.5 rounded-xl flex gap-1 mb-6">
                <button 
                  onClick={() => setOrderType('delivery')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${orderType === 'delivery' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  A Domicilio
                </button>
                <button 
                  onClick={() => setOrderType('pickup')}
                  className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${orderType === 'pickup' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  <Store className="w-4 h-4" />
                  Recoger local
                </button>
              </div>

              {cart.map((item) => (
                <div key={item.cartItemId} className="flex gap-4 border-b border-gray-50 pb-4">
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-gray-900 leading-tight">{item.name}</h4>
                        <div className="text-gray-900 font-bold whitespace-nowrap">{(item.price * item.quantity).toFixed(2)}€</div>
                      </div>
                      {item.modifiers && (
                        <p className="text-xs text-red-600 font-medium mt-1 leading-snug">{item.modifiers}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center bg-gray-50 rounded-lg border border-gray-100">
                        <button onClick={() => onUpdateQuantity(item.cartItemId, -1)} className="p-1.5 text-gray-600 hover:text-red-600">
                          {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </button>
                        <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.cartItemId, 1)} className="p-1.5 text-gray-600 hover:text-green-600">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white">
              <div className="flex justify-between items-center mb-6">
                <span className="text-gray-500 font-bold">Subtotal</span>
                <span className="text-2xl font-black text-gray-900">{subtotal.toFixed(2)}€</span>
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-between px-6 transition-colors shadow-lg shadow-red-600/30"
              >
                <span>Continuar</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          // PASO 2: DATOS Y PAGO
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
              
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-black text-lg border-b border-gray-100 pb-2 mb-4">
                  {orderType === 'pickup' ? 'Datos para Recogida' : 'Datos de Entrega'}
                </h3>
                
                {/* Campos comunes */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input type="text" name="name" value={customerInfo.name} onChange={handleInputChange} placeholder="Nombre completo" className="pl-10 w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 focus:bg-white" />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input type="tel" name="phone" value={customerInfo.phone} onChange={handleInputChange} placeholder="Teléfono de contacto" className="pl-10 w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 focus:bg-white" />
                </div>

                {/* Campos específicos Delivery */}
                {orderType === 'delivery' && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <input type="text" name="address" value={customerInfo.address} onChange={handleInputChange} placeholder="Dirección completa (Calle, Número, Piso...)" className="pl-10 w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 focus:bg-white" />
                    </div>
                    
                    <div className="relative">
                      <input type="text" name="postalCode" value={customerInfo.postalCode} onChange={handleInputChange} placeholder="Código Postal" className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 focus:bg-white" />
                    </div>
                  </>
                )}

                {/* Notas generales */}
                <div className="pt-2">
                  <textarea name="notes" value={customerInfo.notes} onChange={handleInputChange} placeholder={orderType === 'delivery' ? "Notas (timbre, puerta...)" : "Notas para cocina (opcional)"} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none bg-gray-50 focus:bg-white" rows="2" />
                </div>
              </div>

            </div>

            {/* Faldón de Pago */}
            <div className="p-6 border-t border-gray-100 bg-white">
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)}€</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Envío</span>
                    <span>{deliveryFee.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-gray-900 font-bold">Total a pagar</span>
                  <span className="text-2xl font-black text-gray-900">{total.toFixed(2)}€</span>
                </div>
              </div>
              
              {orderType === 'pickup' ? (
                <div className="space-y-3">
                  <div className="text-xs text-center text-gray-500 font-semibold mb-2">PAGO OBLIGATORIO PARA RECOGER</div>
                  <button onClick={() => handleCheckout('apple_pay')} disabled={isCheckingOut} className="w-full bg-black hover:bg-gray-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                    <Apple className="w-5 h-5" /> <span>Pagar con Apple Pay</span>
                  </button>
                  <button onClick={() => handleCheckout('google_pay')} disabled={isCheckingOut} className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-4 h-4" />
                    <span>Pagar con Google Pay</span>
                  </button>
                </div>
              ) : (
                <button onClick={() => handleCheckout('cash')} disabled={isCheckingOut} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-600/30 disabled:opacity-70">
                  <CreditCard className="w-5 h-5" />
                  <span>Pedir y Pagar al Repartidor</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

const ShoppingCartIcon = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

export default CartDrawer;
