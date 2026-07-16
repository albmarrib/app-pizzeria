import React, { useState, useEffect } from 'react';
import { X, Wheat, Milk, Egg, Info } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Fallback manual si no encontramos el icono
const getDefaultIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes('gluten')) return <Wheat className="w-4 h-4" />;
  if (n.includes('lacteo') || n.includes('leche') || n.includes('queso')) return <Milk className="w-4 h-4" />;
  if (n.includes('huevo')) return <Egg className="w-4 h-4" />;
  return <Info className="w-4 h-4" />;
};

const ProductModal = ({ product, onClose, onAdd }) => {
  const [addedExtras, setAddedExtras] = useState(new Set());
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(product.price);
  
  // Datos del SaaS
  const [allAllergens, setAllAllergens] = useState([]);
  const [availableExtras, setAvailableExtras] = useState([]);

  useEffect(() => {
    const unsubAll = onSnapshot(collection(db, 'allergens'), (snap) => {
      setAllAllergens(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubIng = onSnapshot(collection(db, 'ingredients'), (snap) => {
      setAvailableExtras(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => i.isActive));
    });
    
    return () => {
      unsubAll();
      unsubIng();
    };
  }, []);

  useEffect(() => {
    let extrasPrice = 0;
    addedExtras.forEach(extraId => {
      const extra = availableExtras.find(e => e.id === extraId);
      if (extra) extrasPrice += extra.price;
    });
    setTotalPrice((product.price + extrasPrice) * quantity);
  }, [addedExtras, quantity, product, availableExtras]);

  const handleToggleExtra = (extraName) => {
    setAddedExtras(prev => {
      const newSet = new Set(prev);
      if (newSet.has(extraName)) {
        newSet.delete(extraName);
      } else {
        newSet.add(extraName);
      }
      return newSet;
    });
  };

  const handleAddToCart = (openCart) => {
    // Generate a unique ID for this specific configuration
    const configId = `${product.id}-${Array.from(addedExtras).sort().join('-')}`;
    
    let modifiersText = [];
    if (addedExtras.size > 0) {
      const extraNames = Array.from(addedExtras).map(id => availableExtras.find(e=>e.id===id)?.name).filter(Boolean);
      modifiersText.push(`Extra: ${extraNames.join(', ')}`);
    }

    const productToAdd = {
      ...product,
      cartItemId: configId, // distinct identifier for cart grouping
      price: totalPrice / quantity, // Base price of this configuration
      quantity: quantity,
      modifiers: modifiersText.join(' | ')
    };

    onAdd(productToAdd, openCart);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white sm:rounded-3xl rounded-t-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        {/* Header Image */}
        <div className="relative h-64 sm:h-72 bg-gray-100 flex-shrink-0">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black shadow-sm transition-all">
            <X className="w-6 h-6" />
          </button>
          <div className="absolute bottom-6 left-6 right-6">
            <h2 className="text-3xl font-black text-white leading-tight drop-shadow-md mb-1">{product.name}</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
          <p className="text-gray-600 text-lg mb-6 leading-relaxed">{product.description}</p>
          
          {/* Alergenos (SaaS based o Legacy) */}
          {((product.allergenIds && product.allergenIds.length > 0) || (product.allergens && product.allergens.length > 0)) && (
            <div className="mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Información de Alérgenos</h3>
              <div className="flex flex-wrap gap-2">
                {product.allergenIds?.map(allId => {
                  const al = allAllergens.find(a => a.id === allId);
                  if (!al) {
                    return (
                      <div key={allId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold bg-yellow-50 border-yellow-200 text-yellow-800" title="Alérgeno no encontrado en base de datos">
                        <span>⚠️</span>
                        <span className="capitalize">Sincronizando...</span>
                      </div>
                    );
                  }
                  return (
                    <div key={al.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold bg-gray-50 border-gray-200 text-gray-800">
                      <span>{al.icon || getDefaultIcon(al.name)}</span>
                      <span className="capitalize">{al.name}</span>
                    </div>
                  );
                })}
                {/* Fallback para productos antiguos sin migrar */}
                {!product.allergenIds && product.allergens?.map(alName => (
                  <div key={alName} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold bg-gray-50 border-gray-200 text-gray-800">
                    <span>{getDefaultIcon(alName)}</span>
                    <span className="capitalize">{alName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredientes Base (Display Only) */}
          {product.baseIngredients && (
            <div className="mb-8">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3 pl-2">Ingredientes</h3>
              <p className="text-gray-600 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">{product.baseIngredients}</p>
            </div>
          )}

          {/* Extras del SaaS */}
          {product.customizable === true && availableExtras.length > 0 && (
            <div className="mb-6">
              <details className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none font-black text-gray-900 uppercase tracking-widest text-sm">
                  <span>Añadir ingredientes opcionales</span>
                  <span className="transition group-open:rotate-180">
                    <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                  </span>
                </summary>
                <div className="p-2 pt-0 space-y-2 border-t border-gray-100">
                  {availableExtras.map(extra => (
                    <label key={extra.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group/item">
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-gray-700 group-hover/item:text-black">{extra.name}</span>
                        <span className="text-sm font-bold text-red-600">+{extra.price.toFixed(2)}€</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-6 h-6 text-black rounded border-gray-300 focus:ring-black transition-all"
                        checked={addedExtras.has(extra.id)}
                        onChange={() => handleToggleExtra(extra.id)}
                      />
                    </label>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex w-full sm:w-auto items-center justify-center bg-gray-100 rounded-2xl p-1.5 shadow-inner">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 flex items-center justify-center text-xl text-gray-600 hover:bg-white hover:text-black hover:shadow-md rounded-xl transition-all"
              >
                -
              </button>
              <span className="w-12 text-center text-lg font-black">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 flex items-center justify-center text-xl text-gray-600 hover:bg-white hover:text-black hover:shadow-md rounded-xl transition-all"
              >
                +
              </button>
            </div>
            
            <div className="flex flex-col w-full sm:flex-row gap-2 sm:gap-4 flex-1">
              <button 
                onClick={() => handleAddToCart(false)}
                className="flex-1 bg-white hover:bg-gray-50 text-black border-2 border-black font-black text-sm py-3 sm:py-4 rounded-2xl transition-all flex items-center justify-center"
              >
                Añadir y seguir comprando
              </button>
              <button 
                onClick={() => handleAddToCart(true)}
                className="flex-1 bg-black hover:bg-gray-900 text-white font-black text-sm py-3 sm:py-4 rounded-2xl shadow-xl shadow-black/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Añadir e ir a pagar</span>
                <span className="w-1.5 h-1.5 bg-white/30 rounded-full hidden sm:block"></span>
                <span className="hidden sm:inline">{totalPrice.toFixed(2)}€</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
