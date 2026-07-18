import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db, storage } from '../../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Save, Info, MapPin, Store, Clock, Upload, X, User, FileText, CheckCircle2 } from 'lucide-react';

const ConfigGeneral = () => {
  const [settings, setSettings] = useState({
    pizzeriaName: 'SLICE',
    phone: '',
    address: '',
    legalName: '',
    legalNif: '',
    legalAddress: '',
    stripeEnabled: false,
    stripeAccountId: '',
    stripeSurchargeType: 'percentage', // 'percentage' o 'fixed'
    stripeSurchargeValue: 0,
    deliveryFee: 2.50,
    deliveryType: 'postal_codes', // 'postal_codes' o 'km'
    maxRadiusKm: 5,
    postalCodes: '11001, 11002, 11003',
    orderAlarmMinutes: 15,
    adminPassword: '1234',
    logoUrl: '/logo.jpg',
    drivers: '',
    loyaltyEnabled: false,
    loyaltyOrdersRequired: 10,
    loyaltyRewardText: '1 Pizza Gratis',
    loyaltyRewardCategory: ''
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState('fidelidad');
  const [stripeConnecting, setStripeConnecting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
        
        const catSnap = await getDocs(collection(db, 'categories'));
        setCategories(catSnap.docs.map(d => d.data().name));

        // Check for Stripe OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
          handleStripeCallback(code);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileRef = ref(storage, `settings/logo_${Date.now()}_${file.name}`);
      
      const uploadPromise = uploadBytes(fileRef, file);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout subiendo logo")), 15000)
      );
      
      await Promise.race([uploadPromise, timeoutPromise]);
      const url = await getDownloadURL(fileRef);
      
      setSettings(prev => ({ ...prev, logoUrl: url }));
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Hubo un error al subir el logo. Asegúrate de que las reglas de Storage son públicas.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
      alert('Configuración guardada correctamente');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleFactoryReset = async () => {
    const pwd = window.prompt('PELIGRO: Vas a borrar todos los pedidos, clientes y estadísticas. Introduce la contraseña maestra para confirmar:');
    if (pwd !== settings.adminPassword) {
      if (pwd !== null) alert('Contraseña incorrecta');
      return;
    }

    if (!window.confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esta acción dejará tu panel totalmente limpio.')) return;

    setSaving(true);
    try {
      // Borrar pedidos
      const ordersSnap = await getDocs(collection(db, 'orders'));
      for (const orderDoc of ordersSnap.docs) {
        await deleteDoc(doc(db, 'orders', orderDoc.id));
      }
      
      // Borrar estadísticas
      const statsSnap = await getDocs(collection(db, 'stats'));
      for (const statDoc of statsSnap.docs) {
        await deleteDoc(doc(db, 'stats', statDoc.id));
      }

      // Borrar clientes (para fidelidad)
      const custSnap = await getDocs(collection(db, 'customers'));
      for (const cDoc of custSnap.docs) {
        await deleteDoc(doc(db, 'customers', cDoc.id));
      }

      alert('Base de datos reseteada correctamente. Sistema a cero.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Error al resetear: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStripeCallback = async (code) => {
    try {
      setStripeConnecting(true);
      const res = await fetch('/api/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.connectedAccountId) {
        const newSettings = { ...settings, stripeAccountId: data.connectedAccountId };
        setSettings(newSettings);
        await setDoc(doc(db, 'settings', 'general'), newSettings, { merge: true });
        alert('¡Cuenta de Stripe vinculada con éxito!');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (err) {
      console.error(err);
      alert('Error conectando con Stripe: ' + err.message);
    } finally {
      setStripeConnecting(false);
    }
  };

  const handleConnectStripe = () => {
    const clientId = import.meta.env.VITE_STRIPE_CLIENT_ID || 'ca_PLACEHOLDER';
    const redirectUri = window.location.origin + window.location.pathname;
    window.location.href = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}`;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
        <Store className="w-8 h-8 text-red-600" />
        <h2 className="text-2xl font-black text-gray-900">Datos y Configuración de Envíos</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2"><Info className="w-5 h-5 text-gray-400"/> Identidad del Local</h3>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0 flex flex-col items-center gap-3">
              <label className="block text-sm font-semibold text-gray-700">Logo del Local</label>
              <div className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50 group hover:border-red-400 transition-colors">
                {settings.logoUrl ? (
                  <>
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer text-white flex flex-col items-center">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs font-bold">Cambiar</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-red-500 transition-colors">
                    {uploadingLogo ? (
                      <span className="text-sm font-bold animate-pulse text-red-500">Subiendo...</span>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-xs font-bold text-center px-2">Subir Logo<br/>(JPG/PNG)</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                  </label>
                )}
              </div>
              {settings.logoUrl && (
                <button 
                  onClick={() => setSettings(prev => ({ ...prev, logoUrl: '' }))}
                  className="text-xs text-red-500 font-bold flex items-center gap-1 hover:text-red-700"
                >
                  <X className="w-3 h-3" /> Quitar Logo
                </button>
              )}
            </div>
            
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del SaaS / Pizzería</label>
                <input type="text" name="pizzeriaName" value={settings.pizzeriaName} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección Física (Origen)</label>
                <textarea name="originAddress" value={settings.originAddress} onChange={handleChange} rows="2" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none resize-none" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              Alarma de Tiempo en Cocina (Minutos)
            </label>
            <p className="text-xs text-gray-500 mb-3">Si un pedido supera este tiempo desde su creación, su tarjeta parpadeará en rojo en el Kanban para alertar a la cocina.</p>
            <input type="number" name="orderAlarmMinutes" value={settings.orderAlarmMinutes} onChange={handleChange} className="w-full sm:w-1/2 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
          </div>

          <div className="pt-4 border-t border-gray-100 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="autoPrintTickets" checked={settings.autoPrintTickets || false} onChange={handleChange} className="w-5 h-5 rounded text-gray-900 focus:ring-gray-900" />
              <span className="font-bold text-gray-900">Auto-imprimir tickets de cocina</span>
            </label>
            <p className="text-xs text-gray-500 mt-2 ml-8">Se imprimirá un ticket automáticamente cuando un producto pase a la columna final ('Listo') en el Kanban. Activar el Modo Kiosko en Chrome para evitar la ventana de impresión.</p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña Zona Restaurante</label>
            <input type="text" name="adminPassword" value={settings.adminPassword} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Repartidores Disponibles
            </label>
            <p className="text-xs text-gray-500 mb-3">Nombres separados por comas. Si se deja en blanco, se preguntará manualmente el nombre al asignar el pedido.</p>
            <input type="text" name="drivers" value={settings.drivers || ''} onChange={handleChange} placeholder="Ej: Carlos, Marta, Juan" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4 border-b border-gray-200">
            <button onClick={() => setActiveTab('fidelidad')} className={`pb-2 font-bold ${activeTab === 'fidelidad' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}>Fidelidad</button>
            <button onClick={() => setActiveTab('pagos')} className={`pb-2 font-bold ${activeTab === 'pagos' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}>Pagos Online</button>
            <button onClick={() => setActiveTab('legal')} className={`pb-2 font-bold ${activeTab === 'legal' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'}`}>Datos Legales</button>
          </div>

          {activeTab === 'fidelidad' && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="loyaltyEnabled" checked={settings.loyaltyEnabled || false} onChange={handleChange} className="w-5 h-5 rounded text-red-600 focus:ring-red-500" />
                <span className="font-bold text-gray-900">Activar Fidelización por Teléfono</span>
              </label>
              
              {settings.loyaltyEnabled && (
                <div className="pt-2 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Pedidos necesarios para el premio</label>
                    <input type="number" name="loyaltyOrdersRequired" value={settings.loyaltyOrdersRequired} onChange={handleChange} className="w-full sm:w-1/2 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría del Premio</label>
                    <select name="loyaltyRewardCategory" value={settings.loyaltyRewardCategory || ''} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none bg-white">
                      <option value="">-- Selecciona una categoría --</option>
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Texto descriptivo del Premio</label>
                    <input type="text" name="loyaltyRewardText" value={settings.loyaltyRewardText} onChange={handleChange} placeholder="Ej: 1 Pizza Gratis a elegir" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none bg-white" />
                  </div>
                </div>
              )}
            </div>
          )}
            
          {activeTab === 'legal' && (
            <div className="pt-2 space-y-4">
              <p className="text-sm text-gray-500 mb-4">Estos datos aparecerán en las facturas oficiales generadas para los clientes.</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Razón Social</label>
                <input type="text" name="legalName" value={settings.legalName || ''} onChange={handleChange} placeholder="Ej: SLICE PIZZA S.L." className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none bg-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">NIF / CIF</label>
                <input type="text" name="legalNif" value={settings.legalNif || ''} onChange={handleChange} placeholder="Ej: B12345678" className="w-full sm:w-1/2 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none bg-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección Fiscal completa</label>
                <input type="text" name="legalAddress" value={settings.legalAddress || ''} onChange={handleChange} placeholder="Ej: Calle Principal 123, 28001 Madrid" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none bg-white" />
              </div>
            </div>
          )}

          {activeTab === 'pagos' && (
            <div className="pt-2 space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="stripeEnabled" checked={settings.stripeEnabled || false} onChange={handleChange} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                  <span className="font-bold text-gray-900">Activar Pagos por Stripe (Apple/Google Pay)</span>
                </label>
                
                {settings.stripeEnabled && (
                  <div className="pt-4 border-t border-blue-200 space-y-4">
                    <div>
                      <h4 className="font-bold text-sm text-gray-700 mb-2">Conexión con el Banco</h4>
                      {settings.stripeAccountId ? (
                        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <span className="text-sm font-medium text-gray-700">Cuenta Vinculada: <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{settings.stripeAccountId}</span></span>
                          <button type="button" onClick={() => setSettings({...settings, stripeAccountId: ''})} className="ml-auto text-xs text-red-500 hover:underline">Desvincular</button>
                        </div>
                      ) : (
                        <button type="button" onClick={handleConnectStripe} disabled={stripeConnecting} className="bg-[#635BFF] text-white font-bold px-6 py-3 rounded-xl shadow-sm hover:bg-[#4B45D6] transition-colors w-full sm:w-auto">
                          {stripeConnecting ? 'Conectando...' : 'Conectar Banco de la Pizzería'}
                        </button>
                      )}
                    </div>

                    <div className="pt-4">
                      <h4 className="font-bold text-sm text-gray-700 mb-2">Comisión / Recargo al Cliente</h4>
                      <p className="text-xs text-gray-500 mb-3">Puedes cobrar un extra a los clientes que elijan pagar online para compensar las comisiones del banco.</p>
                      
                      <div className="flex gap-4 items-center">
                        <select name="stripeSurchargeType" value={settings.stripeSurchargeType || 'percentage'} onChange={handleChange} className="w-1/3 border border-gray-300 rounded-xl px-2 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm">
                          <option value="percentage">%</option>
                          <option value="fixed">€</option>
                        </select>
                        <input type="number" step="0.10" name="stripeSurchargeValue" value={settings.stripeSurchargeValue || 0} onChange={handleChange} className="w-2/3 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white" placeholder="Ej: 2.5" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <h3 className="font-bold text-lg flex items-center gap-2 mt-8 pt-6 border-t border-gray-100"><MapPin className="w-5 h-5 text-gray-400"/> Logística y Envíos</h3>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Coste de envío a domicilio (€)</label>
            <input type="number" step="0.10" name="deliveryFee" value={settings.deliveryFee} onChange={handleChange} className="w-full sm:w-1/2 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Restringir envíos por:</label>
            <select name="deliveryType" value={settings.deliveryType} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none bg-white">
              <option value="postal_codes">Códigos Postales Específicos</option>
              <option value="km">Radio de Kilómetros desde origen</option>
            </select>
          </div>

          {settings.deliveryType === 'postal_codes' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Códigos Postales Aceptados</label>
              <input type="text" name="postalCodes" value={settings.postalCodes} onChange={handleChange} placeholder="Ej: 11001, 11002, 11003" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
              <p className="text-xs text-gray-500 mt-1">Separados por comas.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Radio máximo (KM)</label>
              <input type="number" name="maxRadiusKm" value={settings.maxRadiusKm} onChange={handleChange} className="w-full sm:w-1/2 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center">
        <button 
          onClick={handleFactoryReset}
          disabled={saving}
          className="text-red-500 hover:text-red-700 font-bold text-sm px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          Borrar Base de Datos (Reset a 0)
        </button>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );
};

export default ConfigGeneral;
