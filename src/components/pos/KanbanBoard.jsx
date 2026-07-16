import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Clock, CheckCircle2, Flame, AlertCircle, Trash2, CreditCard, ChefHat, Eye, User, ShoppingBag, Truck, Bike, X, Ban, MessageCircle } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';

const EXPEDITOR_COLUMNS = ['Nuevos Pedidos', 'IN_PROGRESS', 'READY_FOR_ASSEMBLY', 'OUT_FOR_DELIVERY'];

const getColumnTitle = (col) => {
  switch (col) {
    case 'Nuevos Pedidos': return 'Nuevos';
    case 'IN_PROGRESS': return 'En Proceso';
    case 'READY_FOR_ASSEMBLY': return 'Para Ensamblar / Entregar';
    case 'OUT_FOR_DELIVERY': return 'En Reparto';
    case 'COMPLETED': return 'Completados';
    default: return col;
  }
};

const getColumnColor = (column) => {
  switch (column) {
    case 'Nuevos Pedidos': return 'bg-blue-50 border-blue-200';
    case 'IN_PROGRESS': return 'bg-orange-50 border-orange-200';
    case 'READY_FOR_ASSEMBLY': return 'bg-green-50 border-green-200';
    case 'OUT_FOR_DELIVERY': return 'bg-purple-50 border-purple-200';
    case 'COMPLETED': return 'bg-gray-100 border-gray-300';
    default: return 'bg-gray-50 border-gray-200';
  }
};

const OrderTypeTag = ({ type }) => {
  if (type === 'delivery') {
    return (
      <span className="flex items-center gap-1.5 bg-blue-600 text-white font-black px-3 py-1.5 rounded-lg text-sm shadow-sm">
        <Bike className="w-4 h-4" /> A DOMICILIO
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 bg-yellow-400 text-yellow-900 font-black px-3 py-1.5 rounded-lg text-sm shadow-sm">
      <ShoppingBag className="w-4 h-4" /> RECOGER
    </span>
  );
};

// Droppable Column Component
const KanbanColumn = ({ id, title, orderCount, children, colorClass, onHeaderClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div ref={setNodeRef} className={`flex flex-col flex-shrink-0 w-[22rem] bg-gray-50/50 rounded-2xl border-2 h-full max-h-full transition-colors ${isOver ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}>
      <div 
        onClick={onHeaderClick}
        className="p-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-xl shadow-sm z-10 cursor-pointer hover:bg-gray-50 transition-colors"
        title="Ver listado detallado"
      >
        <div className="flex items-center gap-2 font-black text-lg text-gray-800">
          {title}
        </div>
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-black">
          {orderCount}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {children}
        {orderCount === 0 && (
          <div className="text-center py-10 text-gray-400 text-base font-medium border-2 border-dashed border-gray-200 rounded-2xl">
            Nada por aquí
          </div>
        )}
      </div>
    </div>
  );
};

const getWhatsAppLink = (order) => {
  if (!order.customerInfo?.phone) return null;
  let phone = order.customerInfo.phone.replace(/\D/g, '');
  if (!phone.startsWith('34') && phone.length === 9) phone = '34' + phone; // Asumimos España (34) si no tiene prefijo
  const url = `${window.location.origin}/pedido/${order.id}`;
  const text = encodeURIComponent(`¡Hola! Puedes seguir el estado de tu pedido en tiempo real aquí: ${url}`);
  return `https://wa.me/${phone}?text=${text}`;
};

// Draggable Order Card Component
const OrderCard = ({ order, column, isExpeditor, activeView, sections, activeSectionColumns, isItemReady, moveItem, cancelOrder, now, alarmMinutes, onMoveToDelivery }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order, currentColumn: column }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
    touchAction: 'none'
  } : { touchAction: 'none' };

  const getSectionName = (secId) => sections.find(s => s.id === secId)?.name || 'Sin Sección';

  // Compute elapsed time
  const elapsedMs = now.getTime() - order.createdAt.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
  const isAlarmTriggered = elapsedMinutes >= alarmMinutes;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`p-4 rounded-xl border-2 shadow-md flex flex-col gap-3 relative group transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'} ${getColumnColor(column)} ${isAlarmTriggered && column !== 'COMPLETED' ? 'border-red-500 bg-red-50 animate-pulse' : ''}`}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); cancelOrder(order.id); }}
        className="absolute -top-3 -right-3 bg-white text-red-500 p-2 rounded-full shadow border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 z-10"
        title="Marcar como Pérdida / Cancelado"
      >
        <Ban className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <OrderTypeTag type={order.orderType} />
        <span className="text-sm font-black text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-200">
          #{order.id.slice(-4)}
        </span>
      </div>

      <div className="bg-white/60 p-2.5 rounded-lg border border-black/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-500" />
          <span className="font-black text-gray-900 text-lg truncate">{order.customerInfo?.name || 'Cliente'}</span>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm font-bold mt-1">
        <div className={`flex items-center gap-1 ${isAlarmTriggered && column !== 'COMPLETED' ? 'text-red-700' : 'text-gray-500'}`}>
          <Clock className="w-4 h-4" />
          <span>{order.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          <span className="ml-2 font-black bg-white/80 px-2 rounded-md border border-black/10">
            {elapsedMinutes}m
          </span>
        </div>
        {isExpeditor && (
          <span className="text-black bg-white px-2 py-1 rounded border border-gray-200">
            {order.subtotal?.toFixed(2)}€
          </span>
        )}
      </div>

      {/* ITEMS */}
      <div className="space-y-4 mt-2">
        {order.items?.map((item, idx) => {
          if (!isExpeditor && item.sectionId !== activeView) return null;
          const itemStatus = item.status || (isExpeditor ? 'PENDING' : activeSectionColumns[0]);

          return (
            <div key={idx} className="flex flex-col bg-white p-3 rounded-xl border border-gray-200 shadow-sm cursor-default" onPointerDown={e => e.stopPropagation()}>
              <div className="flex justify-between items-start">
                <div className="text-base font-black text-gray-900 flex items-start gap-3">
                  <span className="bg-gray-100 px-2 py-1 rounded-md text-red-600">{item.quantity}x</span>
                  <span className="leading-tight mt-1">{item.name}</span>
                </div>
                {isExpeditor && (
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${isItemReady(item) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {itemStatus}
                    </span>
                  </div>
                )}
              </div>
              
              {item.modifiers && (
                <span className="text-sm text-red-600 font-bold ml-11 mt-1 block">
                  {item.modifiers}
                </span>
              )}
              
              {/* BIG Touch Controls for Section View */}
              {!isExpeditor && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  {itemStatus !== activeSectionColumns[0] && (
                    <button 
                      onClick={() => moveItem(order, idx, itemStatus, -1)}
                      className="w-1/3 py-3 text-sm font-black bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center border border-gray-200"
                    >
                      &lt; Atrás
                    </button>
                  )}
                  {itemStatus !== activeSectionColumns[activeSectionColumns.length - 1] ? (
                    <button 
                      onClick={() => moveItem(order, idx, itemStatus, 1)}
                      className="flex-1 py-3 text-base font-black bg-green-500 text-white shadow-lg shadow-green-500/30 rounded-xl hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center border border-green-600"
                    >
                      Avanzar &gt;
                    </button>
                  ) : (
                    <div className="flex-1 py-3 text-sm font-black bg-green-50 text-green-700 rounded-xl border border-green-200 flex items-center justify-center cursor-default">
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Esperando
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Coordinación */}
      {!isExpeditor && order.items?.some(i => i.sectionId !== activeView) && (
        <div className="mt-3 text-sm border-2 border-blue-100 bg-blue-50/80 rounded-xl p-3">
          <div className="font-black text-blue-900 flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4" /> Otros productos del pedido:
          </div>
          <div className="space-y-1">
            {order.items.filter(i => i.sectionId !== activeView).map((otherItem, oIdx) => (
              <div key={oIdx} className="flex justify-between text-blue-900/80 items-center">
                <span className="truncate pr-2 font-medium">{otherItem.name} <span className="text-xs opacity-70">({getSectionName(otherItem.sectionId)})</span></span>
                <span className="font-bold shrink-0 text-xs bg-white px-2 py-1 rounded">{otherItem.status || 'PENDING'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {order.notes && (
        <div className="text-sm p-3 bg-yellow-100/80 text-yellow-900 rounded-xl border border-yellow-300 mt-2">
          <span className="font-black">Notas del cliente:</span> {order.notes}
        </div>
      )}
      
      {isExpeditor && order.customerInfo?.phone && (
        <a 
          href={getWhatsAppLink(order)} 
          target="_blank" 
          rel="noreferrer"
          className="mt-2 w-full bg-green-50 hover:bg-green-100 text-green-700 font-bold py-2 rounded-xl flex items-center justify-center gap-2 border border-green-200 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle className="w-4 h-4" /> Enviar Seguimiento
        </a>
      )}

      {isExpeditor && column === 'READY_FOR_ASSEMBLY' && (
        <button 
          onClick={async (e) => {
            e.stopPropagation();
            if (order.orderType === 'delivery') {
              if (onMoveToDelivery) {
                onMoveToDelivery(order.id);
              }
            } else {
              await updateDoc(doc(db, 'orders', order.id), { status: 'COMPLETED' });
            }
          }}
          className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 border border-green-600"
        >
          <CheckCircle2 className="w-5 h-5" /> 
          {order.orderType === 'delivery' ? 'RECOGIDO POR REPARTIDOR' : 'ENTREGADO AL CLIENTE'}
        </button>
      )}

      {isExpeditor && column === 'OUT_FOR_DELIVERY' && (
        <button 
          onClick={async (e) => {
            e.stopPropagation();
            await updateDoc(doc(db, 'orders', order.id), { status: 'COMPLETED' });
          }}
          className="mt-2 w-full bg-purple-500 hover:bg-purple-600 text-white font-black py-3 rounded-xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 border border-purple-600"
        >
          <CheckCircle2 className="w-5 h-5" /> ENTREGADO AL CLIENTE
        </button>
      )}
    </div>
  );
};

const ColumnListModal = ({ column, title, orders, onClose, isExpeditor, activeView, sections, activeSectionColumns, isItemReady, moveItem, cancelOrder, now, alarmMinutes, onMoveToDelivery }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  if (!column) return null;

  const filteredOrders = orders.filter(order => {
    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const customerName = (order.customerInfo?.name || '').toLowerCase();
      const customerPhone = (order.customerInfo?.phone || '').toLowerCase();
      const orderId = order.id.toLowerCase();
      if (!customerName.includes(term) && !customerPhone.includes(term) && !orderId.includes(term)) {
        return false;
      }
    }
    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'delivery' && order.orderType !== 'delivery') return false;
      if (filterType === 'pickup' && order.orderType === 'delivery') return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-gray-50 rounded-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-white border-b border-gray-200 flex flex-col gap-4 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                {title} 
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-xl text-xl">{filteredOrders.length}</span>
              </h2>
              <p className="text-gray-500 font-medium mt-1">Listado detallado ordenado por tiempo de espera</p>
            </div>
            <button onClick={onClose} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              placeholder="Buscar por cliente, teléfono o #código..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm"
            />
            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
              <button 
                onClick={() => setFilterType('all')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filterType === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterType('delivery')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filterType === 'delivery' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                A Domicilio
              </button>
              <button 
                onClick={() => setFilterType('pickup')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${filterType === 'pickup' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Recoger
              </button>
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredOrders.map(order => {
            const elapsedMs = now.getTime() - order.createdAt.getTime();
            const elapsedMinutes = Math.floor(elapsedMs / 60000);
            const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
            const isAlarmTriggered = elapsedMinutes >= alarmMinutes;

            return (
              <div key={order.id} className={`bg-white p-3 sm:p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 ${isAlarmTriggered && column !== 'COMPLETED' ? 'border-red-500 bg-red-50 animate-pulse' : 'border-gray-200'}`}>
                {/* Info Lateral */}
                <div className="flex-shrink-0 w-full md:w-48 flex flex-col justify-between gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <OrderTypeTag type={order.orderType} />
                      <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                        #{order.id.slice(-4)}
                      </span>
                    </div>
                    <div className="font-black text-lg text-gray-900 break-words leading-tight">
                      {order.customerInfo?.name || 'Cliente'}
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-bold mt-1 ${isAlarmTriggered ? 'text-red-600' : 'text-gray-500'}`}>
                      <Clock className="w-3 h-3" />
                      <span>{elapsedMinutes}m</span>
                    </div>
                  </div>
                  
                  {isExpeditor && order.customerInfo?.phone && (
                    <a 
                      href={getWhatsAppLink(order)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="mt-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 border border-green-200 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="w-3 h-3" /> Enviar Seguimiento
                    </a>
                  )}

                  {isExpeditor && column === 'READY_FOR_ASSEMBLY' && (
                    <button 
                      onClick={async () => {
                        if (order.orderType === 'delivery') {
                          if (onMoveToDelivery) {
                            onMoveToDelivery(order.id);
                          }
                        } else {
                          await updateDoc(doc(db, 'orders', order.id), { status: 'COMPLETED' });
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center text-xs mt-2 transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> 
                      {order.orderType === 'delivery' ? 'Recogido por Repartidor' : 'Entregado al Cliente'}
                    </button>
                  )}

                  {isExpeditor && column === 'OUT_FOR_DELIVERY' && (
                    <button 
                      onClick={async () => {
                        await updateDoc(doc(db, 'orders', order.id), { status: 'COMPLETED' });
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center text-xs mt-2 transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Entregado al Cliente
                    </button>
                  )}
                  
                  <button 
                    onClick={() => cancelOrder(order.id)}
                    className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold py-1.5 px-2 rounded-lg flex items-center justify-center text-xs transition-colors border border-red-100"
                  >
                    <Ban className="w-3 h-3 mr-1" /> Pérdida/Cancelar
                  </button>
                </div>
                
                {/* Productos y Controles */}
                <div className="flex-1 flex flex-col gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
                  <div className="grid grid-cols-1 gap-2">
                    {order.items?.map((item, idx) => {
                      if (!isExpeditor && item.sectionId !== activeView) return null;
                      const itemStatus = item.status || (isExpeditor ? 'PENDING' : activeSectionColumns[0]);

                      return (
                        <div key={idx} className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-black text-gray-900 flex items-start gap-2">
                              <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-red-600">{item.quantity}x</span>
                              <span className="leading-tight mt-0.5">{item.name}</span>
                            </div>
                            {item.modifiers && (
                              <span className="text-xs text-red-600 font-bold ml-8 mt-0.5 block">
                                {item.modifiers}
                              </span>
                            )}
                          </div>
                          
                          {/* Controles del Listado */}
                          {!isExpeditor && (
                            <div className="flex items-center gap-1 ml-8 sm:ml-0 shrink-0">
                              {itemStatus !== activeSectionColumns[0] && (
                                <button 
                                  onClick={() => moveItem(order, idx, itemStatus, -1)}
                                  className="px-3 py-1.5 text-xs font-black bg-white text-gray-500 rounded hover:bg-gray-100 active:scale-95 transition-all border border-gray-200"
                                >
                                  &lt; Atrás
                                </button>
                              )}
                              {itemStatus !== activeSectionColumns[activeSectionColumns.length - 1] && (
                                <button 
                                  onClick={() => moveItem(order, idx, itemStatus, 1)}
                                  className="px-3 py-1.5 text-xs font-black bg-green-500 text-white shadow-sm shadow-green-500/20 rounded hover:bg-green-600 active:scale-95 transition-all border border-green-600 min-w-[90px]"
                                >
                                  Avanzar &gt;
                                </button>
                              )}
                            </div>
                          )}
                          {isExpeditor && (
                             <div className="flex items-center gap-2">
                               <span className={`text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-wider ${isItemReady(item) ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                 {itemStatus}
                               </span>
                             </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {order.notes && (
                    <div className="text-sm p-3 bg-yellow-50 text-yellow-900 rounded-xl border border-yellow-200">
                      <span className="font-black">Notas del cliente:</span> {order.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredOrders.length === 0 && (
            <div className="text-center py-20 text-gray-500 text-lg font-medium flex flex-col items-center justify-center gap-2">
              <span className="text-4xl">🔍</span>
              No se han encontrado pedidos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KanbanBoard = () => {
  const [orders, setOrders] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alarmMinutes, setAlarmMinutes] = useState(15);
  const [drivers, setDrivers] = useState([]);
  const [now, setNow] = useState(new Date());
  const [driverSelectOrderId, setDriverSelectOrderId] = useState(null);
  
  const [activeView, setActiveView] = useState('expeditor');
  const [activeDragId, setActiveDragId] = useState(null);
  const [modalColumn, setModalColumn] = useState(null); // 'Nuevos Pedidos', etc.

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    const fetchSectionsAndSettings = async () => {
      const secSnap = await getDocs(collection(db, 'preparation_sections'));
      setSections(secSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const setSnap = await getDoc(doc(db, 'settings', 'general'));
      if (setSnap.exists()) {
        const data = setSnap.data();
        if (data.orderAlarmMinutes) {
          setAlarmMinutes(data.orderAlarmMinutes);
        }
        if (data.drivers) {
          setDrivers(data.drivers.split(',').map(d => d.trim()).filter(d => d));
        }
      }
    };
    fetchSectionsAndSettings();

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setOrders(ordersData);
      setLoading(false);
    });

    const timer = setInterval(() => setNow(new Date()), 10000); // update every 10s

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const isItemReady = (item) => {
    const sec = sections.find(s => s.id === item.sectionId);
    if (!sec || !sec.columns || sec.columns.length === 0) {
      return item.status === 'READY' || item.status === 'Listo';
    }
    const lastCol = sec.columns[sec.columns.length - 1];
    return item.status === lastCol;
  };

  const deriveOrderStatus = (items) => {
    if (!items || items.length === 0) return 'Nuevos Pedidos';
    const allReady = items.every(isItemReady);
    const allPending = items.every(i => {
      const sec = sections.find(s => s.id === i.sectionId);
      const firstCol = sec?.columns?.[0] || 'PENDING';
      return !i.status || i.status === firstCol;
    });
    
    if (allReady) return 'READY_FOR_ASSEMBLY';
    if (allPending) return 'Nuevos Pedidos';
    return 'IN_PROGRESS';
  };

  const moveItem = async (order, itemIndex, currentStatus, direction) => {
    const secId = order.items[itemIndex].sectionId;
    const sec = sections.find(s => s.id === secId);
    const activeColumns = sec?.columns || ['Pendiente', 'Preparando', 'Listo'];

    const currentIndex = activeColumns.indexOf(currentStatus);
    const newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < activeColumns.length) {
      const newStatus = activeColumns[newIndex];
      // Deep copy to prevent React state mutation by reference before Firebase update
      const newItems = order.items.map((item, idx) => {
        if (idx === itemIndex) {
          return { ...item, status: newStatus };
        }
        return { ...item };
      });
      
      const newOrderStatus = deriveOrderStatus(newItems);
      
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, items: newItems, status: newOrderStatus } : o));
      
      try {
        await updateDoc(doc(db, 'orders', order.id), { 
          items: newItems,
          status: newOrderStatus
        });
      } catch (error) {
        console.error("Error updating item status: ", error);
      }
    }
  };

  const cancelOrder = async (orderId) => {
    if(window.confirm("¿Marcar este pedido como PÉRDIDA/CANCELADO? Desaparecerá de la cocina pero se registrará en las estadísticas.")) {
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELED' } : o));
      
      try {
        await updateDoc(doc(db, 'orders', orderId), { status: 'CANCELED' });
      } catch (error) {
        console.error("Error canceling order: ", error);
      }
    }
  };

  const handleMoveToDelivery = (orderId) => {
    setDriverSelectOrderId(orderId);
  };

  const confirmDeliveryDriver = async (driverName) => {
    if (!driverSelectOrderId) return;
    
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === driverSelectOrderId ? { ...o, status: 'OUT_FOR_DELIVERY', driverName } : o));
    
    try {
      await updateDoc(doc(db, 'orders', driverSelectOrderId), { 
        status: 'OUT_FOR_DELIVERY', 
        driverName 
      });
    } catch (err) {
      console.error("Error asignando repartidor: " + err.message);
    }
    
    setDriverSelectOrderId(null);
  };

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) {
      // alert("Debug: No se detectó ninguna columna destino al soltar (over es nulo).");
      return; 
    }

    const orderId = active.id;
    const targetColumn = over.id;
    const currentColumn = active.data.current?.currentColumn;

    if (currentColumn === targetColumn) return; 

    const order = orders.find(o => o.id === orderId);
    if (!order) {
      alert("Debug: No se encontró el pedido con ID " + orderId);
      return;
    }

    if (activeView === 'expeditor') {
      if (
        (currentColumn === 'READY_FOR_ASSEMBLY' && targetColumn === 'COMPLETED') ||
        (currentColumn === 'READY_FOR_ASSEMBLY' && targetColumn === 'OUT_FOR_DELIVERY' && order.orderType === 'delivery') ||
        (currentColumn === 'OUT_FOR_DELIVERY' && targetColumn === 'COMPLETED')
      ) {
        if (targetColumn === 'OUT_FOR_DELIVERY') {
          handleMoveToDelivery(orderId);
          return; // The drag will be aborted visually, but we open the modal which handles the DB update
        }

        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: targetColumn } : o));
        
        try {
          await updateDoc(doc(db, 'orders', orderId), { status: targetColumn });
        } catch (err) {
          console.error("Error actualizando Firebase: " + err.message);
        }
      } else {
        alert("En la Mesa de Pase, los pedidos avanzan automáticamente. Solo puedes arrastrar manualmente a sus estados finales permitidos.");
      }
    } else {
      // Section View bulk update
      if (!activeSectionColumns.includes(targetColumn)) {
        alert("Debug: La columna destino '" + targetColumn + "' no pertenece a esta sección: " + activeSectionColumns.join(', '));
        return;
      }

      const newItems = order.items.map(item => {
        if (item.sectionId === activeView) {
          return { ...item, status: targetColumn };
        }
        return { ...item };
      });

      const newOrderStatus = deriveOrderStatus(newItems);

      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: newItems, status: newOrderStatus } : o));

      try {
        await updateDoc(doc(db, 'orders', orderId), { 
          items: newItems,
          status: newOrderStatus
        });
      } catch (err) {
        console.error("Error guardando en Firebase: " + err.message);
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500 font-medium">Cargando pedidos...</div>;
  }

  const isExpeditor = activeView === 'expeditor';
  const activeSection = sections.find(s => s.id === activeView);
  const activeSectionColumns = activeSection?.columns || ['Pendiente', 'Preparando', 'Listo'];
  const columnsToRender = isExpeditor ? EXPEDITOR_COLUMNS : activeSectionColumns;

  const visibleOrders = isExpeditor 
    ? orders.filter(o => o.status !== 'CANCELED') 
    : orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED' && o.items?.some(i => i.sectionId === activeView));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
        <button 
          onClick={() => setActiveView('expeditor')}
          className={`px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeView === 'expeditor' ? 'bg-black text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
        >
          <ChefHat className="w-5 h-5" /> Mesa de Pase (General)
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        {sections.map(sec => (
          <button 
            key={sec.id}
            onClick={() => setActiveView(sec.id)}
            className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${activeView === sec.id ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            {sec.name}
          </button>
        ))}
        
        <div className="flex-1"></div>
        <button 
          onClick={() => setModalColumn('COMPLETED')}
          className="px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5" /> Historial Entregados
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <div className="flex gap-6 items-start overflow-x-auto pb-4 flex-1">
          {columnsToRender.map((column) => {
            
            let columnOrders = [];
            if (isExpeditor) {
              columnOrders = visibleOrders.filter(o => o.status === column);
            } else {
              columnOrders = visibleOrders.filter(o => {
                const sectionItems = o.items.filter(i => i.sectionId === activeView);
                let minIndex = activeSectionColumns.length;
                sectionItems.forEach(i => {
                  const itemStatus = i.status || activeSectionColumns[0];
                  const idx = activeSectionColumns.indexOf(itemStatus);
                  if (idx !== -1 && idx < minIndex) minIndex = idx;
                });
                const orderColumn = minIndex < activeSectionColumns.length ? activeSectionColumns[minIndex] : activeSectionColumns[0];
                return orderColumn === column;
              });
            }
            
            return (
              <KanbanColumn 
                key={column} 
                id={column} 
                title={getColumnTitle(column)} 
                orderCount={columnOrders.length} 
                colorClass={getColumnColor(column)}
                onHeaderClick={() => setModalColumn(column)}
              >
                {columnOrders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    column={column} 
                    isExpeditor={isExpeditor}
                    activeView={activeView}
                    sections={sections}
                    activeSectionColumns={activeSectionColumns}
                    isItemReady={isItemReady}
                    moveItem={moveItem}
                    cancelOrder={cancelOrder}
                    now={now}
                    alarmMinutes={alarmMinutes}
                    onMoveToDelivery={handleMoveToDelivery}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
        
        {/* Overlay for smooth dragging preview */}
        <DragOverlay>
          {activeDragId ? (
            <div className="opacity-80 rotate-2 scale-105 pointer-events-none">
              {/* Simplistic preview of the card being dragged */}
              <div className="p-4 rounded-xl border-2 shadow-2xl bg-white w-[22rem]">
                <div className="flex justify-between items-start mb-2">
                  <OrderTypeTag type={orders.find(o => o.id === activeDragId)?.orderType} />
                  <span className="text-sm font-black text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-200">
                    #{activeDragId.slice(-4)}
                  </span>
                </div>
                <div className="font-black text-gray-900 text-lg truncate">Arrastrando...</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {modalColumn && (
        <ColumnListModal 
          column={modalColumn}
          title={getColumnTitle(modalColumn)}
          orders={visibleOrders.filter(o => {
             // Replicate the filtering logic for the column
             if (isExpeditor) return o.status === modalColumn;
             
             const sectionItems = o.items.filter(i => i.sectionId === activeView);
             let minIndex = activeSectionColumns.length;
             sectionItems.forEach(i => {
               const itemStatus = i.status || activeSectionColumns[0];
               const idx = activeSectionColumns.indexOf(itemStatus);
               if (idx !== -1 && idx < minIndex) minIndex = idx;
             });
             const orderColumn = minIndex < activeSectionColumns.length ? activeSectionColumns[minIndex] : activeSectionColumns[0];
             return orderColumn === modalColumn;
          }).sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime())} // Sort oldest first
          onClose={() => setModalColumn(null)}
          isExpeditor={isExpeditor}
          activeView={activeView}
          sections={sections}
          activeSectionColumns={activeSectionColumns}
          isItemReady={isItemReady}
          moveItem={moveItem}
          cancelOrder={cancelOrder}
          now={now}
          alarmMinutes={alarmMinutes}
          onMoveToDelivery={handleMoveToDelivery}
        />
      )}

      {/* Driver Selection Modal */}
      {driverSelectOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col">
            <h3 className="text-xl font-black mb-4">¿Quién se lleva este pedido?</h3>
            <div className="space-y-3">
              {drivers.length > 0 ? (
                drivers.map(d => (
                  <button
                    key={d}
                    onClick={() => confirmDeliveryDriver(d)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-colors"
                  >
                    {d}
                  </button>
                ))
              ) : (
                <button
                  onClick={() => confirmDeliveryDriver('Repartidor (Cualquiera)')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Asignar a todos a la vez
                </button>
              )}
            </div>
            <button
              onClick={() => setDriverSelectOrderId(null)}
              className="mt-6 text-gray-500 font-bold py-2 w-full text-center hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
