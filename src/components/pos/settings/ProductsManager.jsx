import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const ProductsManager = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentProd, setCurrentProd] = useState({ 
    id: null, name: '', description: '', price: 0, category: '', imageUrl: '', 
    order: 0, baseIngredients: '', allergenIds: [], customizable: true 
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodSnap, catSnap, allSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'allergens'))
      ]);
      
      const cats = catSnap.docs.map(d => d.data().name);
      setCategories(cats);
      setAllergens(allSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => ((a.category || '').localeCompare(b.category || '')) || ((a.order || 0) - (b.order || 0))));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentProd.name.trim() || !currentProd.category) return alert('Nombre y categoría obligatorios');
    
    try {
      const data = {
        name: currentProd.name,
        description: currentProd.description,
        price: parseFloat(currentProd.price) || 0,
        category: currentProd.category,
        imageUrl: currentProd.imageUrl,
        order: parseInt(currentProd.order) || 0,
        baseIngredients: currentProd.baseIngredients || '',
        allergenIds: currentProd.allergenIds || [],
        customizable: currentProd.customizable ?? true
      };

      if (currentProd.id) {
        await updateDoc(doc(db, 'products', currentProd.id), data);
      } else {
        await addDoc(collection(db, 'products'), data);
      }
      
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres borrar este producto?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchData();
    } catch (error) { console.error(error); }
  };

  const toggleAllergen = (allId) => {
    setCurrentProd(prev => {
      const ids = prev.allergenIds || [];
      return { ...prev, allergenIds: ids.includes(allId) ? ids.filter(id => id !== allId) : [...ids, allId] };
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Gestión de Carta (Productos)</h2>
        {!isEditing && (
          <button onClick={() => { 
            setCurrentProd({ id: null, name: '', description: '', price: 0, category: categories[0] || '', imageUrl: '', order: 0, baseIngredients: '', allergenIds: [], customizable: true }); 
            setIsEditing(true); 
          }} className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold">
            <Plus className="w-4 h-4" /> Añadir Producto
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">Nombre del producto</label>
              <input type="text" value={currentProd.name} onChange={e=>setCurrentProd({...currentProd, name:e.target.value})} className="w-full p-2 border border-gray-300 rounded" required/>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Precio (€)</label>
              <input type="number" step="0.10" value={currentProd.price} onChange={e=>setCurrentProd({...currentProd, price:e.target.value})} className="w-full p-2 border border-gray-300 rounded" required/>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Categoría</label>
              <select value={currentProd.category} onChange={e=>setCurrentProd({...currentProd, category:e.target.value})} className="w-full p-2 border border-gray-300 rounded" required>
                <option value="">Selecciona...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Orden relativo</label>
              <input type="number" value={currentProd.order} onChange={e=>setCurrentProd({...currentProd, order:e.target.value})} className="w-full p-2 border border-gray-300 rounded"/>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Permitir Extras</label>
              <div className="mt-2">
                <input type="checkbox" checked={currentProd.customizable} onChange={e=>setCurrentProd({...currentProd, customizable:e.target.checked})} id="cust"/>
                <label htmlFor="cust" className="ml-2 font-medium">Sí</label>
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-bold mb-1">URL de la Imagen (cuadrada idealmente)</label>
              <input type="text" value={currentProd.imageUrl} onChange={e=>setCurrentProd({...currentProd, imageUrl:e.target.value})} className="w-full p-2 border border-gray-300 rounded" placeholder="https://..."/>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-bold mb-1">Descripción corta (Aparece bajo la foto en el menú)</label>
              <textarea value={currentProd.description} onChange={e=>setCurrentProd({...currentProd, description:e.target.value})} className="w-full p-2 border border-gray-300 rounded resize-none" rows="2" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-bold mb-1">Ingredientes Base (Aparecen al abrir el detalle de la pizza)</label>
              <textarea value={currentProd.baseIngredients} onChange={e=>setCurrentProd({...currentProd, baseIngredients:e.target.value})} className="w-full p-2 border border-gray-300 rounded resize-none" rows="2" />
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-sm font-bold mb-2">Alérgenos que contiene</label>
              <div className="flex flex-wrap gap-2">
                {allergens.map(all => {
                  const isActive = (currentProd.allergenIds || []).includes(all.id);
                  return (
                    <button type="button" key={all.id} onClick={() => toggleAllergen(all.id)} className={`cursor-pointer px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${isActive ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                      {all.icon} {all.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
            <button type="button" onClick={()=>setIsEditing(false)} className="px-4 py-2 font-bold text-gray-500">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Guardar Producto</button>
          </div>
        </form>
      )}

      {loading ? <p>Cargando productos...</p> : (
        <div className="space-y-6">
          {categories.map(cat => {
            const catProds = products.filter(p => p.category === cat);
            if (catProds.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-3">{cat}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {catProds.map(p => (
                    <div key={p.id} className="flex p-3 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 group transition-colors">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0 mr-3">
                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover"/>}
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-900 leading-none">{p.name}</h4>
                          <span className="font-bold text-gray-900">{p.price.toFixed(2)}€</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{p.baseIngredients || p.description}</p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>{setCurrentProd(p); setIsEditing(true);}} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={()=>handleDelete(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default ProductsManager;
