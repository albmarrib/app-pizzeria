import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';

const SectionsManager = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSec, setCurrentSec] = useState({ id: null, name: '', columnsStr: 'Pendiente, Preparando, Listo' });

  const fetchSections = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'preparation_sections'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort alphabetically or by creation
      data.sort((a, b) => a.name.localeCompare(b.name));
      setSections(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentSec.name.trim()) return;
    
    // Parse columns from string
    const cols = currentSec.columnsStr.split(',').map(c => c.trim()).filter(c => c);
    if (cols.length === 0) cols.push('Pendiente', 'Listo'); // fallback

    try {
      if (currentSec.id) {
        const docRef = doc(db, 'preparation_sections', currentSec.id);
        await updateDoc(docRef, { name: currentSec.name, columns: cols });
      } else {
        await addDoc(collection(db, 'preparation_sections'), { name: currentSec.name, columns: cols });
      }
      setIsEditing(false);
      setCurrentSec({ id: null, name: '', columnsStr: 'Pendiente, Preparando, Listo' });
      fetchSections();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres borrar esta sección? Los productos asignados a ella quedarán sin sección de preparación.")) return;
    try {
      await deleteDoc(doc(db, 'preparation_sections', id));
      fetchSections();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Gestión de Secciones de Preparación</h2>
        {!isEditing && (
          <button onClick={() => { setCurrentSec({ id: null, name: '', columnsStr: 'Pendiente, Preparando, Listo' }); setIsEditing(true); }} className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold">
            <Plus className="w-4 h-4" /> Añadir Sección
          </button>
        )}
      </div>

      <p className="text-gray-500 text-sm mb-6">Define las diferentes zonas de tu local donde se preparan los pedidos (ej. Horno, Bar, Cocina Fría). Luego podrás asignar cada producto a una sección.</p>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-bold mb-1">Nombre de la Sección</label>
            <input type="text" value={currentSec.name} onChange={e => setCurrentSec({...currentSec, name: e.target.value})} className="w-full p-2 rounded-lg border border-gray-300" required placeholder="Ej. Horno" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-bold mb-1">Columnas / Fases de Preparación</label>
            <input type="text" value={currentSec.columnsStr} onChange={e => setCurrentSec({...currentSec, columnsStr: e.target.value})} className="w-full p-2 rounded-lg border border-gray-300" placeholder="Ej. Recibido, Amasando, En Horno, Listo" />
            <p className="text-xs text-gray-500 mt-1">Separa los nombres de las columnas por comas. El último estado será el que marque que el producto está terminado para ensamblar.</p>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Guardar</button>
          </div>
        </form>
      ) : null}

      {loading ? <p>Cargando...</p> : (
        <div className="space-y-2">
          {sections.length === 0 && <p className="text-gray-500 text-sm">No hay secciones. Crea una.</p>}
          {sections.map(sec => (
            <div key={sec.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 group">
              <div className="flex items-center gap-4">
                <GripVertical className="text-gray-300 w-5 h-5 cursor-move" />
                <div>
                  <h4 className="font-bold text-gray-900">{sec.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Fases: {(sec.columns || ['Pendiente', 'Preparando', 'Listo']).join(' ➔ ')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setCurrentSec({ ...sec, columnsStr: (sec.columns || []).join(', ') }); setIsEditing(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(sec.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SectionsManager;
