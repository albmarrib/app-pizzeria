import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../firebase/config';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';

const CategoriesManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCat, setCurrentCat] = useState({ id: null, name: '', imageUrl: '', order: 0 });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `categories/${Date.now()}_${file.name}`);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Tiempo de espera agotado. Verifica que Firebase Storage está habilitado y las reglas permiten escritura.")), 10000)
      );

      const snapshot = await Promise.race([
        uploadBytes(storageRef, file),
        timeoutPromise
      ]);

      const downloadURL = await getDownloadURL(snapshot.ref);
      setCurrentCat(prev => ({ ...prev, imageUrl: downloadURL }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error al subir: " + (error.message || "Verifica Firebase Storage."));
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

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
                  value={currentCat.imageUrl} 
                  onChange={e => setCurrentCat({...currentCat, imageUrl: e.target.value})} 
                  className="w-full sm:w-1/2 p-2 rounded-lg border border-gray-300" 
                  placeholder="O introduce una URL: https://..." 
                />
              </div>
              {uploadingImage && <p className="text-sm text-red-600 mt-1">Subiendo imagen...</p>}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-lg">Cancelar</button>
            <button type="submit" disabled={uploadingImage} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">Guardar</button>
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
