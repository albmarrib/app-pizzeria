import React from 'react';
import { Plus } from 'lucide-react';

const ProductCard = ({ product, onClick }) => {
  return (
    <div 
      onClick={product.outOfStock ? undefined : onClick}
      className={`bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group flex flex-row h-40 sm:h-48 relative ${product.outOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300'}`}
    >
      {product.outOfStock && (
        <div className="absolute inset-0 bg-white/40 z-20 flex items-center justify-center">
          <div className="bg-red-600 text-white font-black px-4 py-2 rounded-xl text-xl rotate-[-10deg] shadow-lg uppercase tracking-widest border-2 border-red-700">
            Agotado
          </div>
        </div>
      )}
      {/* Content Section (Left side now) */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-1 sm:mb-2 line-clamp-1 sm:line-clamp-2">
            {product.name}
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>
        
        <div className="flex items-center justify-between pt-2 mt-auto">
          <span className={`text-xl sm:text-2xl font-black ${product.outOfStock ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {product.price.toFixed(2)}€
          </span>
          <button 
            disabled={product.outOfStock}
            className={`p-2 rounded-full font-bold shadow-sm transition-colors ${product.outOfStock ? 'bg-gray-200 text-gray-400' : 'bg-gray-100 text-gray-900 hover:bg-black hover:text-white'}`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Section (Right side) */}
      <div className="w-2/5 sm:w-1/3 h-full relative overflow-hidden bg-gray-100 shrink-0">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
    </div>
  );
};

export default ProductCard;
