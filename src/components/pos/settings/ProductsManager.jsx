import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebase/config';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const ProductsManager = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentProd, setCurrentProd] = useState({ 
    id: null, name: '', description: '', price: 0, taxRate: 10, category: '', sectionId: '', imageUrl: '', 
    order: 0, baseIngredients: '', allergenIds: [], customizable: false, outOfStock: false
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodSnap, catSnap, allSnap, secSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'allergens')),
        getDocs(collection(db, 'preparation_sections'))
      ]);
      
      const cats = catSnap.docs.map(d => d.data().name);
      setCategories(cats);
      setAllergens(allSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSections(secSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
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
        taxRate: parseFloat(currentProd.taxRate) || 10,
        category: currentProd.category,
        sectionId: currentProd.sectionId || '',
        imageUrl: currentProd.imageUrl,
        order: parseInt(currentProd.order) || 0,
        baseIngredients: currentProd.baseIngredients || '',
        allergenIds: currentProd.allergenIds || [],
        customizable: currentProd.customizable ?? true,
        outOfStock: currentProd.outOfStock || false
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      
      // Añadimos un timeout de 10 segundos por si Firebase Storage no está configurado
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Tiempo de espera agotado. Verifica que Firebase Storage está habilitado y las reglas permiten escritura.")), 10000)
      );

      const snapshot = await Promise.race([
        uploadBytes(storageRef, file),
        timeoutPromise
      ]);

      const downloadURL = await getDownloadURL(snapshot.ref);
      setCurrentProd(prev => ({ ...prev, imageUrl: downloadURL }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error al subir: " + (error.message || "Verifica Firebase Storage."));
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Limpiar el input file
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Gestión de Carta (Productos)</h2>
        {!isEditing && (
          <button onClick={() => { 
            setCurrentProd({ id: null, name: '', description: '', price: 0, category: categories[0] || '', sectionId: '', imageUrl: '', order: 0, baseIngredients: '', allergenIds: [], customizable: true }); 
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1">Precio (€)</label>
                <input type="number" step="0.10" value={currentProd.price} onChange={e => setCurrentProd({...currentProd, price: e.target.value})} className="w-full p-2 rounded-lg border border-gray-300" required />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">IVA (%)</label>
                <select value={currentProd.taxRate || 10} onChange={e => setCurrentProd({...currentProd, taxRate: e.target.value})} className="w-full p-2 rounded-lg border border-gray-300">
                  <option value="10">10% (Comida)</option>
                  <option value="21">21% (Bebidas/Alcohol)</option>
                  <option value="4">4% (Súper reducido)</option>
                  <option value="0">0% (Exento)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Categoría</label>
              <select value={currentProd.category} onChange={e=>setCurrentProd({...currentProd, category:e.target.value})} className="w-full p-2 border border-gray-300 rounded" required>
                <option value="">Selecciona...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Sección de Preparación</label>
              <select value={currentProd.sectionId || ''} onChange={e=>setCurrentProd({...currentProd, sectionId:e.target.value})} className="w-full p-2 border border-gray-300 rounded" required>
                <option value="">Selecciona...</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <div>
              <label className="block text-sm font-bold mb-1 text-red-600">Agotado Temporalmente</label>
              <div className="mt-2">
                <input type="checkbox" checked={currentProd.outOfStock} onChange={e=>setCurrentProd({...currentProd, outOfStock:e.target.checked})} id="oos"/>
                <label htmlFor="oos" className="ml-2 font-medium text-red-600">Sí (Bloquear en web)</label>
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-bold mb-1">Imagen (Sube un archivo o introduce URL)</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="file" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleImageUpload} 
                  disabled={uploadingImage}
                  className="w-full sm:w-1/2 p-2 border border-gray-300 rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" 
                />
                <input 
                  type="text" 
                  value={currentProd.imageUrl} 
                  onChange={e=>setCurrentProd({...currentProd, imageUrl:e.target.value})} 
                  className="w-full sm:w-1/2 p-2 border border-gray-300 rounded" 
                  placeholder="O introduce una URL: https://..."
                />
              </div>
              {uploadingImage && <p className="text-sm text-red-600 mt-1">Subiendo imagen...</p>}
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
            <button type="submit" disabled={uploadingImage} className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 disabled:opacity-50">Guardar Producto</button>
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
                    <div key={p.id} onClick={()=>{setCurrentProd(p); setIsEditing(true);}} className={`flex p-3 border rounded-xl hover:bg-gray-50 group transition-colors cursor-pointer ${p.outOfStock ? 'bg-red-50/50 border-red-100 opacity-70' : 'bg-gray-50/50 border-gray-100'}`}>
                      <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden shrink-0 mr-3 relative">
                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover"/>}
                        {p.outOfStock && <div className="absolute inset-0 bg-red-600/50 flex items-center justify-center text-[8px] font-black text-white px-1 text-center">AGOTADO</div>}
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-900 leading-none">{p.name} {p.outOfStock && <span className="text-red-600 text-xs ml-1">(Agotado)</span>}</h4>
                          <span className="font-bold text-gray-900">{p.price.toFixed(2)}€</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{p.baseIngredients || p.description}</p>
                        <p className="text-[10px] text-gray-400">IVA {p.taxRate || 10}%</p>
                        {p.sectionId && (
                          <div className="mt-1 flex">
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              {sections.find(s => s.id === p.sectionId)?.name || 'Sección desconocida'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e)=>{e.stopPropagation(); handleDelete(p.id);}} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
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
