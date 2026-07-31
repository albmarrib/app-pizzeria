import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Search, FileText, CheckCircle2, User, Building2, MapPin, Calendar, Clock } from 'lucide-react';
import CryptoJS from 'crypto-js';

const InvoiceManagerPanel = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchDateStart, setSearchDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [searchDateEnd, setSearchDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [dateResults, setDateResults] = useState([]);
  
  const [formData, setFormData] = useState({
    businessName: '',
    nif: '',
    address: ''
  });

  const searchOrder = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setSuccess(false);

    try {
      // Intentar buscar por ID directo o código corto
      let orderDoc = null;
      let docRef = null;

      if (searchQuery.length > 10) {
        docRef = doc(db, 'orders', searchQuery);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) orderDoc = { id: docSnap.id, ...docSnap.data() };
      }

      if (!orderDoc) {
        // Buscar por orderCode (si aplica)
        const q = query(collection(db, 'orders'), where('id', '>=', searchQuery), where('id', '<=', searchQuery + '\uf8ff'), limit(5));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          orderDoc = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
        }
      }

      if (orderDoc) {
        if (orderDoc.status === 'CANCELED') {
          setError('El pedido fue cancelado y no se puede facturar.');
        } else if (orderDoc.invoiceId) {
          setError('Este pedido YA tiene una factura asociada.');
        } else {
          setOrder(orderDoc);
        }
      } else {
        setError('No se encontró ningún pedido con ese ID.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al buscar el pedido.');
    } finally {
      setLoading(false);
    }
  };

  const searchByDate = async (e) => {
    e.preventDefault();
    if (!searchDateStart || !searchDateEnd) return;
    setLoading(true);
    setError('');
    setDateResults([]);
    setOrder(null);
    setSuccess(false);

    try {
      const start = new Date(searchDateStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(searchDateEnd);
      end.setHours(23, 59, 59, 999);

      if (end < start) {
        setError('La fecha "Hasta" no puede ser anterior a la fecha "Desde".');
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, 'orders'),
        where('createdAt', '>=', start),
        where('createdAt', '<=', end),
        orderBy('createdAt', 'desc')
      );
      
      const qSnap = await getDocs(q);
      const results = [];
      qSnap.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'CANCELED') {
          results.push({ id: doc.id, ...data });
        }
      });

      if (results.length > 0) {
        setDateResults(results);
      } else {
        setError('No se encontraron tickets (pedidos completados) en esa fecha.');
      }
    } catch (err) {
      console.error(err);
      setError('Error al buscar pedidos por fecha.');
    } finally {
      setLoading(false);
    }
  };

  const generateHash = (text) => {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex).toUpperCase();
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!formData.businessName || !formData.nif || !formData.address || !order) return;
    setGenerating(true);

    try {
      const year = new Date().getFullYear();
      
      const q = query(
        collection(db, 'invoices'), 
        orderBy('invoiceNumber', 'desc'), 
        limit(1)
      );
      const snap = await getDocs(q);
      
      let previousHash = '';
      let num = 1;
      
      if (!snap.empty) {
        const lastInv = snap.docs[0].data();
        if (lastInv.invoiceNumber && lastInv.invoiceNumber.startsWith(`F${year}-`)) {
          previousHash = lastInv.hash || '';
          const parts = lastInv.invoiceNumber.split('-');
          num = parseInt(parts[1]) + 1;
        }
      }

      const invoiceNumber = `F${year}-${String(num).padStart(4, '0')}`;
      const isoDate = new Date().toISOString();
      const total = order.total.toFixed(2);
      
      const hashString = `${previousHash}|${invoiceNumber}|${isoDate}|${total}|${formData.nif}`;
      const currentHash = generateHash(hashString);

      const invoiceData = {
        invoiceNumber,
        date: isoDate,
        orderId: order.id,
        total: order.total,
        customer: formData,
        previousHash,
        hash: currentHash,
        items: order.items,
        createdAt: serverTimestamp()
      };

      const invRef = await addDoc(collection(db, 'invoices'), invoiceData);
      await updateDoc(doc(db, 'orders', order.id), { invoiceId: invRef.id });

      setSuccess(true);
      setOrder(null);
      setFormData({ businessName: '', nif: '', address: '' });
      setSearchQuery('');
    } catch (err) {
      console.error(err);
      alert('Error generando la factura');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gestor de Facturas (VeriFactu)</h2>
        <p className="text-gray-500 text-sm">Busca pedidos antiguos o actuales para emitir una Factura Nominativa a clientes.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Búsqueda por ID */}
          <div>
            <h3 className="font-bold text-gray-700 mb-3">Buscar por Código / ID</h3>
            <form onSubmit={searchOrder} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ej: ABCD o 1234..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
              />
              <button type="submit" disabled={loading} className="bg-black text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 shrink-0">
                <Search className="w-4 h-4" /> Buscar
              </button>
            </form>
          </div>

          {/* Búsqueda por Rango de Fechas */}
          <div>
            <h3 className="font-bold text-gray-700 mb-3">Buscar por Rango de Fechas</h3>
            <form onSubmit={searchByDate} className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Desde:</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="date" 
                      value={searchDateStart}
                      onChange={(e) => setSearchDateStart(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Hasta:</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                      type="date" 
                      value={searchDateEnd}
                      onChange={(e) => setSearchDateEnd(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-xl font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> Buscar en rango
              </button>
            </form>
          </div>
        </div>

        {error && <p className="text-red-500 mt-4 font-medium p-3 bg-red-50 rounded-xl">{error}</p>}
        {success && (
          <div className="mt-4 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <p className="font-bold">¡Factura generada y guardada con éxito!</p>
              <p className="text-sm">El cliente ya puede descargarla desde su enlace de seguimiento, o puedes imprimirla navegando a `/factura/ID`.</p>
            </div>
          </div>
        )}

        {/* Resultados por Rango de Fechas */}
        {dateResults.length > 0 && !order && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              Tickets encontrados <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-xl text-sm">{dateResults.length}</span>
            </h3>
            <div className="grid gap-3 max-h-80 overflow-y-auto pr-2">
              {dateResults.map((resOrder) => (
                <div key={resOrder.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-black transition-colors">
                  <div>
                    <p className="font-black text-gray-900">
                      Código: {resOrder.orderCode || resOrder.id.slice(-6).toUpperCase()}
                      {resOrder.invoiceId && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Ya Facturado</span>}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {resOrder.createdAt?.toDate().toLocaleTimeString()} • {resOrder.customerInfo?.name || 'Mostrador'}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <p className="font-bold text-lg">{resOrder.total.toFixed(2)}€</p>
                    <button 
                      onClick={() => {
                        if (resOrder.invoiceId) {
                          setError('Este pedido YA tiene una factura asociada.');
                        } else {
                          setOrder(resOrder);
                          setDateResults([]);
                        }
                      }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm ${resOrder.invoiceId ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
                      disabled={!!resOrder.invoiceId}
                    >
                      Facturar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {order && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-black">Emitir Factura Nominativa</h3>
              <p className="text-gray-500 text-sm">Pedido #{order.id.slice(-6).toUpperCase()} - Total: {order.total.toFixed(2)}€</p>
            </div>
          </div>
          
          <form onSubmit={handleGenerateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Razón Social / Nombre</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input type="text" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">NIF / CIF</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input type="text" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none" required />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Dirección Fiscal</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none" required />
              </div>
            </div>
            <button disabled={generating} type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-4 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              {generating ? 'Registrando en VeriFactu...' : 'Generar Factura Nominativa'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagerPanel;
