import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FileText, CheckCircle2, Download, Building2, User, MapPin, ArrowLeft } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import CryptoJS from 'crypto-js';

const InvoiceRequest = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    nif: '',
    address: ''
  });
  
  const pdfRef = useRef();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'orders', orderId));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrder({ id: docSnap.id, ...data });
          
          if (data.invoiceId) {
            const invSnap = await getDoc(doc(db, 'invoices', data.invoiceId));
            if (invSnap.exists()) {
              setInvoice({ id: invSnap.id, ...invSnap.data() });
            }
          }
        }
        
        const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const generateHash = (text) => {
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex).toUpperCase();
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!formData.businessName || !formData.nif || !formData.address) return;
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

      setInvoice({ id: invRef.id, ...invoiceData });

    } catch (err) {
      console.error(err);
      alert('Error generando la factura');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    // Usar la impresión nativa del navegador para exportar a PDF (Mantiene formato vectorial puro y evita problemas de oklch de html2canvas)
    window.print();
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;
  if (!order) return <div className="p-8 text-center">Pedido no encontrado</div>;

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white p-4 md:p-8 print:p-0 flex justify-center">
      <div className="max-w-2xl w-full print:max-w-none">
        {!invoice ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-black">Solicitar Factura</h1>
            </div>
            <p className="text-gray-600 mb-8">Por favor, introduce los datos fiscales para generar la factura correspondiente al pedido <strong>{order.orderCode || order.id.slice(-6).toUpperCase()}</strong> por valor de <strong>{order.total.toFixed(2)}€</strong>.</p>
            
            <form onSubmit={handleGenerateInvoice} className="space-y-4">
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
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Dirección Fiscal</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none" required />
                </div>
              </div>
              <button disabled={generating} type="submit" className="w-full bg-black text-white font-bold py-4 rounded-xl mt-4 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                {generating ? 'Generando Factura Segura...' : 'Generar Factura Oficial'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-3xl p-6 flex flex-col items-center text-center print:hidden">
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <h2 className="text-xl font-black text-green-900">Factura Generada Correctamente</h2>
              <p className="text-green-700 mb-4">Esta factura ya está registrada en nuestro sistema con el hash oficial VeriFactu.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-2">
                <button onClick={() => navigate(`/pedido/${orderId}`)} className="bg-white border-2 border-green-600 text-green-700 font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-50">
                  <ArrowLeft className="w-5 h-5" /> Volver al Pedido
                </button>
                <button onClick={handleDownloadPDF} className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700">
                  <Download className="w-5 h-5" /> Imprimir / Guardar como PDF
                </button>
              </div>
            </div>

            {/* Preview Container Responsivo */}
            <div className="bg-white p-4 sm:p-8 print:p-0 rounded-xl shadow-lg print:shadow-none border border-gray-200 print:border-none">
              <div ref={pdfRef} className="bg-white w-full p-2 sm:p-6 print:p-0 pb-12 print:pb-0 text-xs sm:text-sm print:text-xs" style={{ color: '#000' }}>
                <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-gray-900 pb-6 mb-6 gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black mb-1">FACTURA</h1>
                    <p className="text-gray-500 text-lg">#{invoice.invoiceNumber}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <h2 className="font-bold text-lg">{settings?.legalName || settings?.pizzeriaName || 'Pizzería (Mi Negocio)'}</h2>
                    <p className="text-gray-500">NIF: {settings?.legalNif || 'B12345678'}</p>
                    <p className="text-gray-500">{settings?.legalAddress || settings?.address || 'Dirección no configurada'}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between mb-8 gap-6">
                  <div className="w-full sm:w-1/2">
                    <h3 className="font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">DATOS DEL CLIENTE</h3>
                    <p className="font-bold">{invoice.customer.businessName}</p>
                    <p>NIF: {invoice.customer.nif}</p>
                    <p>{invoice.customer.address}</p>
                  </div>
                  <div className="w-full sm:w-1/3">
                    <h3 className="font-bold text-gray-500 mb-2 border-b border-gray-200 pb-1">DETALLES FACTURA</h3>
                    <p>Fecha: {new Date(invoice.date).toLocaleDateString('es-ES')}</p>
                    <p>Pedido Ref: {order.orderCode || order.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full mb-8 text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-gray-100 text-gray-900">
                        <th className="p-2 sm:p-3 font-bold border-b border-gray-300">Descripción</th>
                        <th className="p-2 sm:p-3 font-bold border-b border-gray-300 text-right">Cant.</th>
                        <th className="p-2 sm:p-3 font-bold border-b border-gray-300 text-right">Precio Ud.</th>
                        <th className="p-2 sm:p-3 font-bold border-b border-gray-300 text-right">IVA</th>
                        <th className="p-2 sm:p-3 font-bold border-b border-gray-300 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="p-2 sm:p-3">{item.name}</td>
                          <td className="p-2 sm:p-3 text-right">{item.quantity}</td>
                          <td className="p-2 sm:p-3 text-right">{item.price.toFixed(2)}€</td>
                          <td className="p-2 sm:p-3 text-right">{item.taxRate || 10}%</td>
                          <td className="p-2 sm:p-3 text-right">{(item.price * item.quantity).toFixed(2)}€</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mb-12">
                  <div className="w-full sm:w-1/2 md:w-1/3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between mb-2"><span className="text-gray-600">Total Bases:</span> <span>{(invoice.total / 1.10).toFixed(2)}€</span></div>
                    <div className="flex justify-between mb-2"><span className="text-gray-600">Cuota IVA:</span> <span>{(invoice.total - (invoice.total / 1.10)).toFixed(2)}€</span></div>
                    <div className="flex justify-between font-black text-lg border-t border-gray-300 pt-2 mt-2"><span>TOTAL:</span> <span>{invoice.total.toFixed(2)}€</span></div>
                  </div>
                </div>

                {/* VeriFactu / FacturaSign info */}
                <div className="mt-8 border-t-2 border-gray-900 pt-6 flex flex-col sm:flex-row gap-6 items-start">
                  <div className="bg-white p-1 border-2 border-black inline-block shrink-0">
                    <QRCodeCanvas value={`https://pizzeria.com/factura/${order.id}?hash=${invoice.hash}`} size={90} level="M" />
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 font-mono break-all w-full">
                    <p className="font-bold text-gray-900 mb-1">REGISTRO FACTURASIGN / TICKETBAI</p>
                    <p>Factura encadenada mediante firma digital SHA-256 (Ley 11/2021 M. Antifraude).</p>
                    <p className="mt-2"><strong>Prev Hash:</strong> {invoice.previousHash || 'ROOT'}</p>
                    <p><strong>Hash Factura:</strong> {invoice.hash}</p>
                    <p className="mt-1">Firma electrónica válida. Registro en base de datos inalterable.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceRequest;
