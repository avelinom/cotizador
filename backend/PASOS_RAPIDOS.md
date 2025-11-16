# 🚀 Pasos Rápidos para Configurar Google Docs API

## Paso 1: Obtener Credenciales de Google Cloud

### 1.1. Ir a Google Cloud Console
Abre: https://console.cloud.google.com/

### 1.2. Crear o Seleccionar Proyecto
- Si no tienes proyecto: **"Select a project"** → **"New Project"**
- Nombre sugerido: `Cefiro Cotizador`
- Anota el **Project ID**

### 1.3. Habilitar APIs
1. Menú lateral → **APIs & Services** → **Library**
2. Busca **"Google Docs API"** → Haz clic → **Enable**
3. Busca **"Google Drive API"** → Haz clic → **Enable**

### 1.4. Crear Service Account
1. **APIs & Services** → **Credentials**
2. **+ CREATE CREDENTIALS** → **Service account**
3. Completa:
   - **Service account name**: `cotizador-docs`
   - **Description**: `Service account para generar documentos`
4. **CREATE AND CONTINUE** → **CONTINUE** → **DONE**

### 1.5. Descargar Credenciales JSON
1. Haz clic en la Service Account creada (`cotizador-docs`)
2. Pestaña **KEYS**
3. **ADD KEY** → **Create new key**
4. Selecciona **JSON** → **CREATE**
5. **Se descargará un archivo JSON** (guárdalo en un lugar seguro)

## Paso 2: Configurar Variables de Entorno

### Opción A: Script Automático (Recomendado)

Si ya descargaste el archivo JSON:

```bash
cd /Users/amiguelez/GitHub/cotizador/backend
node scripts/setup-google-docs-from-json.js ~/Downloads/tu-archivo.json
```

Reemplaza `~/Downloads/tu-archivo.json` con la ruta real de tu archivo JSON.

### Opción B: Manual

Abre el archivo JSON descargado y copia estos valores al archivo `.env`:

```env
# Google Docs API Configuration
GOOGLE_PROJECT_ID=tu-project-id-del-json
GOOGLE_PRIVATE_KEY_ID=tu-private-key-id-del-json
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=tu-service-account@tu-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=tu-client-id-del-json
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...
```

**⚠️ IMPORTANTE:**
- Copia el `private_key` COMPLETO del JSON (incluyendo los `\n`)
- Mantén las comillas dobles alrededor del `GOOGLE_PRIVATE_KEY`

## Paso 3: Verificar Configuración

1. **Reinicia el backend**:
   ```bash
   cd /Users/amiguelez/GitHub/cotizador/backend
   npm run dev
   ```

2. **Busca en los logs**:
   ```
   ✅ Google Docs API inicializada correctamente
   ```

3. **Si ves ese mensaje, ¡está funcionando!** 🎉

## ✅ Listo!

Ahora cuando apliques un template en el cotizador:
- Se creará el documento en Google Docs
- Se fusionará el contenido automáticamente
- Se exportará a Word
- Se guardará el enlace de Google Docs en la base de datos

## 🔧 Si algo falla

1. **Revisa los logs del backend** para ver el error específico
2. **Verifica que todas las variables estén en el `.env`**
3. **Asegúrate de que las APIs estén habilitadas** en Google Cloud Console
4. **Revisa** `CONFIGURAR_GOOGLE_DOCS.md` para más detalles

