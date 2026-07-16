import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/customer/Navbar';
import Hero from '../components/customer/Hero';
import MenuGrid from '../components/customer/MenuGrid';
import FullMenu from '../components/customer/FullMenu';
import CartDrawer from '../components/customer/CartDrawer';
import Footer from '../components/customer/Footer';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { forceSeedProducts } from '../firebase/seed';
import { ArrowLeft, MenuSquare, ArrowRight } from 'lucide-react';

const CustomerWeb = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderType, setOrderType] = useState('delivery');

  const emptyCart = () => setCart([]);
  
  // 'home' o nombre de la categoría (ej: 'Pizzas', 'Entrantes')
  const [viewState, setViewState] = useState('home'); 

  // Referencia para scroll suave
  const menuSectionRef = useRef(null);

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
      setLoading(false); // Consider it loaded once settings come through (or after first batch)
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

  // Categorías ya se cargan de Firebase, eliminamos la lógica derivada

  const handleViewMenuFromHome = () => {
    setViewState('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCategory = (catName) => {
    // Cuando hacen click en una categoría de la home, abrimos el menú
    // En FullMenu.jsx el scroll spy o un prop podría hacer scroll, 
    // pero por ahora abrimos la carta entera.
    setViewState('menu');
    // Pequeño timeout para dar tiempo a renderizar
    setTimeout(() => {
      const el = document.getElementById(`category-${catName}`);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 140;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen font-sans relative flex flex-col">
      <Navbar cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} onCartClick={() => setIsCartOpen(true)} globalSettings={globalSettings} />
      
      {viewState === 'home' ? (
        <main className="flex-1">
          <Hero onViewMenu={handleViewMenuFromHome} orderType={orderType} setOrderType={setOrderType} globalSettings={globalSettings} />
          
          {/* Storytelling Section 1: Concept */}
          <section className="py-24 text-center px-4 bg-zinc-900 bg-noise">
            <div className="relative max-w-3xl mx-auto z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight">
                Un sabor con <span className="text-red-600">carácter</span>
              </h2>
              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-light">
                Inspirada en el auténtico estilo callejero de la ciudad de Nueva York, 
                pero meticulosamente adaptada para disfrutarla aquí, con ingredientes frescos y locales.
              </p>
            </div>
          </section>
          
          {/* Categories Section */}
          <section ref={menuSectionRef} className="py-24 bg-[#111] bg-noise">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 z-10">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight">Nuestra Carta</h2>
                <div className="w-24 h-1 bg-red-600 mx-auto mt-6"></div>
              </div>
              
              {loading ? (
                 <div className="text-center py-20">
                   <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                   <p className="text-gray-500 font-medium">Cargando...</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {categories.map(cat => (
                    <div 
                      key={cat.name} 
                      onClick={() => handleOpenCategory(cat.name)}
                      className="group cursor-pointer relative aspect-square rounded-3xl overflow-hidden shadow-2xl"
                    >
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                        <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-widest drop-shadow-2xl group-hover:scale-110 transition-transform duration-500">
                          {cat.name}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Storytelling Section 2: Artesanal */}
          <section className="py-0 flex flex-col md:flex-row items-stretch bg-stone-900 bg-noise">
            <div className="w-full md:w-1/2 min-h-[400px] md:min-h-[600px] relative z-10">
              <img 
                src="/pizzaiolo.png" 
                alt="Elaboración de Pizza" 
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="w-full md:w-1/2 p-12 md:p-24 flex flex-col justify-center relative z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight">Masa madre,<br/>cada día</h2>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Nuestra masa se fermenta lentamente durante 48 horas. Sin atajos. 
                Extendida a mano al momento de tu pedido y horneada a la perfección 
                para conseguir ese borde crujiente y ese interior alveolado inconfundible.
              </p>
              <div>
                <button 
                  onClick={handleViewMenuFromHome}
                  className="inline-flex items-center gap-3 border-2 border-white text-white hover:bg-white hover:text-black font-bold uppercase tracking-wider py-4 px-8 rounded-full transition-colors shadow-xl"
                >
                  <MenuSquare className="w-5 h-5" />
                  Descubrir Menú
                </button>
              </div>
            </div>
          </section>

          {/* Storytelling Section 3: Más que Pizzas */}
          <section className="py-24 text-center px-4 bg-slate-900 bg-noise">
            <div className="relative max-w-4xl mx-auto z-10">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-8 uppercase tracking-tight">
                La experiencia es más que pizzas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                <div 
                  onClick={() => handleOpenCategory('Entrantes')}
                  className="relative h-64 rounded-3xl overflow-hidden group cursor-pointer shadow-2xl"
                >
                  <img src="https://images.unsplash.com/photo-1623341214825-9f4f963727da?q=80&w=800&auto=format&fit=crop" alt="Entrantes" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors duration-500 flex items-center justify-center">
                    <span className="text-3xl font-black text-white uppercase tracking-wider group-hover:scale-110 transition-transform duration-500">Entrantes</span>
                  </div>
                </div>
                <div 
                  onClick={() => handleOpenCategory('Bebidas')}
                  className="relative h-64 rounded-3xl overflow-hidden group cursor-pointer shadow-2xl"
                >
                  <img src="https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop" alt="Bebidas" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors duration-500 flex items-center justify-center">
                    <span className="text-3xl font-black text-white uppercase tracking-wider group-hover:scale-110 transition-transform duration-500">Bebidas</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </main>
      ) : viewState === 'menu' ? (
        <main className="flex-1">
          <FullMenu 
            categories={categories} 
            products={products} 
            onBack={() => setViewState('home')} 
            onAdd={addToCart} 
          />
        </main>
      ) : null}

      {/* Footer Fijo en todas las vistas */}
      <Footer />

      {/* Carrito */}
      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onEmptyCart={emptyCart}
        globalSettings={globalSettings}
        orderType={orderType}
        setOrderType={setOrderType}
      />

      {/* Botón oculto para forzar recarga de base de datos en caso de errores de estructura */}
      <button 
        onClick={forceSeedProducts}
        className="fixed bottom-2 left-2 text-[10px] text-gray-300 hover:text-gray-500 z-50 bg-black/50 px-2 py-1 rounded"
        title="Forzar actualización de BD (Alergenos e Ingredientes)"
      >
        DB Sync
      </button>
    </div>
  );
};

export default CustomerWeb;
