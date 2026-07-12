import React, { useState } from 'react';
import ConfigGeneral from './settings/ConfigGeneral';
import CategoriesManager from './settings/CategoriesManager';
import ProductsManager from './settings/ProductsManager';
import IngredientsManager from './settings/IngredientsManager';
import { Store, ListTree, Package, Leaf } from 'lucide-react';

const SettingsPanel = () => {
  const [activeSubTab, setActiveSubTab] = useState('general');

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Settings Sub-Navigation */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveSubTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeSubTab === 'general' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          <Store className="w-4 h-4" /> Datos y Envíos
        </button>
        <button 
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeSubTab === 'categories' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          <ListTree className="w-4 h-4" /> Categorías
        </button>
        <button 
          onClick={() => setActiveSubTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeSubTab === 'products' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          <Package className="w-4 h-4" /> Productos
        </button>
        <button 
          onClick={() => setActiveSubTab('extras')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${activeSubTab === 'extras' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
        >
          <Leaf className="w-4 h-4" /> Extras y Alérgenos
        </button>
      </div>

      {/* Settings Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          {activeSubTab === 'general' && <ConfigGeneral />}
          {activeSubTab === 'categories' && <CategoriesManager />}
          {activeSubTab === 'products' && <ProductsManager />}
          {activeSubTab === 'extras' && <IngredientsManager />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
