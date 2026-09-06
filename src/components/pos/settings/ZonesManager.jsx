import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Plus, Trash2, Edit2, LayoutGrid, Save } from 'lucide-react';

const ZonesManager = () => {
  const [zones, setZones] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  
  const [newZone, setNewZone] = useState({ name: '', prefix: '', gridWidth: 5, gridHeight: 5 });
  const [loading, setLoading] = useState(true);

  // Load zones and tables
  useEffect(() => {
    fetchZonesAndTables();
  }, []);

  const fetchZonesAndTables = async () => {
    setLoading(true);
    try {
      const zonesSnap = await getDocs(collection(db, 'zones'));
      const zList = zonesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setZones(zList);

      const tablesSnap = await getDocs(collection(db, 'tables'));
      const tList = tablesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTables(tList);
      
      if (zList.length > 0 && !selectedZone) {
        setSelectedZone(zList[0]);
      }
    } catch (error) {
      console.error("Error loading zones/tables:", error);
    }
    setLoading(false);
  };

  const handleAddZone = async () => {
    if (!newZone.name || !newZone.prefix) return;
    try {
      const docRef = await addDoc(collection(db, 'zones'), newZone);
      const createdZone = { id: docRef.id, ...newZone };
      setZones([...zones, createdZone]);
      setNewZone({ name: '', prefix: '', gridWidth: 5, gridHeight: 5 });
      if (!selectedZone) setSelectedZone(createdZone);
    } catch (error) {
      console.error("Error adding zone:", error);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if(!window.confirm('¿Seguro que quieres borrar esta zona y todas sus mesas?')) return;
    try {
      await deleteDoc(doc(db, 'zones', zoneId));
      
      // Delete tables in this zone
      const zoneTables = tables.filter(t => t.zoneId === zoneId);
      for (const t of zoneTables) {
        await deleteDoc(doc(db, 'tables', t.id));
      }

      setZones(zones.filter(z => z.id !== zoneId));
      setTables(tables.filter(t => t.zoneId !== zoneId));
      if (selectedZone?.id === zoneId) setSelectedZone(null);
    } catch (error) {
      console.error("Error deleting zone:", error);
    }
  };

  const handleGridClick = async (x, y) => {
    if (!selectedZone) return;

    // Check if table exists here
    const existingTable = tables.find(t => t.zoneId === selectedZone.id && t.gridX === x && t.gridY === y);
    
    if (existingTable) {
      // Edit or delete
      const action = window.prompt(`Mesa ${existingTable.label} (Pax: ${existingTable.capacity}).\nEscribe "B" para borrar, o el nuevo número de pax para actualizar:` );
      if (action) {
        if (action.toUpperCase() === 'B') {
          await deleteDoc(doc(db, 'tables', existingTable.id));
          setTables(tables.filter(t => t.id !== existingTable.id));
        } else {
          const cap = parseInt(action);
          if (!isNaN(cap) && cap > 0) {
            await updateDoc(doc(db, 'tables', existingTable.id), { capacity: cap });
            setTables(tables.map(t => t.id === existingTable.id ? { ...t, capacity: cap } : t));
          }
        }
      }
    } else {
      // Add new table
      const pax = window.prompt("¿Cuántos comensales (pax) para esta mesa nueva?");
      const capacity = parseInt(pax);
      if (!isNaN(capacity) && capacity > 0) {
        // Calculate next label
        const zoneTables = tables.filter(t => t.zoneId === selectedZone.id);
        const nextNum = zoneTables.length + 1;
        const newTable = {
          zoneId: selectedZone.id,
          label: `${selectedZone.prefix}${nextNum}`,
          capacity: capacity,
          gridX: x,
          gridY: y
        };
        const docRef = await addDoc(collection(db, 'tables'), newTable);
        setTables([...tables, { id: docRef.id, ...newTable }]);
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando Zonas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestión de Zonas y Mesas</h2>
          <p className="text-sm text-gray-500">Diseña el plano del restaurante y crea las mesas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left Column: Zones List */}
        <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Zonas del Local</h3>
          
          <div className="space-y-2 mb-6">
            {zones.map(z => (
              <div 
                key={z.id}
                onClick={() => setSelectedZone(z)}
                className={`flex justify-between items-center p-3 rounded-xl cursor-pointer transition-colors border ${selectedZone?.id === z.id ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-700'}`}
              >
                <div>
                  <div className="font-semibold text-sm">{z.name}</div>
                  <div className="text-xs opacity-70">Prefijo: {z.prefix}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteZone(z.id); }} className="p-1 hover:text-red-500 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Añadir Nueva Zona</h4>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Nombre (ej. Terraza)" 
                className="w-full p-2 border rounded-lg text-sm"
                value={newZone.name}
                onChange={e => setNewZone({...newZone, name: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Prefijo (ej. T)" 
                className="w-full p-2 border rounded-lg text-sm uppercase"
                maxLength={2}
                value={newZone.prefix}
                onChange={e => setNewZone({...newZone, prefix: e.target.value.toUpperCase()})}
              />
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Ancho (grid)" 
                  className="w-full p-2 border rounded-lg text-sm"
                  min="2" max="10"
                  value={newZone.gridWidth}
                  onChange={e => setNewZone({...newZone, gridWidth: parseInt(e.target.value)})}
                />
                <input 
                  type="number" 
                  placeholder="Alto (grid)" 
                  className="w-full p-2 border rounded-lg text-sm"
                  min="2" max="10"
                  value={newZone.gridHeight}
                  onChange={e => setNewZone({...newZone, gridHeight: parseInt(e.target.value)})}
                />
              </div>
              <button 
                onClick={handleAddZone}
                className="w-full bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Crear Zona
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Grid Designer */}
        <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          {selectedZone ? (
            <div className="flex flex-col items-center">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-bold text-gray-900">Diseño: {selectedZone.name}</h3>
                <p className="text-sm text-gray-500">Haz clic en una celda para añadir, editar o borrar una mesa</p>
              </div>

              {/* Grid Canvas */}
              <div 
                className="bg-gray-100 p-4 rounded-xl border border-dashed border-gray-300"
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: `repeat(${selectedZone.gridWidth}, minmax(0, 1fr))`,
                  gap: '12px'
                }}
              >
                {Array.from({ length: selectedZone.gridHeight }).map((_, y) => (
                  Array.from({ length: selectedZone.gridWidth }).map((_, x) => {
                    const table = tables.find(t => t.zoneId === selectedZone.id && t.gridX === x && t.gridY === y);
                    
                    return (
                      <div 
                        key={`${x}-${y}`}
                        onClick={() => handleGridClick(x, y)}
                        className={`w-20 h-20 sm:w-24 sm:h-24 flex flex-col items-center justify-center cursor-pointer transition-all ${
                          table 
                            ? 'bg-red-100 border-2 border-red-500 shadow-sm' 
                            : 'bg-white border border-gray-200 hover:bg-red-50'
                        }`}
                        style={{
                          borderRadius: table?.capacity === 4 ? '50%' : table?.capacity > 4 ? '12px' : '4px'
                        }}
                      >
                        {table ? (
                          <>
                            <span className="font-bold text-lg text-red-900">{table.label}</span>
                            <span className="text-xs text-red-600 font-semibold">{table.capacity} pax</span>
                          </>
                        ) : (
                          <Plus className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12">
              <LayoutGrid className="w-16 h-16 mb-4 opacity-50" />
              <p>Selecciona o crea una zona para empezar a diseñar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZonesManager;
