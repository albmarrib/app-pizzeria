import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import FullMenu from '../customer/FullMenu';
import CartDrawer from '../customer/CartDrawer';
import { ShoppingCart } from 'lucide-react';

const ManualOrderPanel = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderType, setOrderType] = useState('mesa'); // Default for POS

  useEffect(() => {
    setLoading(true);
    
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a,b) => (a.order || 0) - (b.order || 0));
      setProducts(data);
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a,b) => (a.order || 0) - (b.order || 0));
      setCategories(data);
    });

    const unsubSettings = onSnapshot(collection(db, 'settings'), (snap) => {
      const settingsData = snap.docs.find(d => d.id === 'general')?.data() || {};
      setGlobalSettings(settingsData);
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSettings();
    };
  }, []);

  const addToCart = (productToAdd, openCart = true) => {
    setCart((prev) => {
      const existing = prev.find(item => item.cartItemId === productToAdd.cartItemId);
      if (existing) {
        return prev.map(item => 
          item.cartItemId === productToAdd.cartItemId ? { ...item, quantity: item.quantity + productToAdd.quantity } : item
        );
      }
      return [...prev, productToAdd];
    });
    if (openCart) {
      setIsCartOpen(true);
    }
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const emptyCart = () => setCart([]);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Cargando menú...</div>;
  }

  return (
    <div className="relative h-full overflow-hidden bg-gray-50 rounded-2xl border border-gray-200">
      <div className="h-full overflow-y-auto relative">
        <FullMenu 
          categories={categories} 
          products={products} 
          onAdd={addToCart}
          // No pasamos onBack para que no muestre el botón
        />
      </div>

      {/* Botón flotante para abrir el carrito si está cerrado */}
      {!isCartOpen && cartCount > 0 && (
        <button 
          onClick={() => setIsCartOpen(true)}
          className="absolute bottom-6 right-6 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-2xl transition-transform hover:scale-105 flex items-center gap-3 z-40"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="font-bold text-lg">{cartCount} items</span>
        </button>
      )}

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onEmptyCart={emptyCart}
        globalSettings={globalSettings}
        orderType={orderType}
        setOrderType={setOrderType}
        isPosMode={true} // Indicamos que estamos en modo manual del restaurante
      />
    </div>
  );
};

export default ManualOrderPanel;
