import React from 'react';

const categories = ['Todos', 'Pizzas', 'Entrantes', 'Bebidas', 'Postres'];

const CategoryNav = ({ activeCategory, onSelect }) => {
  return (
    <div className="bg-white sticky top-16 z-30 shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex overflow-x-auto py-4 gap-2 no-scrollbar scroll-smooth">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onSelect(category)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === category
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryNav;
