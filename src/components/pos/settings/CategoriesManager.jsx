import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';

const CategoriesManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCat, setCurrentCat] = useState({ id: null, name: '', imageUrl: '', order: 0 });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentCat.name.trim()) return;
    
    try {
      if (currentCat.id) {
        const docRef = doc(db, 'categories', currentCat.id);
        await updateDoc(docRef, { name: currentCat.name, imageUrl: currentCat.imageUrl, order: parseInt(currentCat.order) || 0 });
      } else {
        await addDoc(collection(db, 'categories'), { name: currentCat.name, imageUrl: currentCat.imageUrl, order: parseInt(currentCat.order) || 0 });
      }
      setIsEditing(false);
      setCurrentCat({ id: null, name: '', imageUrl: '', order: 0 });
      fetchCategories();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres borrar esta categoría? Los productos asociados podrían quedar huérfanos.")) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      fetchCategories();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Gestión de Categorías</h2>
        {!isEditing && (
          <button onClick={() => { setCurrentCat({ id: null, name: '', imageUrl: '', order: categories.length }); setIsEditing(true); }} className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold">
            <Plus className="w-4 h-4" /> Añadir Categoría
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold mb-1">Nombre</label>
              <input type="text" value={currentCat.name} onChange={e => setCurrentCat({...currentCat, name: e.target.value})} className="w-full p-2 rounded-lg border border-gray-300" required />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Orden (Ej: 0, 1, 2)</label>
              <input type="number" value={currentCat.order} onChange={e => setCurrentCat({...currentCat, order: e.target.value})} className="w-full p-2 rounded-lg border border-gray-300" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">URL Imagen (Para portada)</label>
              <input type="text" value={currentCat.imageUrl} onChange={e => setCurrentCat({...currentCat, imageUrl: e.target.value})} className="w-full p-2 rounded-lg border border-gray-300" placeholder="https://..." />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Guardar</button>
          </div>
        </form>
      ) : null}

      {loading ? <p>Cargando...</p> : (
        <div className="space-y-2">
          {categories.length === 0 && <p className="text-gray-500 text-sm">No hay categorías. Crea una.</p>}
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 group">
              <div className="flex items-center gap-4">
                <GripVertical className="text-gray-300 w-5 h-5 cursor-move" />
                {cat.imageUrl && <img src={cat.imageUrl} alt={cat.name} className="w-12 h-12 rounded object-cover" />}
                <div>
                  <h4 className="font-bold text-gray-900">{cat.name}</h4>
                  <p className="text-xs text-gray-500">Orden: {cat.order || 0}</p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setCurrentCat(cat); setIsEditing(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesManager;
