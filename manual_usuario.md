# Manual de Usuario y Guía Comercial - Sistema Integral para Pizzerías (Slice)

Bienvenido a la guía definitiva de tu nuevo sistema de gestión integral. Este documento no es solo un manual de instrucciones, sino un recorrido por todas las herramientas que tienes a tu disposición para modernizar tu pizzería, aumentar tus ventas y optimizar el tiempo de tu equipo.

Tu nueva plataforma se divide en **tres pilares fundamentales**: la experiencia de tus clientes (la web), el centro de control de tu local (el TPV y Kanban), y la logística de reparto.

---

## 1. La Experiencia del Cliente: Tu Escaparate Digital

Tus clientes accederán a una página web moderna, rápida y diseñada específicamente para convertir visitas en pedidos. Todo el proceso está automatizado para que tú solo te preocupes de cocinar.

### 1.1. Menú Digital y Carrito Inteligente
- **Catálogo Dinámico**: Tus clientes navegan por categorías visuales. Al seleccionar una pizza, pueden añadir ingredientes extra, quitar ingredientes que no les gustan, o seleccionar el tamaño. Todo se suma al precio en tiempo real.
- **Validación Logística Automática**: El carrito es inteligente. Si un cliente pide a domicilio, el sistema comprobará **al instante** si su Código Postal o su distancia en kilómetros entra dentro del radio de reparto que tú has configurado. Si vive demasiado lejos, el sistema le avisará de que no es posible el envío, ahorrándote llamadas incómodas.

### 1.2. Fidelización de Clientes (El imán de ventas)
Conseguir un cliente nuevo es caro; mantenerlo es barato. La plataforma cuenta con un sistema de fidelización integrado e invisible:
- **No hace falta registrarse**: El sistema reconoce a los clientes simplemente por su número de teléfono al hacer un pedido (tanto en la web como por teléfono en el local).
- **Premios automáticos**: Tú decides la regla (ejemplo: "1 Pizza Gratis cada 10 pedidos"). El cliente podrá ver una barra de progreso animada en su pantalla de seguimiento. Cuando alcanza la meta, en su próximo pedido le aparecerá un banner felicitándole.
- **Transparencia en el Carrito**: Cuando el cliente canjea un premio, este se añade automáticamente al carrito con coste 0€. El cliente puede ver su regalo junto a las demás pizzas e incluso editar el resto de su pedido sin perder la recompensa. Además, al ser un producto real, aparecerá en tu Kanban de la cocina junto a las demás pizzas, ¡imposible que se le olvide al cocinero!

### 1.3. Pasarela de Pagos de Última Generación
Se acabó el perder ventas porque el cliente no tiene efectivo. Si un cliente hace un pedido por la web para Recoger o a Domicilio, se le exigirá pagar por adelantado para evitar pedidos falsos.
- **Pago Seguro Online**: En un solo botón, el sistema unifica el pago por Tarjeta, **Apple Pay, Google Pay y Bizum**.
- **Traslado de Comisiones**: Puedes configurar el sistema para cobrar un pequeño recargo fijo o porcentual si pagan online, cubriendo así las comisiones bancarias.

### 1.4. Pantalla de Seguimiento (Tracking) Animada
Una vez pagado, el cliente es redirigido a una pantalla de seguimiento con un diseño premium:
- Ve una línea de tiempo real: *Recibido -> En Preparación -> Listo -> Entregado*.
- **Facturación Instantánea**: Puede solicitar una Factura Oficial en PDF con tus datos fiscales de forma totalmente automática.

---

## 2. El Corazón del Local: El TPV y Kanban de Cocina

Toda la magia operativa ocurre en el panel de administración, diseñado para usarse en ordenadores o pantallas táctiles dentro de la cocina.

### 2.1. Tablero de Producción (Kanban)
Se acabó el papel. Los pedidos entran directamente a tu tablero visual en la columna de "Nuevos Pedidos".
- **Gestión Visual (Drag & Drop)**: Arrastra los pedidos por las diferentes fases (*Preparación, Listo, Reparto, Completado*). El cliente lo verá reflejado en su móvil al segundo.
- **Anti-Toques Accidentales**: Si usas una tablet, el sistema requiere mantener el dedo pulsado 350 milisegundos para coger una tarjeta, permitiéndote hacer scroll sin moverlos por accidente.

### 2.2. Toma de Pedidos Manual (Mostrador y Teléfono)
El botón "+ Nuevo Pedido" te permite meter comandas a la velocidad de la luz para clientes presenciales o llamadas.
- Puedes marcar el pedido como pagado en **Efectivo** o **Tarjeta (datáfono físico)**.
- Para envíos, puedes marcar el pedido como "Cobrar en puerta", delegando el cobro en el repartidor. (A diferencia de la web, desde aquí sí puedes saltarte el cobro por adelantado).

### 2.3. Impresión Inteligente de Etiquetas para Cajas
El sistema está preparado para funcionar con impresoras térmicas de rollo continuo (como la Brother QL-800, de 62mm). La lógica de impresión es totalmente inteligente y se basa en el producto, no en la sección de cocina.

- **Configuración por Producto**: Al crear o editar un producto en tu carta, verás una casilla llamada **"📦 Lleva caja individual"**. Solo debes marcarla en los productos que físicamente necesiten una pegatina (ej: Pizzas, Calzones, Postres en caja), dejando sin marcar las bebidas o los extras.
- **El Gatillo de Impresión (Trigger)**: No importa cuántas secciones o columnas hayas creado en tu Kanban. Siempre que muevas una tarjeta de pedido a **la última columna** de su respectiva sección (ej: "Listo" o "Caja"), el sistema hará un barrido de ese pedido y mandará a imprimir **solo las etiquetas de los productos que lleven caja**.
- **Múltiples Cajas y Numeración Global**: Si un pedido tiene 2 pizzas y 1 postre, el sistema calcula el total de cajas necesarias para todo el pedido (3 cajas). Cuando el Horno saque las pizzas, imprimirá "Caja 1 de 3" y "Caja 2 de 3". Cuando la sección de Postres termine, imprimirá su "Caja 3 de 3". ¡Cero confusiones!
- **Resto del Pedido & QR**: En la etiqueta de cada caja, verás en grande el producto a meter dentro, y abajo en pequeño un resumen de las bebidas o extras para guiar a quien ensambla el pedido. Además, un **Código QR** en la esquina permite escanear la etiqueta con el móvil y ver el estado global del pedido al instante.
- **Impresión Silenciosa (Modo Kiosko)**: Para que no salga la molesta ventana de imprimir de Windows, configura el Modo Kiosko. Haz clic derecho en el acceso directo de Google Chrome, elige *Propiedades* y en el campo "Destino", añade al final del texto un espacio seguido de la palabra `--kiosk-printing`.

---

## 3. Logística y Repartidores: La App Móvil

Tus repartidores tienen acceso a una URL especial (`/repartidor`) pensada exclusivamente para usarse desde su teléfono móvil.
- **Asignación Rápida**: Ven únicamente los pedidos que están listos para salir. Al tocar uno, se lo asignan a su nombre.
- **Integración con Google Maps**: Con pulsar un botón, se les abre el GPS de su móvil con la ruta exacta.
- **Confirmación de Entrega**: Al entregar la pizza, pulsan "Entregado" y el pedido pasa al archivo de "Completados".

---

## 4. Control Total: Configuración del Negocio

El sistema se adapta a ti, no tú al sistema. En el panel de configuración (⚙️) tienes el control absoluto:
- **Identidad**: Cambia el nombre comercial, la razón social y el Logo.
- **Logística Geográfica**: Define los gastos de envío y los códigos postales permitidos.

### 4.1. Conexión Bancaria y Activación de Bizum
Tu sistema incluye la tecnología financiera de Stripe para procesar los cobros sin que tú toques el dinero del cliente. El dinero va directo de la tarjeta del consumidor al banco de la pizzería.

Para que las pizzerías puedan empezar a cobrar, solo deben seguir estos dos pasos vitales:

**Paso 1: Conectar la Cuenta Bancaria**
En el menú Configuración > Datos y Envíos, pulsa el botón negro **"Conectar con Stripe"**. Te pedirá que introduzcas el CIF/DNI de la empresa y el número IBAN (cuenta bancaria) donde quieres que Stripe te ingrese el dinero de las ventas online.

**Paso 2: Activar Bizum en Stripe**
Por motivos de regulación financiera en España, el titular de la pizzería debe aceptar personalmente el contrato de Bizum. **¡No viene encendido por defecto!**
1. Una vez hayas conectado el banco, vuelve a pulsar el botón (que ahora dirá "Ir al panel de Stripe") para abrir el panel financiero de tu cuenta conectada.
2. En la esquina superior derecha, haz clic en la **Rueda dentada (Configuración)**.
3. Entra en el apartado **Métodos de pago** (Payment methods).
4. En la lista que aparece, busca la opción **Bizum** y enciende el interruptor. Te pedirá que aceptes los términos de uso.
5. ¡Listo! A partir de este segundo, a tus clientes les saldrá la opción de pagar con Bizum en tu web, y el dinero te llegará directamente a ti.

---

## 5. Finanzas y Gestoría: El Cierre de Caja

En la sección de Estadísticas (📊), tienes el pulso económico de tu negocio.

### 5.1. Rendimiento en Tiempo Real
- Monitoriza las ventas del día, el número de pedidos y tu Ticket Medio.
- Comprueba exactamente cuánto dinero deberías tener en el cajón de las monedas (Efectivo) y cuánto ha pasado por el datáfono o internet (Tarjetas/Online).

### 5.2. El Cierre de Caja (Cierre Z)
Al terminar la jornada, pulsa "Cerrar Caja". 
- El sistema guarda una "fotografía" inmutable de todo lo vendido en ese turno.
- Los contadores de la pantalla principal se ponen a 0€, dejando el sistema listo para el día siguiente.

### 5.3. Exportación para tu Gestoría (CSV)
Ahorra horas de trabajo a final de mes. Selecciona cualquier rango de fechas y el sistema generará al instante un archivo Excel (CSV) con el desglose profesional de las ventas, listo para enviárselo a tu gestor.

---
¡Disfruta de tu nuevo sistema y lleva tu pizzería al siguiente nivel!
