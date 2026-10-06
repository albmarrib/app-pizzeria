import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CustomerWeb from './pages/CustomerWeb';
import POSDashboard from './pages/POSDashboard';
import DeliveryDriver from './pages/DeliveryDriver';
import OrderTracking from './pages/OrderTracking';
import InvoiceRequest from './pages/InvoiceRequest';
import LegalPage from './pages/LegalPage';
import './App.css'; // Mantenemos si hay estilos específicos

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta para clientes */}
        <Route path="/" element={<CustomerWeb />} />
        
        {/* Ruta para el panel de control del mostrador */}
        <Route path="/pos" element={<POSDashboard />} />

        {/* Ruta para la aplicación móvil del repartidor */}
        <Route path="/repartidor" element={<DeliveryDriver />} />

        {/* Tracking & Factura */}
        <Route path="/pedido/:orderId" element={<OrderTracking />} />
        <Route path="/factura/:orderId" element={<InvoiceRequest />} />
        
        {/* Páginas Legales */}
        <Route path="/legal/:type" element={<LegalPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
