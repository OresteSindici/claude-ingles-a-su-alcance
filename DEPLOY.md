# Publicar el Manual Inglés a su Alcance en Firebase

La app se publica sola en Firebase Hosting cada vez que se actualiza la rama `main` en GitHub.
Para conectarla hay que hacer esto **una sola vez**.

## 1. Crear el proyecto de Firebase (5 minutos)

1. Entre a <https://console.firebase.google.com> con su cuenta de Google.
2. **Crear un proyecto** → nombre: `ingles-a-su-alcance`. Google Analytics es opcional (puede desactivarlo).
3. Anote el **ID del proyecto** que muestra Firebase (por ejemplo `ingles-a-su-alcance` o `ingles-a-su-alcance-1a2b3`).
4. En el menú izquierdo: **Compilación → Hosting → Comenzar**. Puede saltarse los pasos de instalación que muestra; los hacemos nosotros.

El plan gratuito (Spark) es suficiente: 10 GB de almacenamiento y 360 MB de tráfico diario.

## 2. Darle a GitHub permiso para publicar

1. En Firebase: ⚙️ **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un archivo `.json`.
2. En GitHub, en este repositorio: **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: pegue **todo** el contenido del archivo `.json`.
3. Borre el archivo `.json` de su computador cuando termine. Es una llave: no la comparta ni la suba al repositorio.

## 3. ID del proyecto

El ID ya está en `.firebaserc`: `manual-ingles-a-su-alcance`. Desde que exista el secreto del paso 2,
cada cambio en `main` queda publicado en <https://manual-ingles-a-su-alcance.web.app>.

## Editar el texto del Homenaje

El texto está en [`app/src/content/homenaje.md`](app/src/content/homenaje.md). Puede editarlo directamente
en GitHub (ícono del lápiz). Las cartas del instalador original están en `app/public/data/homenaje.json`.
