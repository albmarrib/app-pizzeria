import React, { useState } from 'react';
import { MapPin, Clock, MenuSquare } from 'lucide-react';

const Hero = ({ onViewMenu, orderType, setOrderType, globalSettings }) => {
  const pizzeriaName = globalSettings?.pizzeriaName || "Slice Pizza";
  const nameParts = pizzeriaName.split(' ');
  const firstName = nameParts[0];
  const restName = nameParts.slice(1).join(' ');

  return (
    <div className="relative bg-black h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image - Very dark for high contrast */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2000&auto=format&fit=crop" 
          alt="Slice Pizza Hero" 
          className="w-full h-full object-cover opacity-80 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center mt-12">
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter mb-4 drop-shadow-2xl uppercase">
          {firstName} <span className="text-red-600">{restName}</span>
        </h1>
        
        {/* Type Selector (Smaller) */}
        <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl flex flex-row gap-1 w-full max-w-md mx-auto border border-white/20 mb-8">
          <button 
            onClick={() => setOrderType('delivery')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${
              orderType === 'delivery' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/40' 
                : 'text-white hover:bg-white/20'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Entrega a Domicilio
          </button>
          <button 
            onClick={() => setOrderType('pickup')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-300 ${
              orderType === 'pickup' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/40' 
                : 'text-white hover:bg-white/20'
            }`}
          >
            <Clock className="w-4 h-4" />
            Recoger en tienda
          </button>
        </div>

        {/* Call to action to view the menu */}
        <button 
          onClick={onViewMenu}
          className="bg-white text-black hover:bg-gray-100 font-black uppercase tracking-wider py-4 px-10 rounded-full flex items-center gap-3 shadow-2xl transition-transform hover:scale-105"
        >
          <MenuSquare className="w-5 h-5" />
          Ver Nuestra Carta
        </button>
      </div>
    </div>
  );
};

export default Hero;
