import React, { useEffect, useRef, useState } from 'react';
import { collection, query, onSnapshot, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { printKitchenTicket, printDeliveryLabel } from '../../utils/printer';

const AutoPrinter = ({ globalSettings }) => {
  const [orders, setOrders] = useState([]);
  const printingQueueRef = useRef(new Set());
  const deliveryQueueRef = useRef(new Set());
  const autoPrintTickets = globalSettings?.autoPrintTickets || false;

  useEffect(() => {
    if (!globalSettings) return;

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [globalSettings]);

  useEffect(() => {
    if (!autoPrintTickets || !globalSettings) return;

    orders.forEach(async (orderData) => {
      // 1. Kitchen Tickets
      if (orderData.status !== 'COMPLETED' && orderData.status !== 'SERVED') {
        const unprintedItems = orderData.items?.filter(i => i.printed === false) || [];
        
        if (unprintedItems.length > 0) {
          const printBatchId = `${orderData.id}_${unprintedItems.length}`;
          if (!printingQueueRef.current.has(printBatchId)) {
            printingQueueRef.current.add(printBatchId);

            printKitchenTicket(orderData, globalSettings, unprintedItems);
            
            try {
              const freshSnap = await getDoc(doc(db, 'orders', orderData.id));
              if (freshSnap.exists()) {
                const freshData = freshSnap.data();
                const updatedItems = freshData.items.map(i => {
                  if (i.printed === false) return { ...i, printed: true };
                  return i;
                });
                await updateDoc(doc(db, 'orders', orderData.id), { items: updatedItems });
              }
            } catch(e) {
              console.error("Error marcando ítems como impresos", e);
              printingQueueRef.current.delete(printBatchId);
            }
          }
        }
      }


    });
  }, [orders, autoPrintTickets, globalSettings]);

  return null;
};

export default AutoPrinter;
