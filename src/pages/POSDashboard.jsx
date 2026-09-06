import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import KanbanBoard from '../components/pos/KanbanBoard';
import SettingsPanel from '../components/pos/SettingsPanel';
import ManualOrderPanel from '../components/pos/ManualOrderPanel';
import TableMapPanel from '../components/pos/TableMapPanel';
import StatsPanel from '../components/pos/StatsPanel';
import InvoiceManagerPanel from '../components/pos/InvoiceManagerPanel';
import { LayoutDashboard, Settings, LogOut, Bell, ShoppingBag, BarChart3, FileText, MapPin } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row font-sans">
      {/* Sidebar (Desktop) / Bottom Nav (Mobile) */}
      <aside className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex flex-row justify-around p-2 lg:relative lg:p-0 lg:flex-col lg:w-64 lg:h-screen lg:border-r lg:border-t-0 lg:justify-start">
        
        {/* Logo - Hidden on mobile */}
        <div className="hidden lg:flex h-16 items-center justify-start px-6 border-b border-gray-100 gap-3">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-md" />
          )}
          <div className="text-xl font-black text-red-600">
            {globalSettings?.pizzeriaName ? (
              globalSettings.pizzeriaName.split(' ')[0]
            ) : ""}
            <span className="text-gray-900">
              {globalSettings?.pizzeriaName ? globalSettings.pizzeriaName.split(' ').slice(1).join(' ') : ""}
            </span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 flex flex-row justify-around w-full lg:flex-col lg:py-6 lg:px-3 lg:gap-2">
          <button 
            onClick={() => setActiveTab('nuevo_pedido')}
            className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 p-2 lg:p-3 rounded-xl transition-colors ${activeTab === 'nuevo_pedido' ? 'text-red-600 lg:bg-red-50 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <ShoppingBag className="w-6 h-6 lg:w-6 lg:h-6" />
            <span className="text-[10px] lg:text-base lg:block">Nuevo</span>
          </button>

          <button 
            onClick={() => setActiveTab('pedidos')}
            className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 p-2 lg:p-3 rounded-xl transition-colors ${activeTab === 'pedidos' ? 'text-red-600 lg:bg-red-50 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="w-6 h-6 lg:w-6 lg:h-6" />
            <span className="text-[10px] lg:text-base lg:block">Pedidos</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('mesas')}
            className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 p-2 lg:p-3 rounded-xl transition-colors ${activeTab === 'mesas' ? 'text-red-600 lg:bg-red-50 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <MapPin className="w-6 h-6 lg:w-6 lg:h-6" />
            <span className="text-[10px] lg:text-base lg:block">Salón</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('configuracion')}
            className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 p-2 lg:p-3 rounded-xl transition-colors ${activeTab === 'configuracion' ? 'text-red-600 lg:bg-red-50 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Settings className="w-6 h-6 lg:w-6 lg:h-6" />
            <span className="text-[10px] lg:text-base lg:block">Config</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('estadisticas')}
            className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 p-2 lg:p-3 rounded-xl transition-colors ${activeTab === 'estadisticas' ? 'text-red-600 lg:bg-red-50 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <BarChart3 className="w-6 h-6 lg:w-6 lg:h-6" />
            <span className="text-[10px] lg:text-base lg:block">Cierre</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('facturas')}
            className={`flex flex-col lg:flex-row items-center gap-1 lg:gap-3 p-2 lg:p-3 rounded-xl transition-colors ${activeTab === 'facturas' ? 'text-red-600 lg:bg-red-50 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <FileText className="w-6 h-6 lg:w-6 lg:h-6" />
            <span className="text-[10px] lg:text-base lg:block">Facturas</span>
          </button>
        </nav>
        
        {/* Logout - Hidden on mobile, can be placed in top header if needed, but for now just hide on mobile to save space */}
        <div className="hidden lg:block p-4 border-t border-gray-100">
          <button className="flex items-center justify-start gap-3 p-3 w-full rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-6 h-6" />
            <span className="font-medium">Salir</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pb-[72px] lg:pb-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <h1 className="text-lg lg:text-xl font-bold text-gray-900 truncate">
            {activeTab === 'nuevo_pedido' && 'Nuevo Pedido'}
            {activeTab === 'pedidos' && 'Pedidos Activos'}
            {activeTab === 'mesas' && 'Salón / Mesas'}
            {activeTab === 'configuracion' && 'Configuración'}
            {activeTab === 'estadisticas' && 'Estadísticas'}
            {activeTab === 'facturas' && 'Facturas'}
          </h1>
          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 lg:gap-3 border-l border-gray-200 pl-3 lg:pl-4">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                A
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-semibold text-gray-900 leading-none">Admin Pizzería</p>
                <p className="text-gray-500 text-xs">Mostrador</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Area */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6 bg-gray-100">
          {activeTab === 'nuevo_pedido' && <ManualOrderPanel />}
          {activeTab === 'mesas' && <TableMapPanel />}
          {activeTab === 'pedidos' && <KanbanBoard />}
          {activeTab === 'configuracion' && <SettingsPanel />}
          {activeTab === 'estadisticas' && <StatsPanel />}
          {activeTab === 'facturas' && <InvoiceManagerPanel />}
        </div>
      </main>
    </div>
  );
};

export default POSDashboard;
