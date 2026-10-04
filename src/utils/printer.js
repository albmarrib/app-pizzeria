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
      .k-dest { font-weight: 900; font-size: 26px; margin: 4px 0; border: 3px solid #000; padding: 8px; display: inline-block; width: 90%; text-transform: uppercase; text-align: center; }
      .k-dest.dine_in { color: #000; border: 4px solid #000; border-radius: 8px; }
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

// 3. Ticket Resumen (Pre-cuenta de Mesa con precios)
export const printOrderSummary = (order, settings) => {
  const companyName = settings?.pizzeriaName || "PIZZERÍA";
  const dateStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const dateFull = new Date().toLocaleDateString();
  
  const orderUrl = window.location.origin + '/pedido/' + order.id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(orderUrl)}`;
  
  let itemsHtml = '';
  order.items.forEach(item => {
    const totalItemPrice = item.price * item.quantity;
    itemsHtml += `
      <div class="s-item">
        <div class="s-qty">${item.quantity}x</div>
        <div class="s-name">
          <div>${item.name}</div>
          ${item.modifiers ? `<div class="s-mods">${item.modifiers}</div>` : ''}
        </div>
        <div class="s-price">${totalItemPrice.toFixed(2)}€</div>
      </div>
    `;
  });

  const total = order.total || 0;
  const paidAmount = order.paidAmount || 0;
  const remainingAmount = Math.max(0, total - paidAmount);

  const htmlContent = `
    <div class="summary-ticket">
      <div class="s-header">
        <div class="s-company">${companyName}</div>
        <div class="s-meta"><b>MESA: ${order.tableName || order.tableId || 'Barra'}</b></div>
        <div class="s-meta">FECHA: ${dateFull} ${dateStr}</div>
        <div class="s-meta-small">TICKET NO VÁLIDO COMO FACTURA</div>
        <div class="qr-container"><img src="${qrUrl}" alt="QR Factura" /></div>
        <div class="s-meta-small" style="font-weight:bold;">Escanea para factura online</div>
      </div>
      
      <div class="s-items-list">
        ${itemsHtml}
      </div>

      <div class="s-totals">
        <div class="s-total-line">
          <span>TOTAL:</span>
          <span>${total.toFixed(2)}€</span>
        </div>
        ${paidAmount > 0 ? `
          <div class="s-total-line s-paid">
            <span>PAGADO:</span>
            <span>-${paidAmount.toFixed(2)}€</span>
          </div>
          <div class="s-total-line s-remaining">
            <span>PENDIENTE:</span>
            <span>${remainingAmount.toFixed(2)}€</span>
          </div>
        ` : ''}
      </div>
      
      <div class="s-footer">
        ¡Gracias por su visita!
      </div>
    </div>
  `;

  const styles = `
    <style>
      @page { margin: 0; }
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.2; color: #000; width: 80mm; }
      .summary-ticket { padding: 4mm; }
      .s-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
      .s-company { font-weight: 900; font-size: 18px; margin-bottom: 4px; }
      .s-meta { font-size: 14px; margin: 2px 0; }
      .s-meta-small { font-size: 10px; margin-top: 4px; font-style: italic; }
      .qr-container { display: flex; justify-content: center; margin: 8px 0; }
      .qr-container img { width: 70px; height: 70px; }
      .s-items-list { border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
      .s-item { display: flex; align-items: flex-start; margin-bottom: 6px; font-size: 14px; }
      .s-qty { font-weight: bold; width: 30px; }
      .s-name { flex-grow: 1; padding-right: 10px; }
      .s-mods { font-size: 11px; font-style: italic; color: #444; }
      .s-price { font-weight: bold; width: 60px; text-align: right; }
      .s-totals { margin-bottom: 12px; }
      .s-total-line { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-bottom: 4px; }
      .s-paid { color: #555; font-size: 14px; }
      .s-remaining { font-size: 20px; font-weight: 900; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
      .s-footer { text-align: center; font-size: 12px; font-style: italic; border-top: 1px solid #000; padding-top: 8px; }
    </style>
  `;

  executePrint(htmlContent, styles);
};

// 4. Informe de Cierre de Caja (Pedidos Completados)
export const printCompletedOrdersReport = (completedOrders, stats, settings) => {
  const companyName = settings?.pizzeriaName || "Pizzería";
  const dateStr = new Date().toLocaleDateString('es-ES');
  const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

  const simplificados = completedOrders.filter(o => !o.invoiceId).length;
  const facturas = completedOrders.filter(o => o.invoiceId).length;

  let ordersHtml = '';
  completedOrders.forEach(order => {
    const orderDate = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt?.seconds * 1000);
    const orderTime = orderDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const typeStr = order.orderType === 'delivery' ? 'Domicilio' : order.orderType === 'pickup' ? 'Recoger' : 'Mesa';
    const payStr = order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod === 'split' ? 'Mixto' : 'Tarjeta';
    
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
      itemsHtml = '<div class="o-items-list">';
      order.items.forEach(item => {
        itemsHtml += `<div class="o-item-row"><span class="o-item-qty">${item.quantity}x</span><span class="o-item-name">${item.name}</span></div>`;
      });
      itemsHtml += '</div>';
    }

    ordersHtml += `
      <div class="o-item">
        <div class="o-head">
          <span class="o-id">#${order.id.slice(-4).toUpperCase()}</span>
          <span class="o-time">${orderTime}</span>
        </div>
        <div class="o-client">${order.customerInfo?.name || 'Cliente'} (${typeStr})</div>
        ${itemsHtml}
        <div class="o-total">${Number(order.total || 0).toFixed(2)}€ [${payStr}]</div>
      </div>
    `;
  });

  const htmlContent = `
    <div class="report-ticket">
      <div class="r-header">
        <div class="r-company">${companyName}</div>
        <div class="r-title">CIERRE DE CAJA</div>
        <div class="r-meta">FECHA: ${dateStr} ${timeStr}</div>
      </div>
      
      <div class="r-summary">
        <div class="r-line"><span>Total Pedidos:</span> <span>${stats.totalOrders}</span></div>
        <div class="r-line"><span>Simplificados:</span> <span>${simplificados}</span></div>
        <div class="r-line"><span>F. Nominativas:</span> <span>${facturas}</span></div>
        <div class="r-line r-money"><span>Esperado Caja:</span> <span>${stats.cashTotal.toFixed(2)}€</span></div>
        <div class="r-line r-money"><span>Tarjeta/Online:</span> <span>${stats.cardTotal.toFixed(2)}€</span></div>
        <div class="r-line r-total"><span>TOTAL ACUMULADO:</span> <span>${stats.totalSales.toFixed(2)}€</span></div>
      </div>

      <div class="r-list-title">PEDIDOS COMPLETADOS</div>
      <div class="r-orders">
        ${ordersHtml}
      </div>
      
      <div class="r-footer">Fin del informe</div>
    </div>
  `;

  const styles = `
    <style>
      @page { margin: 0; }
      body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #000; width: 80mm; }
      .report-ticket { padding: 4mm; }
      .r-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
      .r-company { font-weight: 900; font-size: 18px; margin-bottom: 4px; }
      .r-title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
      .r-meta { font-size: 12px; }
      
      .r-summary { border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
      .r-line { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
      .r-money { font-weight: bold; }
      .r-total { font-weight: 900; font-size: 16px; margin-top: 6px; border-top: 1px solid #000; padding-top: 4px; }
      
      .r-list-title { font-weight: bold; font-size: 14px; text-align: center; margin-bottom: 8px; }
      
      .o-item { border-bottom: 1px dotted #888; padding-bottom: 6px; margin-bottom: 6px; }
      .o-head { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; }
      .o-client { font-size: 12px; margin: 2px 0; font-weight: 600; }
      .o-items-list { margin: 4px 0 6px 0; font-size: 11px; padding-left: 4px; border-left: 2px solid #ddd; }
      .o-item-row { display: flex; gap: 4px; margin-bottom: 2px; }
      .o-item-qty { font-weight: bold; min-width: 20px; }
      .o-total { font-size: 13px; font-weight: bold; text-align: right; border-top: 1px dashed #eee; padding-top: 2px; }
      
      .r-footer { text-align: center; font-size: 12px; margin-top: 12px; }
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

