import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

const LegalPage = () => {
  const { type } = useParams();
  const [settings, setSettings] = useState({});
  
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, 'settings', 'general'));
      if (snap.exists()) setSettings(snap.data());
    };
    fetchSettings();
  }, [type]);

  const companyName = settings.legalName || 'NOMBRE DE LA EMPRESA';
  const companyNif = settings.legalNif || 'NIF DE LA EMPRESA';
  const companyAddress = settings.legalAddress || 'DIRECCIÓN DE LA EMPRESA';
  const companyEmail = settings.email || 'EMAIL DE LA EMPRESA';

  const renderContent = () => {
    switch (type) {
      case 'aviso-legal':
        return (
          <>
            <h1 className="text-3xl font-black mb-6">Aviso Legal</h1>
            <p className="mb-4">En cumplimiento con el deber de información recogido en artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSICE), el propietario de la web informa de lo siguiente:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>Denominación social: <strong>{companyName}</strong></li>
              <li>NIF: <strong>{companyNif}</strong></li>
              <li>Domicilio: <strong>{companyAddress}</strong></li>
              <li>Email de contacto: <strong>{companyEmail}</strong></li>
            </ul>
            <p className="mb-4">Con los límites establecidos en la ley, {companyName} no asume ninguna responsabilidad derivada de la falta de veracidad, integridad, actualización y precisión de los datos o informaciones que contienen sus páginas web.</p>
            <p className="mb-4">Los contenidos e información no vinculan a {companyName} ni constituyen opiniones, consejos o asesoramiento legal de ningún tipo pues se trata meramente de un servicio ofrecido con carácter informativo y divulgativo.</p>
            <p className="mb-4">Las páginas de Internet de {companyName} pueden contener enlaces (links) a otras páginas de terceras partes que {companyName} no puede controlar. Por lo tanto, {companyName} no puede asumir responsabilidades por el contenido que pueda aparecer en páginas de terceros.</p>
          </>
        );
      case 'privacidad':
        return (
          <>
            <h1 className="text-3xl font-black mb-6">Política de Privacidad</h1>
            <p className="mb-4">De acuerdo con lo establecido en el Reglamento General de Protección de Datos (RGPD) europeo y la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales, le informamos que los datos personales que nos facilite a través de nuestro sitio web o mediante envíos de correos electrónicos, serán incorporados a los sistemas de tratamiento titularidad de {companyName}.</p>
            <p className="mb-4">La finalidad del tratamiento de sus datos es la gestión de los pedidos realizados a través del sitio web, la prestación del servicio de reparto a domicilio, así como la atención a consultas y sugerencias relacionadas con nuestro servicio.</p>
            <h3 className="text-xl font-bold mt-6 mb-2">Derechos de los usuarios</h3>
            <p className="mb-4">Puede ejercer sus derechos de acceso, rectificación, cancelación, supresión, limitación del tratamiento y oposición dirigiéndose por escrito a {companyAddress} o mediante un correo electrónico a <strong>{companyEmail}</strong>, indicando en el asunto "Protección de Datos".</p>
            <h3 className="text-xl font-bold mt-6 mb-2">Conservación de datos</h3>
            <p className="mb-4">Los datos se conservarán durante el tiempo estrictamente necesario para las finalidades del tratamiento o el tiempo necesario para cumplir con las obligaciones legales.</p>
          </>
        );
      case 'cookies':
        return (
          <>
            <h1 className="text-3xl font-black mb-6">Política de Cookies</h1>
            <p className="mb-4">Este sitio web utiliza cookies para mejorar la experiencia del usuario. A continuación, le ofrecemos información detallada sobre qué son las cookies, qué tipo de cookies utiliza este sitio web y cómo puede desactivarlas.</p>
            <h3 className="text-xl font-bold mt-6 mb-2">¿Qué son las cookies?</h3>
            <p className="mb-4">Las cookies son pequeños archivos de texto que las páginas web pueden instalar en su dispositivo al acceder a las mismas. Sus funciones pueden ser muy variadas: almacenar sus preferencias de navegación, recordar los productos de su cesta de la compra, recopilar información estadística o permitir ciertas funcionalidades técnicas.</p>
            <h3 className="text-xl font-bold mt-6 mb-2">Cookies que utilizamos</h3>
            <p className="mb-4">Actualmente este sitio web solo utiliza <strong>cookies técnicas estrictamente necesarias</strong> para el correcto funcionamiento del sistema de pedidos. Estas cookies permiten mantener su sesión activa y guardar los artículos en su carrito de compra temporalmente. No utilizamos cookies publicitarias ni de seguimiento de terceros.</p>
            <h3 className="text-xl font-bold mt-6 mb-2">Cómo gestionar las cookies</h3>
            <p className="mb-4">Puede usted permitir, bloquear o eliminar las cookies instaladas en su equipo mediante la configuración de las opciones del navegador instalado en su ordenador o dispositivo móvil. Tenga en cuenta que, si desactiva las cookies técnicas, es posible que no pueda realizar pedidos a través de nuestra web.</p>
          </>
        );
      default:
        return <p>Página no encontrada.</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-red-600 font-semibold transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Volver al Inicio
          </Link>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="prose prose-red max-w-none text-gray-600 leading-relaxed">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
