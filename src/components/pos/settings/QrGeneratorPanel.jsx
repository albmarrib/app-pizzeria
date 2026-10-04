import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

const QrGeneratorPanel = () => {
  const qrUrl = `${window.location.origin}/?mode=view`;
  const qrRef = useRef(null);

  const downloadQR = () => {
    const svg = qrRef.current;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    // Convert SVG to data URI
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      // Create a canvas with padding and white background
      canvas.width = img.width + 80;
      canvas.height = img.height + 120; // Extra space for text
      
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw image
      ctx.drawImage(img, 40, 40);
      
      // Draw text
      ctx.fillStyle = "black";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("ESCANEA PARA VER LA CARTA", canvas.width / 2, canvas.height - 30);

      // Download
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = "carta_qr.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <QrCode className="w-6 h-6 text-red-600" /> Códigos QR
        </h2>
        <p className="text-gray-500 mt-2">
          Genera y descarga códigos QR para poner en tus mesas. Los clientes podrán ver la carta digital completa, pero no podrán realizar pedidos.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-12 bg-gray-50 p-8 rounded-3xl border border-gray-100">
        <div className="bg-white p-6 rounded-3xl shadow-md inline-block">
          <QRCodeSVG 
            id="qr-code-svg"
            value={qrUrl} 
            size={256} 
            level="H"
            includeMargin={true}
            ref={qrRef}
          />
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Carta Digital (Modo Vista)</h3>
            <p className="text-gray-600 text-sm">
              Al escanear este código, los clientes accederán a:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 text-left md:w-3/4 mx-auto md:mx-0">
              <li className="flex items-center gap-2">✅ La carta completa siempre actualizada</li>
              <li className="flex items-center gap-2">✅ Fotos, alérgenos y precios</li>
              <li className="flex items-center gap-2">❌ <strong>No</strong> podrán añadir productos al carrito</li>
              <li className="flex items-center gap-2">❌ <strong>No</strong> podrán enviar pedidos a cocina</li>
            </ul>
          </div>
          
          <button 
            onClick={downloadQR}
            className="w-full md:w-auto bg-black hover:bg-gray-900 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <Download className="w-5 h-5" /> Descargar QR en Imagen (PNG)
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrGeneratorPanel;
