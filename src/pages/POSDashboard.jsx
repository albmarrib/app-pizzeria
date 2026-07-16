import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import KanbanBoard from '../components/pos/KanbanBoard';
import SettingsPanel from '../components/pos/SettingsPanel';
import ManualOrderPanel from '../components/pos/ManualOrderPanel';
import StatsPanel from '../components/pos/StatsPanel';
import { LayoutDashboard, Settings, LogOut, Bell, ShoppingBag, BarChart3 } from 'lucide-react';

const POSDashboard = () => {
  const [activeTab, setActiveTab] = useState('pedidos');
  const [globalSettings, setGlobalSettings] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          setGlobalSettings(docSnap.data());
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };
    fetchSettings();
  }, []);

  const logoUrl = globalSettings?.logoUrl !== undefined ? globalSettings.logoUrl : '/logo.jpg';

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100 gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-md" />
          )}
          <div className="text-xl font-black text-red-600 hidden lg:block">
            {globalSettings?.pizzeriaName ? (
              globalSettings.pizzeriaName.split(' ')[0]
            ) : "SLICE"}
            <span className="text-gray-900">
              {globalSettings?.pizzeriaName ? globalSettings.pizzeriaName.split(' ').slice(1).join(' ') : "POS"}
            </span>
          </div>
        </div>
        
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          <button 
            onClick={() => setActiveTab('nuevo_pedido')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab === 'nuevo_pedido' ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <ShoppingBag className="w-6 h-6" />
            <span className="hidden lg:block">Nuevo Pedido</span>
          </button>

          <button 
            onClick={() => setActiveTab('pedidos')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab === 'pedidos' ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="hidden lg:block">Pedidos Activos</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('configuracion')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab === 'configuracion' ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Settings className="w-6 h-6" />
            <span className="hidden lg:block">Configuración</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('estadisticas')}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${activeTab === 'estadisticas' ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="hidden lg:block">Estadísticas y Cierre</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center justify-center lg:justify-start gap-3 p-3 w-full rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-6 h-6" />
            <span className="font-medium hidden lg:block">Salir</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <h1 className="text-xl font-bold text-gray-900">Gestión de Pedidos</h1>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                A
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-semibold text-gray-900 leading-none">Admin Pizzería</p>
                <p className="text-gray-500 text-xs">Mostrador Principal</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6 bg-gray-100">
          {activeTab === 'nuevo_pedido' && <ManualOrderPanel />}
          {activeTab === 'pedidos' && <KanbanBoard />}
          {activeTab === 'configuracion' && <SettingsPanel />}
          {activeTab === 'estadisticas' && <StatsPanel />}
        </div>
      </main>
    </div>
  );
};

export default POSDashboard;
