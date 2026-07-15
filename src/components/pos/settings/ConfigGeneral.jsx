import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Save, Info, MapPin, Store, Clock } from 'lucide-react';

const ConfigGeneral = () => {
  const [settings, setSettings] = useState({
    pizzeriaName: 'Slice Pizzería',
    originAddress: 'Cádiz Centro, España',
    deliveryFee: 2.50,
    deliveryType: 'postal_codes', // 'postal_codes' o 'km'
    maxRadiusKm: 5,
    postalCodes: '11001, 11002, 11003',
    orderAlarmMinutes: 15
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del SaaS / Pizzería</label>
            <input type="text" name="pizzeriaName" value={settings.pizzeriaName} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección Física (Origen)</label>
            <textarea name="originAddress" value={settings.originAddress} onChange={handleChange} rows="2" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none resize-none" />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              Alarma de Tiempo en Cocina (Minutos)
            </label>
            <p className="text-xs text-gray-500 mb-3">Si un pedido supera este tiempo desde su creación, su tarjeta parpadeará en rojo en el Kanban para alertar a la cocina.</p>
            <input type="number" name="orderAlarmMinutes" value={settings.orderAlarmMinutes} onChange={handleChange} className="w-full sm:w-1/2 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none" />
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
