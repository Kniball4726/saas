# ⚡ VeloxPay — Banca Digital Multidivisa, Rampa Fiat (ARS/USD) & Mesa Cripto

Plataforma financiera de liquidación corporativa y billetera de intercambio multidivisa:
* **Pesos Argentinos (ARS)**: Conexión interbancaria directa vía CBU / CVU / Alias (Red COELSA y Let'sBit B2B).
* **Dólares de Estados Unidos (USD)**: Cuentas virtuales en EE.UU. con Routing (ABA) y Account Number para recibir transferencias **ACH y Fedwire** (Upwork, Deel, bancos USA).
* **Criptomonedas (USDT, USDC, BTC, ETH)**: Motor de swapping instantáneo con cotizaciones RFQ garantizadas por 30s, libro contable inmutable (*double-entry ledger*) y control anti-carreras distribuido.

---

## 🏗️ Arquitectura del Sistema

```
saas/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # Modelo PostgreSQL completo (Users, Accounts, US Bank, Ledger, Swaps)
│   ├── public/
│   │   └── index.html           # WebApp / Dashboard interactivo (Responsive Móvil y Desktop)
│   ├── src/
│   │   ├── config/              # Variables de entorno y configuración
│   │   ├── controllers/         # Controladores REST (Wallets, Quotes, Swaps, Fiat ARS y USA)
│   │   ├── middlewares/         # Autenticación JWT y validación
│   │   ├── routes/              # Definición de rutas API
│   │   ├── services/
│   │   │   ├── pricing.service.ts # Motor de precios en tiempo real con spread
│   │   │   ├── quote.service.ts   # Cotizaciones congeladas con TTL (30s)
│   │   │   ├── swap.service.ts    # Motor de ejecución atómica de swaps
│   │   │   ├── fiat.service.ts    # Rampa ARS (CVU) y Rampa USA (Routing/ACH)
│   │   │   ├── ledger.service.ts  # Libro mayor de partida doble (Auditoría contable inmutable)
│   │   │   └── store.service.ts   # Capa de almacenamiento y persistencia
│   │   ├── test-flow.ts         # Script de verificación integral del flujo completo
│   │   ├── app.ts               # Configuración de Express y middleware estático
│   │   └── main.ts              # Punto de entrada del servidor
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## ⚡ Cómo Ejecutar el Proyecto

### 1. Iniciar el Servidor y la WebApp
En la carpeta `backend`:
```bash
npm run dev
```
O con el build compilado:
```bash
npm run build
npm start
```

Abre tu navegador en:
👉 **[http://localhost:4000](http://localhost:4000)**

Podrás interactuar con la **WebApp** completa:
1. **Ver Balances en Vivo:** Balances en ARS, USD, USDT, USDC, BTC, ETH y valor total estimado.
2. **Ingresar Pesos (On-Ramp Argentina):** Ver CVU y Alias argentino asignado (`JUAN.CRYPTO.WALLET`) y probar el **Simulador de Transferencias** desde Mercado Pago, Galicia o Brubank.
3. **🇺🇸 Cobrar en Dólares desde EE.UU. (On-Ramp USA):** Ver Routing Number y Account Number asignado (`Lead Bank / Bridge`) y probar el **Simulador ACH** desde Upwork, Deel o bancos de USA.
4. **Swapping Instantáneo:** Cotizar pares (ej. USDC/USDT $\to$ ARS o ARS $\to$ USDT), congelar la tasa durante 30 segundos y ejecutar el swap atómicamente.
5. **Retirar Pesos (Off-Ramp Argentina):** Transferir ARS a cualquier CBU, CVU o Alias bancario argentino.
6. **Historial Contable:** Registro cronológico de cada transacción.

---

## 📡 Endpoints de la API REST

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Registro con correo, contraseña hasheada (scrypt), CUIT y PIN |
| `POST` | `/api/auth/login` | Inicio de sesión tradicional y emisión de JWT |
| `POST` | `/api/auth/google` | Autenticación con Google Sign-In (OpenID Connect) |
| `POST` | `/api/auth/apple` | Autenticación con Sign in with Apple |
| `GET` | `/api/auth/me` | Obtiene el perfil del usuario autenticado |
| `POST` | `/api/auth/verify-pin` | Verificación de PIN de 6 dígitos (*Step-Up Auth*) para transferencias |
| `GET` | `/api/wallet/balances` | Lista los saldos de todas las monedas del usuario y valor en USD/ARS |
| `GET` | `/api/wallet/transactions` | Historial contable de transacciones del usuario |
| `GET` | `/api/quotes/rates` | Tasas de cambio de mercado en vivo |
| `POST` | `/api/quotes` | Solicita una cotización congelada por 30s (`fromCurrency`, `toCurrency`, `fromAmount`) |
| `POST` | `/api/swaps/execute` | Ejecuta el swap atómicamente (`quoteId`) |
| `GET` | `/api/fiat/bank-account` | Devuelve el CVU y Alias asignado al usuario en Argentina |
| `POST` | `/api/fiat/webhook/deposit` | Webhook para recibir transferencias bancarias de COELSA/BaaS |
| `POST` | `/api/fiat/withdraw` | Solicita retiro de pesos hacia un CBU/CVU/Alias de destino con PIN |
| `GET` | `/api/fiat/us-account` | Devuelve el Routing y Account Number asignado en EE.UU. |
| `POST` | `/api/fiat/webhook/us-ach` | Webhook para recibir transferencias ACH / Wire desde EE.UU. |
| `GET` | `/api/admin/reconcile` | Ejecuta la auditoría matemática del libro contable |

---

## 🧪 Pruebas y Suites de Verificación

El proyecto cuenta con cuatro suites de pruebas automatizadas listas para CI/CD:

### 1. Autenticación & Step-Up Auth (`npm run test:auth`)
Valida el circuito de seguridad e identidad:
* Registro y login tradicional con contraseña hasheada (scrypt).
* Integración y auto-onboarding con **Google Sign-In** y **Apple Sign-In**.
* Verificación de PIN transaccional de 6 dígitos (*Step-Up Auth*).
* Débito protegido contra cuentas bancarias COELSA.

```bash
npm run test:auth
```

### 2. Flujo de Negocio Completo (`npm run test:flow`)
Valida el circuito funcional de la aplicación:
* Cotizaciones con margen (*spread*) y expiración.
* Depósitos bancarios argentinos vía CVU con **idempotencia**.
* Swapping atómico de saldos.
* Retiros a cuentas bancarias argentinas (CBU).
* Recepción de transferencias **ACH desde Estados Unidos en USD**.

```bash
npm run test:flow
```

### 2. Suite de Seguridad y Blindaje Financiero (`npm run test:security`)
Valida la resistencia del backend contra vectores de ataque reales:
* **Firma Criptográfica HMAC SHA-256 en Webhooks:** Rechazo de peticiones sin firma, firmas falsificadas y ataques de repetición (*replay attacks* con timestamp vencido).
* **Bloqueo de Concurrencia y Prevención de Doble Gasto (*Race Conditions*):** Envío simultáneo de swaps en paralelo verificando que solo 1 es procesado y el balance jamás queda negativo.
* **Robot de Reconciliación Contable (*Nightly Auditor*):** Verificación matemática de consistencia entre balances en caché y el libro mayor inmutable (*ledger*).

```bash
npm run test:security
```

### 3. Suite de Integración Oficial Let'sBit B2B (`npm run test:letsbit`)
Valida la comunicación con la API de Let'sBit Corporate (CVU COELSA, tickers mayoristas, órdenes RFQ y retiros bancarios):

```bash
npm run test:letsbit
```

---

## 🇦🇷 Configuración de Let'sBit Corporate B2B (Paso a Producción)

Para conectar tu backend a la API real de Let'sBit, solo debes agregar estas credenciales en `backend/.env`:

```env
# Credenciales provistas por Let'sBit al darte de alta
LETSBIT_API_KEY="tu_api_key_sandbox_o_produccion"
LETSBIT_API_SECRET="tu_api_secret"
LETSBIT_ENVIRONMENT="sandbox" # Cambiar a "production" cuando salgas en vivo
LETSBIT_WEBHOOK_SECRET="clave_de_firma_que_te_entrega_letsbit"
```

El cliente `letsbitClient` detectará automáticamente las credenciales y cambiará del modo simulación al modo en vivo con Let'sBit sin requerir ningún cambio de código.

---

## 📱 Conexión con la App Móvil (React Native / Expo)

La WebApp y la App Móvil comparten el 100% de la lógica y la API REST:
* Puedes crear la app móvil con `npx create-expo-app mobile` en este mismo repositorio.
* La app móvil consume los mismos endpoints descritos arriba enviando `Authorization: Bearer <token>`.
* Para notificaciones push cuando entra una transferencia bancaria, se conecta Firebase Cloud Messaging (FCM) al webhook de depósito (`/api/fiat/webhook/deposit`).
