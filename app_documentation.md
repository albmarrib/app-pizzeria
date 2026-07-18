# Documentación del Sistema SaaS para Pizzerías (Slice)

Esta documentación describe en detalle la arquitectura, flujos de trabajo y funcionalidades del sistema completo, diseñada para que agentes de IA (como Retell), integradores y desarrolladores entiendan cómo interactuar y comprender el estado de la plataforma.

---

## 1. Arquitectura General

El sistema está construido como una **Single Page Application (SPA)** usando **React** y **Vite**, desplegado en **Vercel**. 
El backend es 100% Serverless utilizando **Firebase** (Firestore para base de datos, Storage para imágenes de productos/logos).
Para los pagos online seguros se integra **Stripe Connect** con flujos compatibles con PSD2 (3D Secure).

### Módulos Principales (Rutas)
- `/` - **Web del Cliente**: Menú digital, carrito, fidelización y checkout.
- `/pos` - **Terminal de Punto de Venta (TPV / POS)**: Panel de control del restaurante (Kanban), métricas y configuración del local.
- `/repartidor` - **App del Repartidor**: Vista optimizada para móvil para gestionar entregas en ruta.
- `/pedido/:orderId` - **Pantalla de Seguimiento (Tracking)**: Vista en tiempo real del estado de la pizza para el cliente.
- `/factura/:orderId` - **Facturación (PDF)**: Generación automática de facturas legales descargables para el cliente.

---

## 2. Base de Datos (Estructura en Firestore)

El sistema utiliza colecciones NoSQL en tiempo real:

- `orders`: Almacena todos los pedidos.
  - **Estados posibles (`status`)**: `'PAYMENT_PENDING'`, `'Nuevos Pedidos'`, `'IN_PROGRESS'`, `'READY_FOR_ASSEMBLY'`, `'OUT_FOR_DELIVERY'`, `'COMPLETED'`, `'CANCELED'`.
  - **Estados de Pago (`paymentStatus`)**: `'Pendiente'`, `'Pagado'`.
  - **Métodos de pago**: Efectivo, Tarjeta (TPV físico), Apple Pay, Google Pay, Tarjeta (Stripe Online).
- `products`: Catálogo de productos. Organizado por `category` e incluye modificadores (`modifiers`).
- `categories`: Define el orden y los nombres de las categorías del menú.
- `settings/general`: Configuración centralizada del restaurante (SaaS).
- `daily_closings`: Registro inmutable de los cierres de caja (Z).
- `customers`: CRM ligero. Mantiene el teléfono de los clientes y las estadísticas de pedidos para el sistema de fidelidad.

---

## 3. Funcionalidades del Restaurante (TPV - `/pos`)

### Tablero Kanban de Cocina
- Sistema visual de tarjetas tipo Kanban (*Drag and Drop* mediante `dnd-kit`).
- **Estados**: Nuevos Pedidos -> En Preparación -> Listo para Montaje/Recoger -> En Reparto -> Completado.
- **Optimización Táctil**: Adaptado para tablets de cocina. Se requiere una pulsación larga (350ms) para arrastrar una tarjeta, permitiendo el *scroll* vertical normal para navegar por la pantalla.
- **Alertas Visuales**: Si un pedido supera el "Tiempo de Alarma" configurado (ej. 15 minutos), la tarjeta parpadea en rojo para alertar de retrasos.

### Gestión de Pedidos Manual (Mostrador/Teléfono)
- Botón rápido de "+ Nuevo Pedido" para clientes presenciales o por teléfono.
- Permite forzar pagos en efectivo (`cash`) o tarjeta física (`card`) que actualizan instantáneamente la caja.

### Panel de Estadísticas y Cierre de Caja
- Muestra ventas totales, número de pedidos, ticket medio y desglose por método de pago.
- **Exportación CSV a Gestoría**: Permite filtrar por rangos de fechas (Desde - Hasta) y exportar los datos contables estructurados en CSV.
- **Cierre Z**: "Cierra la caja", registrando de forma inmutable lo vendido en la sesión y reiniciando los contadores visuales para el siguiente turno.

### Configuración del Sistema (Settings)
- **Stripe Connect**: Vinculación OAuth directa al banco de la pizzería. Permite añadir un recargo (Fijo € o Porcentaje %) a los clientes que paguen online para compensar comisiones.
- **Logística**: Configuración de coste de envío, y restricción dinámica de zonas (por Códigos Postales concretos o por Radio en KM desde la pizzería).
- **Fidelidad**: Configuración de "Pedidos necesarios para un premio" (ej. 10 pedidos = 1 pizza gratis).

---

## 4. Experiencia del Cliente Web (`/`)

### Menú y Carrito (Drawer)
- Menú con navegación por categorías y selector de modificadores (Ingredientes extra, tamaños, masas).
- El carrito se desliza desde la derecha y requiere validación estricta de datos según el tipo de pedido (Delivery vs Pickup).
- Bloqueo geográfico automático (valida el Código Postal contra la configuración del SaaS en tiempo real).

### Sistema de Fidelidad por Teléfono
- Cuando el cliente introduce su número de teléfono en el carrito, el sistema cruza el dato con el CRM de Firestore en tiempo real.
- Si el cliente tiene un premio desbloqueado, se muestra un banner animado que le permite añadir un producto "Gratis" (con precio 0€) antes de pagar.

### Flujo de Pago Seguro (Stripe 3D Secure)
Para cumplir con la PSD2 europea y evitar pérdida de pedidos:
1. Al seleccionar Pago Online, se crea un pedido "Fantasma" en Firebase (`status: 'PAYMENT_PENDING'`).
2. Se envía al cliente a la pasarela de Stripe. Si el banco exige validación por SMS/App (3D Secure), el usuario abandona la web.
3. Tras autorizar, el banco devuelve al cliente a `/pedido/:orderId?redirect_status=succeeded`.
4. La pantalla detecta el retorno seguro, consolida el pedido como `Pagado`, limpia el carrito local y alerta a la cocina.

---

## 5. Seguimiento y Post-Venta

### Pantalla de Seguimiento Animada (`/pedido/:orderId`)
- Muestra una línea temporal (Timeline) del proceso: *Recibido -> En Preparación -> Listo/En Camino -> Entregado*.
- Si el repartidor tiene nombre asignado, muestra *"Tu repartidor [Nombre] va hacia ti"*.
- Muestra una barra de progreso del sistema de Fidelidad para motivar al cliente a volver.
- Incluye un botón destacado para solicitar factura.

### Sistema de Facturación Legal (`/factura/:orderId`)
- Genera un documento en pantalla apto para imprimir (PDF).
- Incluye los datos fiscales del restaurante (NIF, Razón Social) cargados desde `settings`.
- Botón superior de "Volver al Seguimiento" para facilitar la navegación móvil.

---

## 6. App del Repartidor (`/repartidor`)
- Vista ultra-simplificada para móviles.
- Los repartidores ven solo los pedidos que están en estado `READY_FOR_ASSEMBLY` o `OUT_FOR_DELIVERY`.
- Pueden asignarse a sí mismos a un pedido tocándolo e introduciendo su nombre (o seleccionándolo de una lista si el restaurante los ha pre-configurado).
- Permite abrir la dirección del cliente directamente en Google Maps con un clic.
- Permite marcar pedidos como Completados al entregarlos en puerta.
