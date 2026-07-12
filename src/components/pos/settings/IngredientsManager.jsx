import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const IngredientsManager = () => {
  const [ingredients, setIngredients] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [activeTab, setActiveTab] = useState('ingredients');
  const [currentIng, setCurrentIng] = useState({ id: null, name: '', price: 0, isActive: true });
  const [currentAllergen, setCurrentAllergen] = useState({ id: null, name: '', icon: '' });
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ingSnap, allSnap] = await Promise.all([
        getDocs(collection(db, 'ingredients')),
        getDocs(collection(db, 'allergens'))
      ]);
      setIngredients(ingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => a.name.localeCompare(b.name)));
      setAllergens(allSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    if (!currentIng.name.trim()) return;
    try {
      const data = { name: currentIng.name, price: parseFloat(currentIng.price) || 0, isActive: currentIng.isActive };
      if (currentIng.id) await updateDoc(doc(db, 'ingredients', currentIng.id), data);
      else await addDoc(collection(db, 'ingredients'), data);
      setIsEditing(false);
      setCurrentIng({ id: null, name: '', price: 0, isActive: true });
      fetchData();
    } catch (error) { console.error(error); }
  };

  const handleSaveAllergen = async (e) => {
    e.preventDefault();
    if (!currentAllergen.name.trim()) return;
    try {
      const data = { name: currentAllergen.name, icon: currentAllergen.icon };
      if (currentAllergen.id) await updateDoc(doc(db, 'allergens', currentAllergen.id), data);
      else await addDoc(collection(db, 'allergens'), data);
      setIsEditing(false);
      setCurrentAllergen({ id: null, name: '', icon: '' });
      fetchData();
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (collectionName, id) => {
    if (!window.confirm("¿Borrar definitivamente?")) return;
    await deleteDoc(doc(db, collectionName, id));
    fetchData();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button onClick={() => { setActiveTab('ingredients'); setIsEditing(false); }} className={`pb-3 px-2 font-bold ${activeTab === 'ingredients' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}>Ingredientes / Extras</button>
        <button onClick={() => { setActiveTab('allergens'); setIsEditing(false); }} className={`pb-3 px-2 font-bold ${activeTab === 'allergens' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500'}`}>Alérgenos</button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">{activeTab === 'ingredients' ? 'Extras para Productos' : 'Lista de Alérgenos'}</h2>
        {!isEditing && (
          <button onClick={() => { 
            activeTab === 'ingredients' ? setCurrentIng({ id: null, name: '', price: 0, isActive: true }) : setCurrentAllergen({ id: null, name: '', icon: '' }); 
            setIsEditing(true); 
          }} className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold">
            <Plus className="w-4 h-4" /> Añadir Nuevo
          </button>
        )}
      </div>

      {isEditing && activeTab === 'ingredients' && (
        <form onSubmit={handleSaveIngredient} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-bold mb-1">Nombre</label><input type="text" value={currentIng.name} onChange={e=>setCurrentIng({...currentIng, name:e.target.value})} className="w-full p-2 border border-gray-300 rounded" required/></div>
          <div><label className="block text-sm font-bold mb-1">Precio Extra (€)</label><input type="number" step="0.10" value={currentIng.price} onChange={e=>setCurrentIng({...currentIng, price:e.target.value})} className="w-full p-2 border border-gray-300 rounded"/></div>
          <div className="flex items-center gap-2 mt-6">
            <input type="checkbox" checked={currentIng.isActive} onChange={e=>setCurrentIng({...currentIng, isActive:e.target.checked})} id="active_ing"/>
            <label htmlFor="active_ing" className="font-semibold">Disponible</label>
          </div>
          <div className="md:col-span-3 flex justify-end gap-2"><button type="button" onClick={()=>setIsEditing(false)} className="px-4 py-2 font-bold">Cancelar</button><button type="submit" className="px-4 py-2 bg-red-600 text-white rounded font-bold">Guardar</button></div>
        </form>
      )}

      {isEditing && activeTab === 'allergens' && (
        <form onSubmit={handleSaveAllergen} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-bold mb-1">Nombre</label><input type="text" value={currentAllergen.name} onChange={e=>setCurrentAllergen({...currentAllergen, name:e.target.value})} className="w-full p-2 border border-gray-300 rounded" required/></div>
          <div><label className="block text-sm font-bold mb-1">Icono / Emoji</label><input type="text" value={currentAllergen.icon} onChange={e=>setCurrentAllergen({...currentAllergen, icon:e.target.value})} className="w-full p-2 border border-gray-300 rounded" placeholder="Ej: 🌾" required/></div>
          <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={()=>setIsEditing(false)} className="px-4 py-2 font-bold">Cancelar</button><button type="submit" className="px-4 py-2 bg-red-600 text-white rounded font-bold">Guardar</button></div>
        </form>
      )}

      {loading ? <p>Cargando...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTab === 'ingredients' ? (
            ingredients.map(ing => (
              <div key={ing.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg group">
                <div>
                  <h4 className="font-bold text-gray-900">{ing.name}</h4>
                  <span className="text-xs font-semibold text-gray-500">+{ing.price.toFixed(2)}€ • {ing.isActive ? 'Activo' : 'Agotado'}</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={()=>{setCurrentIng(ing); setIsEditing(true);}} className="p-1.5 text-blue-600"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={()=>handleDelete('ingredients', ing.id)} className="p-1.5 text-red-600"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))
          ) : (
            allergens.map(all => (
              <div key={all.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{all.icon}</span>
                  <h4 className="font-bold text-gray-900">{all.name}</h4>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={()=>{setCurrentAllergen(all); setIsEditing(true);}} className="p-1.5 text-blue-600"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={()=>handleDelete('allergens', all.id)} className="p-1.5 text-red-600"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default IngredientsManager;
