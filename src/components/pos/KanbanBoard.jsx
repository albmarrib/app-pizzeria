import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Clock, CheckCircle2, Flame, AlertCircle, Trash2, CreditCard, ChefHat, Eye, User, ShoppingBag, Truck } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, closestCenter, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';

const EXPEDITOR_COLUMNS = ['Nuevos Pedidos', 'IN_PROGRESS', 'READY_FOR_ASSEMBLY', 'COMPLETED'];

const getColumnTitle = (col) => {
  switch (col) {
    case 'Nuevos Pedidos': return 'Nuevos';
    case 'IN_PROGRESS': return 'En Proceso';
    case 'READY_FOR_ASSEMBLY': return 'Para Ensamblar / Entregar';
    case 'COMPLETED': return 'Completados';
    default: return col;
  }
};

const getColumnColor = (column) => {
  switch (column) {
    case 'Nuevos Pedidos': return 'bg-blue-50 border-blue-200';
    case 'IN_PROGRESS': return 'bg-orange-50 border-orange-200';
    case 'READY_FOR_ASSEMBLY': return 'bg-green-50 border-green-200';
    case 'COMPLETED': return 'bg-gray-100 border-gray-300';
    default: return 'bg-gray-50 border-gray-200';
  }
};

const OrderTypeTag = ({ type }) => {
  if (type === 'delivery') {
    return (
      <span className="flex items-center gap-1.5 bg-blue-600 text-white font-black px-3 py-1.5 rounded-lg text-sm shadow-sm">
        <Truck className="w-4 h-4" /> DELIVERY
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
const KanbanColumn = ({ id, title, orderCount, children, colorClass }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div ref={setNodeRef} className={`flex flex-col flex-shrink-0 w-[22rem] bg-gray-50/50 rounded-2xl border-2 h-full max-h-full transition-colors ${isOver ? 'border-red-400 bg-red-50/30' : 'border-gray-200'}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-xl shadow-sm z-10">
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

// Draggable Order Card Component
const OrderCard = ({ order, column, isExpeditor, activeView, sections, activeSectionColumns, isItemReady, moveItem, deleteOrder, now, alarmMinutes }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    data: { order, currentColumn: column }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined;

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
        onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
        className="absolute -top-3 -right-3 bg-white text-red-500 p-2 rounded-full shadow border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 z-10"
        title="Eliminar Pedido"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <OrderTypeTag type={order.orderType} />
        <span className="text-sm font-black text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-200">
          #{order.id.slice(-4)}
        </span>
      </div>

      <div className="bg-white/60 p-2.5 rounded-lg border border-black/5 flex items-center gap-2">
        <User className="w-5 h-5 text-gray-500" />
        <span className="font-black text-gray-900 text-lg truncate">{order.customerInfo?.name || 'Cliente'}</span>
      </div>

      <div className="flex justify-between items-center text-sm font-bold mt-1">
        <div className={`flex items-center gap-1 ${isAlarmTriggered && column !== 'COMPLETED' ? 'text-red-700' : 'text-gray-500'}`}>
          <Clock className="w-4 h-4" />
          <span>{order.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          <span className="ml-2 font-black bg-white/80 px-2 rounded-md border border-black/10">
            {elapsedMinutes}m {elapsedSeconds}s
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
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${isItemReady(item) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {itemStatus}
                  </span>
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
                  <button 
                    onClick={() => moveItem(order, idx, itemStatus, -1)}
                    disabled={itemStatus === activeSectionColumns[0]}
                    className="flex-1 py-3 text-sm font-black bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center border border-gray-200"
                  >
                    &lt; Atrás
                  </button>
                  <button 
                    onClick={() => moveItem(order, idx, itemStatus, 1)}
                    disabled={itemStatus === activeSectionColumns[activeSectionColumns.length - 1]}
                    className="flex-[2] py-3 text-base font-black bg-green-500 text-white shadow-lg shadow-green-500/30 rounded-xl hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center border border-green-600"
                  >
                    {itemStatus === activeSectionColumns[activeSectionColumns.length - 1] ? 'Completado' : 'Avanzar >'}
                  </button>
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
    </div>
  );
};

const KanbanBoard = () => {
  const [orders, setOrders] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alarmMinutes, setAlarmMinutes] = useState(15);
  const [now, setNow] = useState(new Date());
  
  const [activeView, setActiveView] = useState('expeditor');
  const [activeDragId, setActiveDragId] = useState(null);

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
      if (setSnap.exists() && setSnap.data().orderAlarmMinutes) {
        setAlarmMinutes(setSnap.data().orderAlarmMinutes);
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
      const newItems = [...order.items];
      newItems[itemIndex].status = newStatus;
      
      const newOrderStatus = deriveOrderStatus(newItems);
      
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

  const deleteOrder = async (orderId) => {
    if(window.confirm("¿Estás seguro de que deseas eliminar este pedido?")) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
      } catch (error) {
        console.error("Error deleting order: ", error);
      }
    }
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
      if (currentColumn === 'READY_FOR_ASSEMBLY' && targetColumn === 'COMPLETED') {
        try {
          await updateDoc(doc(db, 'orders', orderId), { status: 'COMPLETED' });
        } catch (err) {
          alert("Error actualizando Firebase: " + err.message);
        }
      } else {
        alert("En la Mesa de Pase (General) los pedidos avanzan automáticamente cuando la cocina termina sus partes. Solo puedes arrastrar manualmente a 'Completados' cuando lo entregues al cliente o repartidor.");
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
        return item;
      });

      const newOrderStatus = deriveOrderStatus(newItems);

      try {
        await updateDoc(doc(db, 'orders', orderId), { 
          items: newItems,
          status: newOrderStatus
        });
      } catch (err) {
        alert("Error guardando en Firebase: " + err.message);
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
    ? orders 
    : orders.filter(o => o.status !== 'COMPLETED' && o.items?.some(i => i.sectionId === activeView));

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
              <KanbanColumn key={column} id={column} title={getColumnTitle(column)} orderCount={columnOrders.length} colorClass={getColumnColor(column)}>
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
                    deleteOrder={deleteOrder}
                    now={now}
                    alarmMinutes={alarmMinutes}
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
    </div>
  );
};

export default KanbanBoard;
