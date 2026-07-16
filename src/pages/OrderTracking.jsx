import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ChefHat, CheckCircle2, Bike, Store, Utensils, ArrowLeft, Clock } from 'lucide-react';

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const previousStatus = useRef(null);
  const [logoUrl, setLogoUrl] = useState(null);

  // Un audio simple para notificar
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'));

  useEffect(() => {
    if (!orderId) {
      setError("ID de pedido inválido");
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrder({ id: docSnap.id, ...data });
        
        // Play sound if status changed (and not on initial load)
        if (previousStatus.current && previousStatus.current !== data.status) {
          audioRef.current.play().catch(e => console.log("Audio play blocked by browser", e));
        }
        previousStatus.current = data.status;
      } else {
        setError("Pedido no encontrado");
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Error al cargar el pedido");
      setLoading(false);
    });

    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists() && docSnap.data().logoUrl) {
          setLogoUrl(docSnap.data().logoUrl);
        }
      } catch (err) {
        console.error("Error cargando settings", err);
      }
    };
    fetchSettings();

    return () => unsub();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Utensils className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-gray-500">Buscando tu pedido...</h2>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <Store className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">¡Oops!</h2>
        <p className="text-gray-500 mb-8">{error || "Pedido no encontrado"}</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-black text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  // Define steps dynamically based on order type
  const isDelivery = order.orderType === 'delivery';
  
  let currentStep = 0;
  if (order.status === 'Nuevos Pedidos') currentStep = 1;
  else if (order.status === 'IN_PROGRESS') currentStep = 2;
  else if (order.status === 'READY_FOR_ASSEMBLY') currentStep = 3;
  else if (order.status === 'OUT_FOR_DELIVERY') currentStep = 4;
  else if (order.status === 'COMPLETED') currentStep = isDelivery ? 5 : 4;
  else if (order.status === 'CANCELED') currentStep = -1;

  const getDriverMessage = () => {
    if (order.driverName && order.driverName.toLowerCase() !== 'sin asignar' && !order.driverName.includes('Cualquiera') && order.driverName !== 'Todos') {
      return `Tu repartidor ${order.driverName} va hacia ti`;
    }
    return "El repartidor va hacia ti";
  };

  const steps = isDelivery ? [
    { index: 1, title: "Recibido", desc: "La pizzería tiene tu orden", icon: <Store className="w-6 h-6" /> },
    { index: 2, title: "En Preparación", desc: "¡Preparando tu orden con amor!", icon: <ChefHat className="w-6 h-6" /> },
    { index: 3, title: "Orden Lista", desc: "Esperando a que salga el repartidor", icon: <Utensils className="w-6 h-6" /> },
    { index: 4, title: "En Camino", desc: getDriverMessage(), icon: <Bike className="w-6 h-6" /> },
    { index: 5, title: "Entregado", desc: "¡Que aproveche!", icon: <CheckCircle2 className="w-6 h-6" /> }
  ] : [
    { index: 1, title: "Recibido", desc: "La pizzería tiene tu orden", icon: <Store className="w-6 h-6" /> },
    { index: 2, title: "En Preparación", desc: "¡Preparando tu orden con amor!", icon: <ChefHat className="w-6 h-6" /> },
    { index: 3, title: "Listo para Recoger", desc: "Ya puedes venir al local", icon: <Store className="w-6 h-6" /> },
    { index: 4, title: "Completado", desc: "¡Que aproveche!", icon: <CheckCircle2 className="w-6 h-6" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 pt-6 pb-4 px-4 sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="font-black text-lg text-gray-900">Seguimiento</h1>
            <p className="text-xs text-gray-500 font-medium">Orden #{order.id.slice(-4)}</p>
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-8">
        {order.status === 'CANCELED' ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center shadow-lg">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">😔</span>
            </div>
            <h2 className="text-2xl font-black text-red-900 mb-2">Pedido Cancelado</h2>
            <p className="text-red-700 font-medium">
              Tu pedido ha sido cancelado. Por favor, contacta con la pizzería si crees que es un error.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-red-600 to-red-700 p-8 text-center text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border-4 border-white/30">
                {steps.find(s => s.index === currentStep)?.icon || <Clock className="w-10 h-10" />}
              </div>
              <h2 className="text-3xl font-black mb-1">{steps.find(s => s.index === currentStep)?.title || 'Procesando...'}</h2>
              <p className="text-red-100 font-medium text-lg">
                {steps.find(s => s.index === currentStep)?.desc}
              </p>
            </div>

            <div className="p-8 relative overflow-hidden">
              {/* Marca de agua (Watermark) */}
              {logoUrl && (
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.15] pointer-events-none z-0">
                  <img src={logoUrl} alt="Watermark" className="w-[90%] h-[90%] object-contain" />
                </div>
              )}

              <div className="relative z-10">
                {/* Línea vertical conectora */}
                <div className="absolute left-6 top-6 bottom-6 w-1 bg-gray-100 rounded-full" />
                
                {/* Timeline Dinámico */}
                <div className="absolute left-6 top-6 w-1 bg-red-500 rounded-full transition-all duration-1000 ease-in-out" 
                     style={{ 
                       height: currentStep === 1 ? '0%' : 
                               currentStep === steps.length ? '100%' : 
                               `${((currentStep - 1) / (steps.length - 1)) * 100}%`
                     }} 
                />

                <div className="space-y-8 relative z-10">
                  {steps.map((step) => {
                    const isCompleted = currentStep > step.index;
                    const isActive = currentStep === step.index;
                    const isPending = currentStep < step.index;

                    return (
                      <div key={step.index} className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 shadow-sm
                          ${isActive ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 scale-110 ring-4 ring-red-100' : 
                            isCompleted ? 'bg-red-100 text-red-500' : 
                            'bg-gray-100 text-gray-300'}
                        `}>
                          {step.icon}
                        </div>
                        <div className={`transition-all duration-300 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                          <h3 className={`font-black text-lg ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                            {step.title}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumen del Pedido */}
        <div className="mt-8 bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="font-black text-gray-900 mb-4 text-lg">Resumen</h3>
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-sm">
                <div className="flex gap-2">
                  <span className="font-bold text-gray-700">{item.quantity}x</span>
                  <span className="text-gray-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-lg">
            <span className="font-black text-gray-900">Total pagado</span>
            <span className="font-black text-red-600">{order.total?.toFixed(2)}€</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OrderTracking;
