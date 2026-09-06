import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import ManualOrderPanel from './ManualOrderPanel';
import TableCheckoutModal from './TableCheckoutModal';
import { LayoutGrid, Users, Receipt, Utensils, Clock, CheckCircle2 } from 'lucide-react';

// Helper to draw chairs around rectangular tables
const renderChairs = (capacity) => {
  const chairs = [];
  const color = "bg-stone-300 border border-stone-400 shadow-sm";
  
  if (capacity <= 2) {
    chairs.push(<div key="c1" className={`absolute ${color} rounded-t-md w-8 h-2.5 -top-2 left-1/2 -translate-x-1/2`} />);
    chairs.push(<div key="c2" className={`absolute ${color} rounded-b-md w-8 h-2.5 -bottom-2 left-1/2 -translate-x-1/2`} />);
  } else if (capacity === 4) {
    chairs.push(<div key="c1" className={`absolute ${color} rounded-t-md w-8 h-2.5 -top-2 left-1/3 -translate-x-1/2`} />);
    chairs.push(<div key="c2" className={`absolute ${color} rounded-t-md w-8 h-2.5 -top-2 left-2/3 -translate-x-1/2`} />);
    chairs.push(<div key="c3" className={`absolute ${color} rounded-b-md w-8 h-2.5 -bottom-2 left-1/3 -translate-x-1/2`} />);
    chairs.push(<div key="c4" className={`absolute ${color} rounded-b-md w-8 h-2.5 -bottom-2 left-2/3 -translate-x-1/2`} />);
  } else {
    // Rectangular (sillas a los lados largos)
    const sideChairs = Math.floor(capacity / 2);
    for(let i=0; i<sideChairs; i++) {
      chairs.push(<div key={`t${i}`} className={`absolute ${color} rounded-t-md w-8 h-2.5 -top-2`} style={{ left: `${(i+1)*(100/(sideChairs+1))}%`, transform: 'translateX(-50%)' }} />);
      chairs.push(<div key={`b${i}`} className={`absolute ${color} rounded-b-md w-8 h-2.5 -bottom-2`} style={{ left: `${(i+1)*(100/(sideChairs+1))}%`, transform: 'translateX(-50%)' }} />);
    }
    // Añadir a los extremos si es impar
    if (capacity % 2 !== 0) {
      chairs.push(<div key="l1" className={`absolute ${color} rounded-l-md w-2.5 h-8 -left-2 top-1/2 -translate-y-1/2`} />);
    }
  }
  return chairs;
};

const getTableStyleParams = (capacity) => {
  return { rounded: 'rounded-xl', w: 'w-32', h: 'h-20' }; // Siempre rectangular
};

const getStatusColor = (status) => {
  if (!status) return { bg: 'bg-emerald-400', border: 'border-emerald-600', shadow: 'shadow-emerald-400/50' };
  if (status === 'Nuevos Pedidos' || status === 'PENDING' || status === 'IN_PROGRESS') return { bg: 'bg-orange-400', border: 'border-orange-600', shadow: 'shadow-orange-400/50' };
  if (status === 'READY_FOR_ASSEMBLY' || status === 'READY') return { bg: 'bg-fuchsia-500', border: 'border-fuchsia-700', shadow: 'shadow-fuchsia-500/50' };
  if (status === 'SERVED') return { bg: 'bg-slate-500', border: 'border-slate-700', shadow: 'shadow-slate-500/50' };
  return { bg: 'bg-red-500', border: 'border-red-700', shadow: 'shadow-red-500/50' };
};

const TableMapPanel = () => {
  const [zones, setZones] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedZone, setSelectedZone] = useState('ALL'); // 'ALL' = Global View
  
  // Modals
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(null);
  const [tableToManage, setTableToManage] = useState(null); // Open Checkout/Manage modal
  const [editingOrder, setEditingOrder] = useState(null); // Open ManualOrder directly from modal

  useEffect(() => {
    // Escuchar zonas
    const unsubsZones = onSnapshot(collection(db, 'zones'), (snap) => {
      const zList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort zones by order or name if needed, assuming they arrive in order for now
      setZones(zList);
    });

    // Escuchar mesas
    const unsubsTables = onSnapshot(collection(db, 'tables'), (snap) => {
      setTables(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Escuchar pedidos activos de dine_in
    const qFallback = query(collection(db, 'orders'), where('orderType', '==', 'dine_in'));
    const unsubsOrders = onSnapshot(qFallback, (snap) => {
      const orders = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED' && o.status !== 'PAID');
      setActiveOrders(orders);
    });

    return () => {
      unsubsZones();
      unsubsTables();
      unsubsOrders();
    };
  }, []);

  const getTableOrder = (tableId) => {
    return activeOrders.find(o => o.tableId === tableId);
  };

  const handleTableClick = (table) => {
    const order = getTableOrder(table.id);
    if (order) {
      // Mesa ocupada -> Abrir Gestión (Cobrar o Añadir)
      setTableToManage({ table, order });
    } else {
      // Mesa libre -> Iniciar pedido
      setSelectedTableForOrder(table);
    }
  };

  // If a table is selected for NEW order, render the ManualOrderPanel
  if (selectedTableForOrder) {
    return (
      <div className="h-full">
        <div className="mb-4 flex items-center justify-between">
          <button 
            onClick={() => setSelectedTableForOrder(null)}
            className="text-gray-500 hover:text-gray-900 font-semibold text-sm"
          >
            &larr; Volver al plano
          </button>
          <div className="bg-gray-800 text-white px-4 py-1 rounded-full font-bold">
            Abriendo Mesa: {selectedTableForOrder.label}
          </div>
        </div>
        <ManualOrderPanel 
          preselectedTable={selectedTableForOrder} 
          onOrderCompleted={() => setSelectedTableForOrder(null)} 
        />
      </div>
    );
  }

  // If editing an existing order (from the Manage Modal)
  if (editingOrder) {
    const table = tables.find(t => t.id === editingOrder.tableId);
    return (
      <div className="h-full">
        <div className="mb-4 flex items-center justify-between">
          <button 
            onClick={() => setEditingOrder(null)}
            className="text-gray-500 hover:text-gray-900 font-semibold text-sm"
          >
            &larr; Volver a Gestión de Mesa
          </button>
          <div className="bg-red-600 text-white px-4 py-1 rounded-full font-bold flex gap-2 items-center">
            Mesa: {table?.label} (Ocupada)
          </div>
        </div>
        
        <ManualOrderPanel 
          existingOrder={editingOrder} 
          onOrderCompleted={() => setEditingOrder(null)} 
        />
      </div>
    );
  }

  // Render a specific zone grid
  const renderZoneGrid = (zone) => {
    return (
      <div key={zone.id} className="mb-10">
        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-red-500" /> {zone.name}
        </h3>
        <div 
          className="bg-gray-200/50 p-10 rounded-3xl border-2 border-gray-300"
          style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${zone.gridWidth}, minmax(0, 1fr))`,
            gap: '30px',
            width: 'max-content',
            minWidth: '100%'
          }}
        >
          {Array.from({ length: zone.gridHeight }).map((_, y) => (
            Array.from({ length: zone.gridWidth }).map((_, x) => {
              const table = tables.find(t => t.zoneId === zone.id && t.gridX === x && t.gridY === y);
              
              if (!table) {
                return <div key={`${x}-${y}`} className="w-20 h-20 sm:w-24 sm:h-24 opacity-0 pointer-events-none" />;
              }

              const order = getTableOrder(table.id);
              const isOccupied = !!order;
              const statusColors = getStatusColor(order?.status);
              const styleParams = getTableStyleParams(table.capacity);

              return (
                <div key={table.id} className="relative flex items-center justify-center p-4">
                  {/* Sillas */}
                  {renderChairs(table.capacity)}
                  
                  {/* Mesa Física */}
                  <button 
                    onClick={() => handleTableClick(table)}
                    className={`relative z-10 flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-xl border-t border-l border-white/20 active:translate-y-1.5 ${styleParams.w} ${styleParams.h} ${styleParams.rounded} ${statusColors.bg} text-white ${statusColors.shadow}`}
                    style={{
                      backgroundImage: 'linear-gradient(145deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.1) 100%)',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), inset 0 -4px 6px -2px rgba(0, 0, 0, 0.2)'
                    }}
                  >
                    <span className="font-black text-2xl drop-shadow-sm">{table.label}</span>
                    
                    {/* Badge Capacidad si está libre */}
                    {!isOccupied && (
                      <div className="absolute -bottom-2.5 bg-gray-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Users className="w-3 h-3" /> {table.capacity}
                      </div>
                    )}

                    {/* Icono de Estado si está ocupada */}
                    {isOccupied && (
                      <div className="absolute -top-3 -right-3 bg-white text-gray-900 p-1.5 rounded-full shadow-lg border-2 border-gray-200">
                        {order.status === 'Nuevos Pedidos' || order.status === 'IN_PROGRESS' || order.status === 'PENDING' ? <Utensils className="w-4 h-4 text-orange-500 animate-pulse" /> : 
                         order.status === 'READY_FOR_ASSEMBLY' ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : 
                         order.status === 'SERVED' ? <Receipt className="w-4 h-4 text-indigo-500" /> :
                         <Receipt className="w-4 h-4 text-red-500" />}
                      </div>
                    )}
                  </button>
                </div>
              );
            })
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
      
      {/* Zone Tabs */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2 overflow-x-auto">
        <button 
          onClick={() => setSelectedZone('ALL')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${selectedZone === 'ALL' ? 'bg-white shadow-md text-red-600 border border-gray-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          <LayoutGrid className="w-5 h-5" /> Vista Global
        </button>
        <div className="w-px h-6 bg-gray-300 mx-2 self-center"></div>
        {zones.map(zone => (
          <button 
            key={zone.id}
            onClick={() => setSelectedZone(zone.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${selectedZone === zone.id ? 'bg-white shadow-md text-red-600 border border-gray-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            {zone.name}
          </button>
        ))}
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8">
        {zones.length === 0 ? (
          <div className="text-gray-400 flex flex-col items-center mt-20">
            <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">No hay zonas configuradas</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {selectedZone === 'ALL' 
              ? zones.map(zone => renderZoneGrid(zone))
              : zones.filter(z => z.id === selectedZone).map(zone => renderZoneGrid(zone))
            }
          </div>
        )}
      </div>

      {/* Leyenda de Colores */}
      <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200 pointer-events-none">
        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Leyenda de Estados</h4>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <div className="w-4 h-4 rounded-md bg-emerald-400 shadow-sm border border-emerald-600"></div> Libre
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <div className="w-4 h-4 rounded-md bg-orange-400 shadow-sm border border-orange-600"></div> Cocinando
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <div className="w-4 h-4 rounded-md bg-fuchsia-500 shadow-sm border border-fuchsia-700"></div> Listo en Pase
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <div className="w-4 h-4 rounded-md bg-slate-500 shadow-sm border border-slate-700"></div> En Mesa (Servido)
          </div>
        </div>
      </div>

      {/* Modal de Gestión de Mesa (Cobrar / Añadir) */}
      {tableToManage && (
        <TableCheckoutModal 
          table={tableToManage.table}
          order={tableToManage.order}
          onClose={() => setTableToManage(null)}
          onOpenManualOrder={() => {
            setEditingOrder(tableToManage.order);
            setTableToManage(null);
          }}
        />
      )}

    </div>
  );
};

export default TableMapPanel;
