import React from 'react';
import { Phone, MessageCircle, MapPin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = ({ globalSettings }) => {
  const name = globalSettings?.pizzeriaName || '';
  const spaceIndex = name.indexOf(' ');
  const firstPart = spaceIndex > -1 ? name.substring(0, spaceIndex) : name;
  const secondPart = spaceIndex > -1 ? name.substring(spaceIndex + 1) : '';

  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 border-t-4 border-red-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Logo & About */}
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">
              {firstPart} {secondPart && <span className="text-red-600">{secondPart}</span>}
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Auténtica pizza estilo New York elaborada diariamente con masa madre, ingredientes frescos y mucho carácter. 
              Pídela a domicilio o ven a disfrutarla con nosotros.
            </p>
            <div className="flex items-center gap-4">
              {globalSettings?.instagram && (
                <a href={globalSettings.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
              )}
              {globalSettings?.facebook && (
                <a href={globalSettings.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
              )}
            </div>
          </div>

          {/* Contact & Ordering */}
          <div>
            <h3 className="text-xl font-bold text-white uppercase mb-4">Pedidos & Contacto</h3>
            <ul className="space-y-4">
              {globalSettings?.email && (
                <li>
                  <a 
                    href={`mailto:${globalSettings.email}`}
                    className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl transition-colors"
                  >
                    <Mail className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold text-left flex-1 text-sm sm:text-base break-all">{globalSettings.email}</span>
                  </a>
                </li>
              )}
              {globalSettings?.phone && (
                <li>
                  <a 
                    href={`tel:${String(globalSettings.phone).replace(/\s+/g, '')}`}
                    className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl transition-colors"
                  >
                    <Phone className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-left flex-1">{globalSettings.phone}</span>
                  </a>
                </li>
              )}
              {globalSettings?.whatsapp && (
                <li>
                  <a 
                    href={`https://wa.me/${String(globalSettings.whatsapp).replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-left flex-1">Chat por WhatsApp</span>
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Location & Hours */}
          <div>
            <h3 className="text-xl font-bold text-white uppercase mb-4">Dónde Estamos</h3>
            <div className="flex items-start gap-3 mb-4 text-gray-400">
              <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="whitespace-pre-line">{globalSettings?.address || 'Dirección no configurada'}</p>
            </div>
            <div className="space-y-2 mt-6">
              <h4 className="font-bold text-white">Horarios</h4>
              {globalSettings?.schedule ? (
                String(globalSettings.schedule).split('\n').map((line, idx) => {
                  const parts = line.split(':');
                  if (parts.length >= 2 && !line.match(/^http/)) {
                    // Try to split on first colon for "Day: Hours" format
                    const day = parts[0];
                    const hours = parts.slice(1).join(':');
                    return (
                      <p key={idx} className="flex justify-between border-b border-gray-800 pb-1 text-gray-400">
                        <span>{day.trim()}</span> <span>{hours.trim()}</span>
                      </p>
                    );
                  }
                  return <p key={idx} className="text-gray-400">{line}</p>;
                })
              ) : (
                <p className="text-gray-400">Horario no configurado</p>
              )}
            </div>
          </div>

        </div>

        {/* Legal Bottom */}
        <div className="pt-8 border-t border-gray-800 text-sm text-gray-500 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} Pizzería-SaaS. Todos los derechos reservados.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/legal/aviso-legal" className="hover:text-white transition-colors">Aviso Legal</Link>
            <Link to="/legal/privacidad" className="hover:text-white transition-colors">Política de Privacidad</Link>
            <Link to="/legal/cookies" className="hover:text-white transition-colors">Política de Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
