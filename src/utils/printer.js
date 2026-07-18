export const printTicket = (order, settings, specificItemIndex = null) => {
  // Configuración de la empresa
  const companyName = settings?.pizzeriaName || "SLICE PIZZA";
  
  // 1. Calcular TODAS las cajas del pedido globalmente para una numeración consistente (X de Y)
  let globalBoxes = [];
  order.items.forEach((item, originalIndex) => {
    if (item.needsBox && item.quantity > 0) {
      for(let i = 0; i < item.quantity; i++) {
        globalBoxes.push({
          ...item,
          originalIndex,
          unitIndex: i
        });
      }
    }
  });

  const totalBoxes = globalBoxes.length;

  // 2. Filtrar solo las cajas que nos han pedido imprimir ahora
  let boxesToPrint = [];
  if (specificItemIndex !== null && specificItemIndex !== undefined) {
    boxesToPrint = globalBoxes.filter(box => box.originalIndex === specificItemIndex);
  } else {
    boxesToPrint = globalBoxes;
  }

  if (boxesToPrint.length === 0) return;

  const orderTypeStr = order.orderType === 'delivery' ? 'A DOMICILIO' : 'RECOGER / MOSTRADOR';
  const orderIdShort = order.id.slice(-4).toUpperCase();
  const dateStr = order.createdAt instanceof Date ? order.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(order.createdAt?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const orderUrl = window.location.origin + '/pedido/' + order.id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(orderUrl)}`;

  // Resumen del resto del pedido
  const getRestOfOrderSummary = (currentItemName) => {
    // Para el resumen, volvemos a mirar los items crudos para no listar 1 a 1, sino agrupado
    const otherItems = order.items.filter(i => i.name !== currentItemName);
    if (otherItems.length === 0) return "";
    
    const summary = otherItems.map(i => `+${i.quantity}x ${i.name}`).join(', ');
    return `<div class="summary"><b>Resto del pedido:</b> ${summary}</div>`;
  };

  let htmlContent = '';
  
  boxesToPrint.forEach((box) => {
    // Buscar su posición exacta en el total del pedido
    const currentBoxIndex = globalBoxes.findIndex(b => b.originalIndex === box.originalIndex && b.unitIndex === box.unitIndex) + 1;
    const boxHeader = totalBoxes > 1 ? `<div class="box-count">CAJA ${currentBoxIndex} de ${totalBoxes}</div>` : '';

    htmlContent += `
      <div class="ticket">
        <div class="header">
          <div class="company">${companyName}</div>
          <div class="qr-container"><img src="${qrUrl}" alt="QR" /></div>
          <div class="order-number">PEDIDO #${orderIdShort}</div>
          <div class="date-time">${dateStr}</div>
          <div class="order-type ${order.orderType}">${orderTypeStr}</div>
        </div>
        
        ${boxHeader}

        <div class="main-item">
          <div class="main-qty">1x</div>
          <div class="main-name">${box.name}</div>
        </div>
        ${box.modifiers ? `<div class="modifiers">${box.modifiers}</div>` : ''}

        ${getRestOfOrderSummary(box.name)}

        ${order.orderType === 'delivery' ? `
          <div class="delivery-info">
            <b>Cliente:</b> ${order.customerInfo?.name || ''}<br>
            <b>Tel:</b> ${order.customerInfo?.phone || ''}<br>
            <b>Dir:</b> ${order.customerInfo?.address || ''} ${order.customerInfo?.postalCode || ''}
          </div>
        ` : `
          <div class="delivery-info">
            <b>Cliente:</b> ${order.customerInfo?.name || 'Cliente'}
          </div>
        `}

        ${order.notes ? `<div class="notes"><b>Notas:</b> ${order.notes}</div>` : ''}
      </div>
    `;
  });

  // Estilos CSS optimizados para Brother QL-800 (62mm continuo)
  const styles = `
    <style>
      @page {
        margin: 0;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 12px;
        line-height: 1.2;
        color: #000;
        width: 62mm; /* Ancho del rollo Brother DK-22205 */
      }
      .ticket {
        padding: 4mm 2mm;
        page-break-after: always;
      }
      .header {
        text-align: center;
        border-bottom: 2px dashed #000;
        padding-bottom: 4px;
        margin-bottom: 4px;
      }
      .company {
        font-weight: bold;
        font-size: 14px;
      }
      .order-number {
        font-weight: 900;
        font-size: 18px;
        margin: 2px 0;
      }
      .date-time {
        font-size: 10px;
        color: #333;
      }
      .qr-container {
        display: flex;
        justify-content: center;
        margin: 4px 0;
      }
      .qr-container img {
        width: 40px;
        height: 40px;
      }
      .order-type {
        font-weight: bold;
        font-size: 14px;
        padding: 2px;
        margin-top: 4px;
        border: 2px solid #000;
      }
      .box-count {
        text-align: center;
        font-weight: 900;
        font-size: 16px;
        margin: 4px 0;
        background-color: #000;
        color: #fff;
        padding: 2px;
      }
      .main-item {
        display: flex;
        align-items: flex-start;
        margin: 6px 0 2px 0;
      }
      .main-qty {
        font-weight: 900;
        font-size: 22px;
        margin-right: 6px;
      }
      .main-name {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.1;
      }
      .modifiers {
        font-weight: bold;
        font-size: 14px;
        margin-left: 20px;
        padding-bottom: 6px;
      }
      .summary {
        font-size: 11px;
        font-style: italic;
        border-top: 1px dotted #000;
        padding-top: 4px;
        margin-top: 4px;
      }
      .delivery-info {
        margin-top: 6px;
        border-top: 1px dashed #000;
        padding-top: 4px;
        font-size: 12px;
      }
      .notes {
        margin-top: 4px;
        background: #f0f0f0;
        padding: 2px;
        font-weight: bold;
      }
    </style>
  `;

  // Crear Iframe Oculto para toda la tanda
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write('<html><head><title>Print Ticket</title>' + styles + '</head><body>' + htmlContent + '</body></html>');
  doc.close();

  // Esperar a que el iframe cargue la imagen QR
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    // Limpiar iframe
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 500); 
};
