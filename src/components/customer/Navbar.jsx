import React from 'react';
import { ShoppingCart, Menu, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ cartCount, onCartClick, globalSettings }) => {
  const navigate = useNavigate();

  const handlePosAccess = () => {
    const password = prompt("Introduce la contraseña para acceder a la zona de restaurante:");
    const correctPassword = globalSettings?.adminPassword || "1234";
    if (password === correctPassword) {
      navigate('/pos');
    } else if (password !== null) {
      alert("Contraseña incorrecta");
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-white shadow-sm h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button className="sm:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        
        {(() => {
          const logoUrl = globalSettings?.logoUrl !== undefined ? globalSettings.logoUrl : '/logo.jpg';
          return (
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img 
                  src={logoUrl} 
                  alt={globalSettings?.pizzeriaName || "Logo"} 
                  className="h-10 w-10 object-contain rounded-md" 
                />
              )}
              <div className="text-2xl font-black tracking-tight text-red-600 hidden sm:block">
                {globalSettings?.pizzeriaName ? (
                  globalSettings.pizzeriaName.split(' ')[0]
                ) : "SLICE"}
                <span className="text-gray-900">
                  {globalSettings?.pizzeriaName ? globalSettings.pizzeriaName.split(' ').slice(1).join(' ') : "SAAS"}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={handlePosAccess}
          className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <User className="w-5 h-5" />
          <span>Zona Restaurante</span>
        </button>
        
        <button 
          onClick={onCartClick}
          className="relative p-2 text-gray-800 hover:text-red-600 transition-colors bg-gray-50 rounded-full hover:bg-red-50"
        >
          <ShoppingCart className="w-6 h-6" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full -translate-y-1 translate-x-1 shadow-sm">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
