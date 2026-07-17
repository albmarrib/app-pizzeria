import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, X, ArrowRight, Store, Trash2, CreditCard, Apple, Phone, User, MapPin, Gift } from 'lucide-react';
import StripeCheckout from './StripeCheckout';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
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

const CartDrawer = ({ isOpen, onClose, cart, onUpdateQuantity, onEmptyCart, orderType, setOrderType, isPosMode = false }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Carrito, 2: Datos
  
  // Datos del formulario
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    postalCode: '',
    notes: ''
  });

  const [globalSettings, setGlobalSettings] = useState({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  
  // Fidelidad
  const [loyaltyCustomer, setLoyaltyCustomer] = useState(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardItemText, setRewardItemText] = useState('');
  const [showOnlinePayment, setShowOnlinePayment] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardProducts, setRewardProducts] = useState([]);
  const [loadingRewardProducts, setLoadingRewardProducts] = useState(false);

  // Sincronizar fee desde settings globales o locales si es necesario
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGlobalSettings(data);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    if (isOpen) fetchSettings();
  }, [isOpen]);

  // Buscar cliente para fidelización por teléfono
  useEffect(() => {
    if (!globalSettings.loyaltyEnabled || customerInfo.phone.replace(/\D/g, '').length < 9) {
      setLoyaltyCustomer(null);
      return;
    }
    
    const checkLoyalty = async () => {
      try {
        const q = query(collection(db, 'customers'), where('phone', '==', customerInfo.phone));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const custDoc = snap.docs[0];
          setLoyaltyCustomer({ id: custDoc.id, ...custDoc.data() });
        } else {
          setLoyaltyCustomer(null);
        }
      } catch (err) {
        console.error("Error checking loyalty:", err);
      }
    };
    
    const timer = setTimeout(checkLoyalty, 500);
    return () => clearTimeout(timer);
  }, [customerInfo.phone, globalSettings.loyaltyEnabled]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = globalSettings?.deliveryFee || 2.50;
  
  let total = subtotal + (orderType === 'delivery' ? deliveryFee : 0);
  
  // Calcular recargo de Stripe
  const hasStripe = globalSettings?.stripeEnabled && globalSettings?.stripeAccountId;
  let stripeSurcharge = 0;
  if (showOnlinePayment && hasStripe) {
    if (globalSettings.stripeSurchargeType === 'fixed') {
      stripeSurcharge = Number(globalSettings.stripeSurchargeValue || 0);
    } else {
      stripeSurcharge = total * (Number(globalSettings.stripeSurchargeValue || 0) / 100);
    }
  }
  
  total += stripeSurcharge;

  const handleOpenReward = async () => {
    setShowRewardModal(true);
    if (globalSettings.loyaltyRewardCategory && rewardProducts.length === 0) {
      setLoadingRewardProducts(true);
      try {
        const q = query(collection(db, 'products'), where('category', '==', globalSettings.loyaltyRewardCategory));
        const snap = await getDocs(q);
        setRewardProducts(snap.docs.map(d => d.data().name));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRewardProducts(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateOrder = async () => {
    if (cart.length === 0) return false;
    
    if (orderType === 'delivery') {
      if (!customerInfo.address.trim() || !customerInfo.phone.trim() || !customerInfo.postalCode.trim() || (!isPosMode && (!customerInfo.name.trim() || !customerInfo.email.trim()))) {
        alert(isPosMode ? "Por favor, rellena teléfono, dirección y código postal." : "Por favor, rellena nombre, email, teléfono, dirección y código postal.");
        return false;
      }
      // Validación real de SaaS
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      const settings = docSnap.exists() ? docSnap.data() : {};
      
      if (settings.deliveryType === 'postal_codes') {
        const validCodes = (settings.postalCodes || '').split(',').map(c => c.trim());
        if (!validCodes.includes(customerInfo.postalCode.trim())) {
          alert(`Lo sentimos, no repartimos en el código postal ${customerInfo.postalCode}.`);
          return false;
        }
      }
    } else if (orderType === 'pickup' && !isPosMode) {
      if (!customerInfo.name.trim() || !customerInfo.email.trim() || !customerInfo.phone.trim()) {
        alert("El nombre, email y teléfono son obligatorios para recoger en tienda.");
        return false;
      }
    }
    return true; // Validated
  };

  const buildAndSaveOrder = async (paymentMethodMock, initialStatus, paymentStatusMock) => {
    const isPaid = isPosMode 
      ? (paymentMethodMock === 'cash' || paymentMethodMock === 'card')
      : (paymentMethodMock === 'apple_pay' || paymentMethodMock === 'google_pay');
    
    // For pending Stripe orders, we overwrite isPaid based on arguments
    const finalPaymentStatus = paymentStatusMock || (isPaid ? 'Pagado' : 'Pendiente');
    const code = orderType === 'pickup' ? generateOrderCode() : '';
    
    // Fidelidad: Añadir producto falso si se canjea
    const finalItems = cart.map(item => ({
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      taxRate: item.taxRate || 10,
      modifiers: item.modifiers || '',
      sectionId: item.sectionId || '',
      status: 'PENDING'
    }));

    if (claimingReward && rewardItemText) {
      finalItems.push({
        productId: 'reward',
        name: `🎁 PREMIO (${globalSettings.loyaltyRewardText || 'Gratis'}): ${rewardItemText}`,
        quantity: 1,
        price: 0,
        taxRate: 0,
        modifiers: '',
        sectionId: '',
        status: 'PENDING'
      });
    }

    // Datos de Fidelidad para el ticket (tracking)
    let currentOrderCount = 1;
    let currentHasReward = false;
    const required = Number(globalSettings.loyaltyOrdersRequired) || 10;

    if (globalSettings.loyaltyEnabled && customerInfo.phone) {
      if (loyaltyCustomer) {
        if (claimingReward) {
          currentOrderCount = 0; // Acaba de gastar el premio
          currentHasReward = false;
        } else {
          currentOrderCount = (loyaltyCustomer.orderCount || 0) + 1;
          currentHasReward = loyaltyCustomer.hasReward || (currentOrderCount >= required);
          if (currentOrderCount >= required && !loyaltyCustomer.hasReward) {
            currentOrderCount = 0; // Reinicia para la siguiente vuelta
          }
        }
      } else {
        currentOrderCount = 1;
        currentHasReward = (required === 1);
      }
    }

    const orderData = {
      items: finalItems,
      subtotal,
      total,
      deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
      customerInfo,
      orderType,
      orderCode: code,
      paymentStatus: finalPaymentStatus,
      paymentMethod: paymentMethodMock,
      status: initialStatus || 'Nuevos Pedidos', 
      source: isPosMode ? 'Local/POS' : 'Customer Web',
      createdAt: serverTimestamp(),
      loyaltyStatus: globalSettings.loyaltyEnabled ? {
        orderCount: currentOrderCount,
        hasReward: currentHasReward,
        required: required,
        rewardText: globalSettings.loyaltyRewardText || 'Premio'
      } : null
    };
    
    const docRef = await addDoc(collection(db, 'orders'), orderData);

    // Save customer to CRM (Fidelidad)
    if (globalSettings.loyaltyEnabled && customerInfo.phone) {
      try {
        const customerData = {
          name: customerInfo.name || loyaltyCustomer?.name || '',
          email: customerInfo.email || loyaltyCustomer?.email || '',
          phone: customerInfo.phone,
          address: customerInfo.address || loyaltyCustomer?.address || '',
          postalCode: customerInfo.postalCode || loyaltyCustomer?.postalCode || '',
          lastOrderDate: serverTimestamp(),
          source: 'Customer Web',
          orderCount: currentOrderCount,
          hasReward: currentHasReward
        };
        
        if (loyaltyCustomer?.id) {
          // Actualizar existente
          await updateDoc(doc(db, 'customers', loyaltyCustomer.id), customerData);
        } else {
          // Crear nuevo
          await addDoc(collection(db, 'customers'), customerData);
        }
      } catch (crmError) {
        console.error("Error saving to CRM: ", crmError);
      }
    } else if (customerInfo.email && customerInfo.phone) {
      // Fallback básico original
      try {
        await addDoc(collection(db, 'customers'), {
          name: customerInfo.name, email: customerInfo.email, phone: customerInfo.phone,
          address: customerInfo.address, postalCode: customerInfo.postalCode,
          lastOrderDate: serverTimestamp(), source: 'Customer Web'
        });
      } catch (e) { }
    }

    return { docRef, code };
  };

  const createPendingOrder = async () => {
    if (cart.length === 0) return null;
    const isValid = await validateOrder();
    if (!isValid) return null;
    
    try {
      const { docRef } = await buildAndSaveOrder('Pago Online (Stripe)', 'PAYMENT_PENDING', 'Procesando');
      return docRef.id;
    } catch (err) {
      console.error("Error creating draft order: ", err);
      return null;
    }
  };

  const handleCheckout = async (paymentMethodMock = 'cash') => {
    if (cart.length === 0) return;
    const isValid = await validateOrder();
    if (!isValid) return;

    setIsCheckingOut(true);
    try {
      const { docRef, code } = await buildAndSaveOrder(paymentMethodMock);
      
      onEmptyCart();

      // Redirigir a página de seguimiento para clientes web
      if (!isPosMode) {
        onClose();
        navigate(`/pedido/${docRef.id}`);
        return;
      }
      
      // Lógica solo para TPV a partir de aquí
      if (code) setOrderCode(code);
      setOrderSuccess(true);
      
      // En POS cerramos rápido
      setTimeout(() => {
        handleClose();
      }, 2000);
      
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
                <h3 className="text-2xl font-black text-gray-900 mb-2">¡Pedido Confirmado!</h3>
                {!isPosMode && <p className="text-gray-500 mb-8">Acércate al mostrador cuando te avisemos y muestra este código:</p>}
                {isPosMode && <p className="text-gray-500 mb-8">El pedido ha sido enviado a cocina.</p>}
                <div className="bg-gray-100 py-6 px-4 rounded-2xl mb-8">
                  <span className="text-4xl md:text-5xl font-black tracking-widest text-black">{orderCode}</span>
                </div>
                <button onClick={handleClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-colors">
                  {isPosMode ? 'Nuevo Pedido' : 'Cerrar'}
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
                {isPosMode && (
                  <button 
                    onClick={() => setOrderType('mesa')}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${orderType === 'mesa' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                  >
                    Mesa / Tomar aquí
                  </button>
                )}
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
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => {
                    onEmptyCart();
                    handleClose();
                  }}
                  className="p-4 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-xl transition-colors"
                  title="Vaciar carrito"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleClose}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 rounded-xl flex items-center justify-center transition-colors"
                >
                  Seguir comprando
                </button>
                <button 
                  onClick={() => setStep(2)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-red-600/30"
                >
                  <span>Pedir</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
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
                  <input type="text" name="name" value={customerInfo.name} onChange={handleInputChange} placeholder={isPosMode ? "Nombre (Opcional)" : "Nombre completo"} className="pl-10 w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 focus:bg-white" />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <input type="tel" name="phone" value={customerInfo.phone} onChange={handleInputChange} placeholder={isPosMode ? "Teléfono (Opcional)" : "Teléfono de contacto"} className="pl-10 w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 focus:bg-white" />
                </div>
                
                {/* Fidelidad: Aviso de Premio */}
                {globalSettings.loyaltyEnabled && loyaltyCustomer?.hasReward && !claimingReward && (
                  <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white shadow-lg animate-fade-in-up mt-2">
                    <div className="flex items-center gap-3 mb-2">
                      <Gift className="w-6 h-6 animate-bounce" />
                      <h4 className="font-black text-lg">¡Premio Disponible!</h4>
                    </div>
                    <p className="text-sm text-red-100 mb-3">Tienes derecho a: <strong className="text-white bg-red-700/50 px-2 py-0.5 rounded">{globalSettings.loyaltyRewardText}</strong></p>
                    {showRewardModal ? (
                      <div className="space-y-2 mt-3 pt-3 border-t border-red-400/50">
                        {globalSettings.loyaltyRewardCategory ? (
                          <select 
                            value={rewardItemText} 
                            onChange={(e) => setRewardItemText(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white"
                          >
                            <option value="">Selecciona tu premio...</option>
                            {loadingRewardProducts ? (
                              <option disabled>Cargando opciones...</option>
                            ) : (
                              rewardProducts.map((p, i) => <option key={i} value={p}>{p}</option>)
                            )}
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            placeholder="¿Qué deseas pedir de regalo?" 
                            value={rewardItemText} 
                            onChange={(e) => setRewardItemText(e.target.value)} 
                            className="w-full rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white"
                            autoFocus
                          />
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => setShowRewardModal(false)} className="px-3 py-2 text-sm bg-red-700 hover:bg-red-800 rounded-lg transition-colors flex-1 font-medium">Cancelar</button>
                          <button 
                            onClick={() => {
                              if (rewardItemText.trim()) {
                                setClaimingReward(true);
                                setShowRewardModal(false);
                              }
                            }} 
                            className="px-3 py-2 text-sm bg-white text-red-600 hover:bg-gray-50 rounded-lg transition-colors flex-1 font-bold"
                          >
                            Añadir Regalo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={handleOpenReward} className="w-full bg-white text-red-600 font-black py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm">
                        Canjear Premio Ahora
                      </button>
                    )}
                  </div>
                )}
                
                {/* Fidelidad: Premio Reclamado visualmente */}
                {claimingReward && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mt-2">
                    <div className="bg-green-100 p-2 rounded-full text-green-600 shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-900 text-sm">Premio Añadido ({globalSettings.loyaltyRewardText})</h4>
                      <p className="text-sm text-green-700 font-medium">1x {rewardItemText}</p>
                      <button onClick={() => setClaimingReward(false)} className="text-xs text-green-600 hover:text-green-800 underline mt-1 font-bold">Cancelar Premio</button>
                    </div>
                  </div>
                )}
                
                {!isPosMode && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                      </div>
                      <input type="email" name="email" value={customerInfo.email} onChange={handleInputChange} placeholder="Correo electrónico" className="pl-10 w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-gray-50 focus:bg-white" />
                    </div>
                  </>
                )}

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

              {/* Contenedor de Stripe dentro de la zona con scroll */}
              {showOnlinePayment && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <button onClick={() => setShowOnlinePayment(false)} className="text-sm text-gray-500 font-bold hover:text-gray-900 flex items-center w-full mb-2">
                    <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                    Volver a métodos de pago
                  </button>
                  <StripeCheckout 
                    amount={total} 
                    connectedAccountId={globalSettings.stripeAccountId}
                    createPendingOrder={createPendingOrder}
                    onPaymentSuccess={async (paymentIntent, pendingOrderId) => {
                      // Solo para pagos exitosos SIN redirección bancaria
                      // Encontramos el último pedido (que se acaba de crear como PAYMENT_PENDING)
                      onEmptyCart();
                      handleClose();
                      if (pendingOrderId) {
                        navigate(`/pedido/${pendingOrderId}`);
                      }
                    }}
                    onPaymentError={(err) => {
                      alert('El pago no pudo procesarse. Intenta de nuevo.');
                      console.error(err);
                    }}
                  />
                </div>
              )}

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
                {stripeSurcharge > 0 && showOnlinePayment && (
                  <div className="flex justify-between text-sm text-blue-600 font-medium">
                    <span>Gastos de gestión (Pago Online)</span>
                    <span>+{stripeSurcharge.toFixed(2)}€</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-gray-900 font-bold">Total a pagar</span>
                  <span className="text-2xl font-black text-gray-900">{total.toFixed(2)}€</span>
                </div>
              </div>
              
              {isPosMode ? (
                <div className="space-y-3">
                  {orderType === 'delivery' && (
                    <button onClick={() => handleCheckout('pending')} disabled={isCheckingOut} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                      <span>Pendiente de Pago (Cobrar en entrega)</span>
                    </button>
                  )}
                  <button onClick={() => handleCheckout('cash')} disabled={isCheckingOut} className="w-full bg-black hover:bg-gray-900 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                    <span>Cobrar Efectivo Ahora</span>
                  </button>
                  <button onClick={() => handleCheckout('card')} disabled={isCheckingOut} className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                    <CreditCard className="w-5 h-5" />
                    <span>Cobrar con Tarjeta Ahora</span>
                  </button>
                </div>
              ) : showOnlinePayment ? (
                // El formulario está arriba, aquí no mostramos botones extra
                <div className="text-center text-sm text-gray-500">
                  Rellena los datos de pago arriba para completar el pedido.
                </div>
              ) : (
                <div className="space-y-3">
                  {orderType === 'pickup' && (
                    <div className="text-xs text-center text-gray-500 font-semibold mb-2">SELECCIONA MÉTODO DE PAGO</div>
                  )}
                  {hasStripe && (
                    <button onClick={() => setShowOnlinePayment(true)} disabled={isCheckingOut} className="w-full bg-[#635BFF] hover:bg-[#4B45D6] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg disabled:opacity-70">
                      <CreditCard className="w-5 h-5" />
                      <span>Pago Seguro Online (Apple/Google Pay)</span>
                    </button>
                  )}
                  
                  {orderType === 'pickup' ? (
                    <button onClick={() => handleCheckout('Pago en Local')} disabled={isCheckingOut} className="w-full bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                      <Store className="w-5 h-5" /> <span>Pagar al recoger en Local</span>
                    </button>
                  ) : (
                    <button onClick={() => handleCheckout('Pago a Repartidor')} disabled={isCheckingOut} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-600/30 disabled:opacity-70">
                      <CreditCard className="w-5 h-5" />
                      <span>Pedir y Pagar al Repartidor</span>
                    </button>
                  )}
                </div>
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
