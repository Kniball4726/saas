# 🌐 Guía de Despliegue en la Nube (Producción / Demo Pública)

Esta guía te explica cómo publicar tu wallet en la nube para que tenga una **URL pública con HTTPS** (ej: `https://tu-wallet.up.railway.app`) y puedas abrirla e interactuar desde tu teléfono móvil o cualquier navegador.

---

## 🚀 Opción 1: Despliegue en Railway (Recomendada — 2 Minutos)

Railway es la plataforma más rápida y sencilla para Node.js y bases de datos.

### Paso 1: Subir tu código a GitHub
Si aún no has inicializado git en este proyecto, ejecuta en la raíz (`c:\Users\glrd4\Desktop\Universidad\web\saas`):

```bash
git init
git add .
git commit -m "feat: wallet crypto-fiat production ready"
```
Luego crea un repositorio en [github.com/new](https://github.com/new) y sube los cambios:
```bash
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 2: Crear el proyecto en Railway
1. Entra a **[railway.app](https://railway.app)** e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"New Project"** $\to$ **"Deploy from GitHub repo"**.
3. Selecciona tu repositorio recién creado.
4. Railway detectará automáticamente el archivo `railway.json` y comenzará la compilación.

### Paso 3: Obtener tu Dominio Público
1. En el panel de Railway, ve a la pestaña **Settings** de tu servicio.
2. En la sección **Networking**, haz clic en **"Generate Domain"**.
3. ¡Listo! Te generará una URL como:
   👉 `https://cryptoswap-production.up.railway.app`
4. **Ábrela desde el navegador de tu celular**: verás la WebApp en modo móvil lista para usar.

---

## ☁️ Opción 2: Despliegue en Render (Con PostgreSQL Gratuito)

Render ofrece hosting gratuito para servicios web y bases de datos PostgreSQL.

1. Entra a **[render.com](https://render.com)**.
2. Haz clic en **"New +"** $\to$ **"Blueprint"**.
3. Conecta tu repositorio de GitHub.
4. Render leerá automáticamente el archivo `render.yaml` que dejamos en el proyecto y creará:
   * **Servicio Web:** Compila TypeScript e inicia la API + WebApp en Node.
   * **Base de Datos:** Una base de datos PostgreSQL administrada en la nube con `DATABASE_URL` autoconectada.
5. Haz clic en **"Apply"** y en 3 minutos tendrás tu enlace activo con certificado SSL gratis.

---

## 🐳 Opción 3: Despliegue en Servidor Propio / VPS (Docker Compose)

Si tienes un servidor Linux (AWS EC2, DigitalOcean Droplet, Hetzner, etc.):

1. Clona el repositorio en tu servidor:
   ```bash
   git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   cd saas
   ```
2. Inicia todo el stack (Backend + PostgreSQL 16 + Redis) en segundo plano:
   ```bash
   docker compose up -d --build
   ```
3. Verifica que los 3 contenedores estén corriendo:
   ```bash
   docker compose ps
   ```
4. El servicio estará escuchando en el puerto `4000` de tu IP pública.

---

## 📱 ¿Cómo probar la experiencia móvil en tu celular?

Una vez desplegada en Railway o Render:
1. Abre el enlace generado desde Chrome (Android) o Safari (iOS).
2. Toca en los tres puntos / botón de compartir y selecciona **"Agregar a pantalla de inicio"** (*Add to Home Screen*).
3. Se instalará como una **Web App Progresiva (PWA)** en tu teléfono con ícono propio y sin barra de direcciones, luciendo idéntica a una app nativa descargada de la tienda.
