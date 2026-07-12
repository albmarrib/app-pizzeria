import React from 'react';
import { Phone, MessageCircle, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 border-t-4 border-red-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Logo & About */}
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
              Slice <span className="text-red-600">Pizza</span>
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Auténtica pizza estilo New York elaborada diariamente con masa madre, ingredientes frescos y mucho carácter. 
              Pídela a domicilio o ven a disfrutarla con nosotros.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors font-bold text-sm">
                Ig
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors font-bold text-sm">
                Fb
              </a>
            </div>
          </div>

          {/* Contact & Ordering */}
          <div>
            <h3 className="text-xl font-bold text-white uppercase mb-4">Pedidos & Contacto</h3>
            <ul className="space-y-4">
              <li>
                <button 
                  onClick={() => alert("Llamando a tu Agente de Voz IA...")} 
                  className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl transition-colors"
                >
                  <Phone className="w-5 h-5 text-red-500" />
                  <span className="font-semibold text-left flex-1">Pedir por Teléfono</span>
                </button>
              </li>
              <li>
                <a 
                  href="https://wa.me/34600000000" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-left flex-1">Chat por WhatsApp</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Location & Hours */}
          <div>
            <h3 className="text-xl font-bold text-white uppercase mb-4">Dónde Estamos</h3>
            <div className="flex items-start gap-3 mb-4 text-gray-400">
              <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p>Calle Principal 123,<br />28001 Madrid</p>
            </div>
            <div className="space-y-2 mt-6">
              <h4 className="font-bold text-white">Horarios</h4>
              <p className="flex justify-between border-b border-gray-800 pb-1">
                <span>Lunes - Jueves</span> <span>13:00 - 23:30</span>
              </p>
              <p className="flex justify-between border-b border-gray-800 pb-1">
                <span>Viernes - Domingo</span> <span>13:00 - 00:30</span>
              </p>
            </div>
          </div>

        </div>

        {/* Legal Bottom */}
        <div className="pt-8 border-t border-gray-800 text-sm text-gray-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} Slice Pizza SaaS. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Aviso Legal</a>
            <a href="#" className="hover:text-white transition-colors">Política de Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Política de Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
