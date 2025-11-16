# 🚀 Guía Rápida: Configurar Google Docs API

## Paso 1: Crear Proyecto en Google Cloud Console

1. **Ve a Google Cloud Console**: https://console.cloud.google.com/
2. **Crea o selecciona un proyecto**:
   - Si no tienes proyecto, haz clic en "Select a project" > "New Project"
   - Dale un nombre (ej: "Cefiro Cotizador")
   - Anota el **Project ID** (lo necesitarás después)

## Paso 2: Habilitar APIs

1. En el menú lateral, ve a **APIs & Services** > **Library**
2. Busca y habilita estas APIs (una por una):
   - 🔍 Busca "Google Docs API" → Haz clic → **Enable**
   - 🔍 Busca "Google Drive API" → Haz clic → **Enable**

## Paso 3: Crear Service Account

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **+ CREATE CREDENTIALS** > **Service account**
3. Completa:
   - **Service account name**: `cotizador-docs`
   - **Service account ID**: Se genera automáticamente (déjalo así)
   - **Description**: `Service account para generar documentos en Google Docs`
4. Haz clic en **CREATE AND CONTINUE**
5. En "Grant this service account access to project": **Sáltate este paso** (haz clic en **CONTINUE**)
6. Haz clic en **DONE**

## Paso 4: Descargar Credenciales JSON

1. En la lista de Service Accounts, **haz clic en la que acabas de crear** (`cotizador-docs`)
2. Ve a la pestaña **KEYS**
3. Haz clic en **ADD KEY** > **Create new key**
4. Selecciona **JSON** y haz clic en **CREATE**
5. **Se descargará un archivo JSON** (guárdalo en un lugar seguro, no lo subas a Git)

## Paso 5: Configurar Variables de Entorno

Abre el archivo JSON que descargaste. Se verá algo así:

```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-123",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "cotizador-docs@tu-proyecto-123.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/cotizador-docs%40tu-proyecto-123.iam.gserviceaccount.com"
}
```

Ahora agrega estas líneas al archivo `.env` del backend (`/Users/amiguelez/GitHub/cotizador/backend/.env`):

```env
# Google Docs API Configuration
GOOGLE_PROJECT_ID=tu-proyecto-123
GOOGLE_PRIVATE_KEY_ID=abc123...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=cotizador-docs@tu-proyecto-123.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=123456789
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/cotizador-docs%40tu-proyecto-123.iam.gserviceaccount.com
```

**⚠️ IMPORTANTE:**
- Copia el `private_key` **COMPLETO** incluyendo los `\n` (no los reemplaces por saltos de línea reales)
- Mantén las comillas dobles alrededor del `GOOGLE_PRIVATE_KEY`
- Reemplaza los valores de ejemplo con los valores reales de tu archivo JSON

## Paso 6: Verificar Configuración

1. Reinicia el backend del cotizador:
   ```bash
   cd /Users/amiguelez/GitHub/cotizador/backend
   npm run dev
   ```

2. Deberías ver en los logs:
   ```
   ✅ Google Docs API inicializada correctamente
   ```

## ✅ Listo!

Ahora cuando apliques un template en el cotizador, el sistema:
1. Creará el documento en Google Docs
2. Fusionará el contenido estático y dinámico
3. Exportará a Word automáticamente
4. Guardará el enlace de Google Docs en la base de datos

## 🔧 Troubleshooting

### Error: "Google Docs API no está inicializada"
- Verifica que todas las variables de entorno estén en el `.env`
- Asegúrate de que el `GOOGLE_PRIVATE_KEY` tenga los `\n` literales
- Reinicia el backend después de cambiar el `.env`

### Error: "Permission denied"
- Verifica que las APIs (Docs y Drive) estén habilitadas
- Asegúrate de que el Service Account existe en Google Cloud Console

### Los documentos no se crean
- Revisa los logs del backend para ver el error específico
- Verifica que el archivo JSON descargado sea válido

## 📝 Nota de Seguridad

**NUNCA subas el archivo JSON de credenciales a Git**. El archivo `.env` ya debería estar en `.gitignore`.

