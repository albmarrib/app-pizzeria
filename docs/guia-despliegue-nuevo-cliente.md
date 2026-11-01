# Guía Maestra: Despliegue y Configuración para un Nuevo Cliente (Marca Blanca / SaaS)

Esta guía documenta el procedimiento estándar paso a paso para instalar y configurar la aplicación para un nuevo restaurante o pizzería (por ejemplo, *Pizzería Roma*), manteniendo el aislamiento total de datos, cobros y dominios.

---

## 1. Arquitectura de Aislamiento Multi-Cliente

Cada restaurante opera con su propio entorno independiente para garantizar privacidad legal (RGPD), separación fiscal y control del dinero:

```
                          ┌── Pizzería 1 (Moul Snack) ─── Vercel 1 + Firebase 1 + Stripe 1
Tu Repositorio GitHub ────┤
 (Ramas: main / clientes) └── Pizzería 2 (Pizzería Roma) ── Vercel 2 + Firebase 2 + Stripe 2
```

* **Código (GitHub):** Un único repositorio centralizado con rama `main` (app completa) y ramas específicas si un cliente tiene requisitos únicos.
* **Base de Datos (Firebase):** Un proyecto de Firebase exclusivo por restaurante. Ningún restaurante puede ver ni compartir datos con otro.
* **Alojamiento (Vercel):** Un proyecto de Vercel por restaurante con su propio dominio web.
* **Pasarela de Cobros (Stripe):** Una cuenta de Stripe independiente a nombre del CIF/IBAN del restaurante. El dinero va directo a su banco sin intermediarios.

---

## 2. Paso a Paso para Dar de Alta a un Nuevo Cliente

### FASE 1: Crear la Base de Datos en Firebase

1. Entra en [console.firebase.google.com](https://console.firebase.google.com) con tu cuenta de Google.
2. Pulsa en **"Crear un proyecto"** y nómbralo con el nombre del cliente (ej: `pizzeria-roma-saas`). Desactiva Google Analytics para agilizar.
3. **Activar Firestore Database:**
   * Menú lateral -> **Firestore Database** -> Crear base de datos.
   * Ubicación: `eur3 (europe-west)` o la más cercana a España.
   * Modo: Iniciar en modo de producción (o modo de prueba según tus reglas de seguridad).
4. **Obtener las Claves de Conexión:**
   * Rueda de engranaje (arriba a la izquierda) -> **Configuración del proyecto**.
   * En la pestaña *General*, baja hasta "Tus apps" y pulsa en el icono web `</>`.
   * Registra la app con un apodo (ej: `Pizzeria Roma Web`).
   * Copia los valores del objeto `firebaseConfig`:
     * `apiKey` -> `VITE_FIREBASE_API_KEY`
     * `authDomain` -> `VITE_FIREBASE_AUTH_DOMAIN`
     * `projectId` -> `VITE_FIREBASE_PROJECT_ID`
     * `storageBucket` -> `VITE_FIREBASE_STORAGE_BUCKET`
     * `messagingSenderId` -> `VITE_FIREBASE_MESSAGING_SENDER_ID`
     * `appId` -> `VITE_FIREBASE_APP_ID`

---

### FASE 2: Pasarela de Pagos (Stripe)

> [!IMPORTANT]
> **REGLA DE ORO DE SEGURIDAD:**  
> Jamás introduzcas tus claves reales personales (`sk_live_...`) en el proyecto de ningún cliente. Todo proyecto nuevo nace con cobros online apagados.

1. **Estado Inicial (Por Defecto):**
   * En el nuevo Firebase, el documento `settings/general` nace con:
     ```json
     "stripeEnabled": false
     ```
   * En Vercel se configuran claves de prueba (`sk_test_...` y `pk_test_...`) para evitar errores de inicialización.
2. **Cuando el Restaurante Quiera Cobros Online:**
   * Entrégale la guía para clientes (*Activación Stripe para el cliente*).
   * El cliente se registra por su cuenta en [dashboard.stripe.com/register](https://dashboard.stripe.com/register), introduce su DNI, CIF de la empresa e IBAN bancario.
   * El cliente te envía **únicamente 2 claves**:
     * **Clave Pública:** Empieza por `pk_live_...`
     * **Clave Secreta:** Empieza por `sk_live_...`
   * Pegas esas dos claves en las Variables de Entorno de **su proyecto en Vercel**:
     * `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
     * `STRIPE_SECRET_KEY` = `sk_live_...`
   * Activas la casilla en el TPV (*Configuración -> Datos y Envíos -> Pagos Online -> Activar Stripe*).

---

### FASE 3: Despliegue en Vercel

1. Entra en tu panel de [vercel.com](https://vercel.com).
2. Pulsa en **"Add New..."** -> **Project**.
3. Selecciona tu repositorio de GitHub: `app-pizzeria`.
4. **Configuración del Proyecto:**
   * **Project Name:** Nombre del cliente (ej: `pizzeria-roma`).
   * **Framework Preset:** `Vite`.
   * **Branch:** 
     * Si quiere la aplicación completa: selecciona `main`.
     * Si requiere ajustes recortados específicos: selecciona la rama correspondiente.
5. **Environment Variables (Variables de Entorno):**  
   Añade las siguientes variables:
   * `VITE_FIREBASE_API_KEY` = *(Clave de su Firebase)*
   * `VITE_FIREBASE_AUTH_DOMAIN` = *(Auth domain de su Firebase)*
   * `VITE_FIREBASE_PROJECT_ID` = *(Project ID de su Firebase)*
   * `VITE_FIREBASE_STORAGE_BUCKET` = *(Storage bucket de su Firebase)*
   * `VITE_FIREBASE_MESSAGING_SENDER_ID` = *(Sender ID de su Firebase)*
   * `VITE_FIREBASE_APP_ID` = *(App ID de su Firebase)*
   * `VITE_STRIPE_PUBLISHABLE_KEY` = *(pk_test_... o su pk_live_)*
   * `STRIPE_SECRET_KEY` = *(sk_test_... o su sk_live_)*
6. Pulsa en **Deploy**. En menos de 2 minutos la web estará en marcha.
7. **Dominio Personalizado:** En *Settings -> Domains*, añade su dominio oficial (ej: `pedidos.pizzeriaroma.com`).

---

### FASE 4: Carga Inicial de Datos del Restaurante

Una vez desplegada la web, entra en su TPV (`/pos`) o directamente en Firebase:

1. Entra en `https://[dominio-cliente]/pos` -> **Config** -> **Datos y Envíos**:
   * Sube el logo del restaurante.
   * Nombre comercial y razón social / NIF.
   * Dirección del local y teléfono / WhatsApp.
   * Tipos de envío y zonas de reparto (códigos postales o radio en KM).
2. Entra en las pestañas de **Categorías**, **Productos** y **Secciones**:
   * Da de alta su carta de pizzas, bebidas, precios e ingredientes.

---

## 3. Checklist Rápido de Seguridad y Salida a Producción

Antes de entregar las llaves al restaurante:

- [ ] **Firebase Aislado:** Comprobar que los pedidos nuevos caen en su Firebase y no en el de otro local.
- [ ] **Stripe Blindado:** Verificar que `stripeEnabled` esté en `false` si no cobran online, o con las claves `pk_live_` y `sk_live_` del propio restaurante si lo tienen activado.
- [ ] **Tickets de Cocina:** Hacer un pedido de prueba desde el móvil y comprobar que el ticket se imprime correctamente en la impresora térmica del mostrador/cocina.
- [ ] **Repartidor:** Comprobar que en `/repartidor` el pedido de prueba aparece para asignarse.
- [ ] **Borrado de Prueba:** Entrar en `/pos` y limpiar los pedidos de prueba antes de la apertura oficial.

