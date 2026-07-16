import React, { useState } from 'react';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';

const MenuGrid = ({ products, onAdd }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
        <p className="text-gray-500 text-lg">No hay productos en esta categoría.</p>
      </div>
    );
  }

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleAddToCart = (productToAdd, openCart) => {
    onAdd(productToAdd, openCart);
    setSelectedProduct(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {products.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onClick={() => handleProductClick(product)} 
          />
        ))}
      </div>

      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={handleCloseModal} 
          onAdd={handleAddToCart}
        />
      )}
    </>
  );
};

export default MenuGrid;
