import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, storage } from '../../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Save, Info, MapPin, Store, Clock, Upload, X, User } from 'lucide-react';

const ConfigGeneral = () => {
  const [settings, setSettings] = useState({
    pizzeriaName: 'Slice Pizzería',
    originAddress: 'Cádiz Centro, España',
    deliveryFee: 2.50,
    deliveryType: 'postal_codes', // 'postal_codes' o 'km'
    maxRadiusKm: 5,
    postalCodes: '11001, 11002, 11003',
    orderAlarmMinutes: 15,
    adminPassword: '1234',
    logoUrl: '/logo.jpg', // Default a la que acabamos de mover, si no hay otra
    drivers: '' // Lista de repartidores separados por comas
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
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

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
        <Store className="w-8 h-8 text-red-600" />
        <h2 className="text-2xl font-black text-gray-900">Datos y Configuración de Envíos</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Identidad */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2"><Info className="w-5 h-5 text-gray-400"/> Identidad del Local</h3>
          
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Subida de Logo */}
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

        {/* Envíos */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-gray-400"/> Logística y Envíos</h3>
          
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

      <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
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
