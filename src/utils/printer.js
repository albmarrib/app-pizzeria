// utils/printer.js

// 1. Etiqueta de Salida (Cajas / Delivery)
export const printDeliveryLabel = (order, settings, specificItemIndex = null) => {
  // Exclusión estricta: No se imprimen pegatinas de caja para pedidos de mesa
  if (order.orderType === 'dine_in') {
    console.log("Impresión de etiquetas omitida para pedido de mesa (dine_in).");
    return;
  }

  const companyName = settings?.pizzeriaName || "";
  
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

  let boxesToPrint = [];
  if (specificItemIndex !== null && specificItemIndex !== undefined) {
    boxesToPrint = globalBoxes.filter(box => box.originalIndex === specificItemIndex);
  } else {
    boxesToPrint = globalBoxes;
  }

  if (boxesToPrint.length === 0) return;

  const orderTypeStr = order.orderType === 'delivery' ? 'A DOMICILIO' : 'RECOGER';
  const orderIdShort = order.id.slice(-4).toUpperCase();
  const dateStr = order.createdAt instanceof Date ? order.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(order.createdAt?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const orderUrl = window.location.origin + '/pedido/' + order.id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(orderUrl)}`;

  const getRestOfOrderSummary = (currentItemName) => {
    const otherItems = order.items.filter(i => i.name !== currentItemName);
    if (otherItems.length === 0) return "";
    const summary = otherItems.map(i => `+${i.quantity}x ${i.name}`).join(', ');
    return `<div class="summary"><b>Resto del pedido:</b> ${summary}</div>`;
  };

  let htmlContent = '';
  
  boxesToPrint.forEach((box) => {
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

  const styles = `
    <style>
      @page { margin: 0; }
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.2; color: #000; width: 62mm; }
      .ticket { padding: 4mm 2mm; page-break-after: always; }
      .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
      .company { font-weight: bold; font-size: 14px; }
      .order-number { font-weight: 900; font-size: 18px; margin: 2px 0; }
      .date-time { font-size: 10px; color: #333; }
      .qr-container { display: flex; justify-content: center; margin: 4px 0; }
      .qr-container img { width: 40px; height: 40px; }
      .order-type { font-weight: bold; font-size: 14px; padding: 2px; margin-top: 4px; border: 2px solid #000; }
      .box-count { text-align: center; font-weight: 900; font-size: 16px; margin: 4px 0; background-color: #000; color: #fff; padding: 2px; }
      .main-item { display: flex; align-items: flex-start; margin: 6px 0 2px 0; }
      .main-qty { font-weight: 900; font-size: 22px; margin-right: 6px; }
      .main-name { font-weight: 900; font-size: 20px; line-height: 1.1; }
      .modifiers { font-weight: bold; font-size: 14px; margin-left: 20px; padding-bottom: 6px; }
      .summary { font-size: 11px; font-style: italic; border-top: 1px dotted #000; padding-top: 4px; margin-top: 4px; }
      .delivery-info { margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; font-size: 12px; }
      .notes { margin-top: 4px; background: #f0f0f0; padding: 2px; font-weight: bold; }
    </style>
  `;

  executePrint(htmlContent, styles);
};

// 2. Ticket de Cocina (Entrada / Kanban)
export const printKitchenTicket = (order, settings, newItemsOnly = null) => {
  const companyName = settings?.pizzeriaName || "";
  const orderIdShort = order.id.slice(-4).toUpperCase();
  const dateStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  // Destino Destacado
  let destinationHeader = '';
  if (order.orderType === 'dine_in') {
    destinationHeader = `>> MESA: ${order.tableName || order.tableId || 'Barra'} <<`;
  } else if (order.orderType === 'delivery') {
    destinationHeader = `DELIVERY`;
  } else {
    destinationHeader = `RECOGER`;
  }

  // Items a imprimir
  const itemsToPrint = newItemsOnly || order.items;

  let itemsHtml = '';
  itemsToPrint.forEach(item => {
    itemsHtml += `
      <div class="k-item">
        <div class="k-qty">${item.quantity}x</div>
        <div class="k-details">
          <div class="k-name">${item.name}</div>
          ${item.modifiers ? `<div class="k-mods">${item.modifiers}</div>` : ''}
        </div>
      </div>
    `;
  });

  const htmlContent = `
    <div class="kitchen-ticket">
      <div class="k-header">
        <div class="k-company">${companyName} - COCINA</div>
        <div class="k-dest ${order.orderType}">${destinationHeader}</div>
        <div class="k-meta">PEDIDO #${orderIdShort} • ${dateStr}</div>
      </div>
      
      <div class="k-items-list">
        ${itemsHtml}
      </div>

      ${order.notes ? `<div class="k-notes"><b>NOTAS:</b> ${order.notes}</div>` : ''}
    </div>
  `;

  const styles = `
    <style>
      @page { margin: 0; }
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.3; color: #000; width: 80mm; /* Impresora de cocina típica 80mm */ }
      .kitchen-ticket { padding: 4mm; }
      .k-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
      .k-company { font-size: 14px; color: #555; }
      .k-dest { font-weight: 900; font-size: 24px; margin: 4px 0; border: 3px solid #000; padding: 4px; display: inline-block; width: 90%; text-transform: uppercase; }
      .k-dest.dine_in { background-color: #000; color: #fff; }
      .k-meta { font-weight: bold; font-size: 16px; margin-top: 4px; }
      .k-items-list { margin-bottom: 10px; }
      .k-item { display: flex; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 4px; }
      .k-qty { font-weight: 900; font-size: 20px; min-width: 35px; }
      .k-details { flex-grow: 1; }
      .k-name { font-weight: 900; font-size: 18px; }
      .k-mods { font-weight: bold; font-size: 14px; color: #333; margin-left: 10px; }
      .k-notes { border: 2px dashed #000; padding: 6px; font-weight: 900; font-size: 16px; background-color: #f9f9f9; }
    </style>
  `;

  executePrint(htmlContent, styles);
};

// Utilidad interna para ejecutar el iframe
const executePrint = (htmlContent, styles) => {
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
  doc.write('<html><head><title>Print</title>' + styles + '</head><body>' + htmlContent + '</body></html>');
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  }, 500); 
};

