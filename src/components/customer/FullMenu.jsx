import React, { useEffect, useState } from 'react';
import { ArrowLeft, Pizza, CupSoda, Coffee, Utensils, IceCream, CakeSlice } from 'lucide-react';
import MenuGrid from './MenuGrid';

// Utility to get a corresponding icon based on category name
const getCategoryIcon = (catName) => {
  const name = catName.toLowerCase();
  if (name.includes('pizza')) return <Pizza className="w-5 h-5" />;
  if (name.includes('bebida') || name.includes('drink')) return <CupSoda className="w-5 h-5" />;
  if (name.includes('postre') || name.includes('dulce')) return <CakeSlice className="w-5 h-5" />;
  if (name.includes('entrante') || name.includes('starter')) return <Utensils className="w-5 h-5" />;
  if (name.includes('cafe') || name.includes('coffee')) return <Coffee className="w-5 h-5" />;
  return <Utensils className="w-5 h-5" />; // default
};

const FullMenu = ({ categories, products, onBack, onAdd }) => {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.name || '');

  // Opcional: Implementar scroll spy para cambiar la categoría activa automáticamente
  useEffect(() => {
    const handleScroll = () => {
      const sections = categories.map(cat => document.getElementById(`category-${cat.name}`));
      let current = activeCategory;
      
      // Encontramos la sección que está más visible en pantalla
      for (const section of sections) {
        if (section) {
          const rect = section.getBoundingClientRect();
          // Si la parte superior de la sección está cerca del sticky nav (offset ~150px)
          if (rect.top <= 200 && rect.bottom >= 200) {
            current = section.id.replace('category-', '');
            break;
          }
        }
      }
      
      if (current !== activeCategory) {
        setActiveCategory(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, activeCategory]);

  const scrollToCategory = (catName) => {
    const el = document.getElementById(`category-${catName}`);
    if (el) {
      // Ajustamos el scroll teniendo en cuenta la altura del sticky nav (aprox 140px con navbar)
      const y = el.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveCategory(catName);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Cabecera para volver */}
      {onBack && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-black font-bold transition-colors bg-white border border-gray-200 py-2 px-4 rounded-full shadow-sm hover:shadow"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a inicio
          </button>
        </div>
      )}

      {/* Sticky Category Nav */}
      <div className="sticky top-16 z-30 bg-white shadow-sm border-b border-gray-100 overflow-x-auto hide-scrollbar">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-4 min-w-max">
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => scrollToCategory(cat.name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all duration-300 whitespace-nowrap
                ${activeCategory === cat.name 
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {getCategoryIcon(cat.name)}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido del Menú por Secciones */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-16">
        {categories.map((cat) => (
          <section key={cat.name} id={`category-${cat.name}`} className="scroll-mt-40">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-tight">{cat.name}</h2>
              <div className="flex-1 h-1 bg-gray-200 rounded-full"></div>
            </div>
            
            <MenuGrid 
              products={products.filter(p => p.category === cat.name)} 
              onAdd={onAdd} 
            />
          </section>
        ))}
      </div>
    </div>
  );
};

export default FullMenu;
