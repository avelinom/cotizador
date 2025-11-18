# Configuración de Google Drive con Service Account

Este documento explica cómo configurar la autenticación de Google Drive usando un Service Account en Google Cloud Console.

## Requisitos Previos

- Una cuenta de Google
- Acceso a Google Cloud Console (https://console.cloud.google.com/)
- Un proyecto en Google Cloud (o crear uno nuevo)

## Pasos para Configurar

### 1. Crear o Seleccionar un Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Si no tienes un proyecto, crea uno nuevo:
   - Haz clic en el selector de proyectos (arriba a la izquierda)
   - Haz clic en "Nuevo proyecto"
   - Ingresa un nombre para el proyecto (ej: "Cotizador")
   - Haz clic en "Crear"

### 2. Habilitar las APIs Necesarias

1. En el menú lateral, ve a **"APIs & Services" > "Library"**
2. Busca y habilita las siguientes APIs:
   - **Google Drive API**
   - **Google Docs API**
3. Para cada API:
   - Haz clic en el nombre de la API
   - Haz clic en el botón **"Enable"** (Habilitar)

### 3. Crear un Service Account

1. En el menú lateral, ve a **"IAM & Admin" > "Service Accounts"**
2. Haz clic en **"Create Service Account"** (Crear cuenta de servicio)
3. Completa el formulario:
   - **Service account name**: `cotizador-service` (o el nombre que prefieras)
   - **Service account ID**: Se generará automáticamente
   - **Description**: `Service account para el sistema Cotizador`
4. Haz clic en **"Create and Continue"**
5. En "Grant this service account access to project":
   - **Role**: Selecciona **"Editor"** (o "Owner" si necesitas permisos completos)
   - Haz clic en **"Continue"**
6. Haz clic en **"Done"**

### 4. Crear una Clave JSON para el Service Account

1. En la lista de Service Accounts, haz clic en el Service Account que acabas de crear
2. Ve a la pestaña **"Keys"**
3. Haz clic en **"Add Key" > "Create new key"**
4. Selecciona **"JSON"** como tipo de clave
5. Haz clic en **"Create"**
6. Se descargará automáticamente un archivo JSON con las credenciales

### 5. Extraer las Credenciales del Archivo JSON

El archivo JSON descargado tiene el siguiente formato:

```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "cotizador-service@tu-proyecto.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs/..."
}
```

### 6. Configurar las Variables de Entorno

Copia el archivo `.env.example` a `.env` (si no existe):

```bash
cp .env.example .env
```

Edita el archivo `.env` y configura las siguientes variables:

```env
# Google Drive Service Account Configuration
GOOGLE_PROJECT_ID=tu-proyecto-id
GOOGLE_CLIENT_EMAIL=cotizador-service@tu-proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANTE sobre GOOGLE_PRIVATE_KEY:**
- La clave privada debe estar entre comillas dobles
- Los saltos de línea deben estar representados como `\n` (no como saltos de línea reales)
- El formato completo debe ser: `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

**Ejemplo de cómo copiar la clave privada:**
1. Abre el archivo JSON descargado
2. Copia el valor de `private_key` (incluye los `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`)
3. Reemplaza todos los saltos de línea reales con `\n`
4. Pega el resultado entre comillas dobles en el archivo `.env`

### 7. Compartir Carpetas de Google Drive con el Service Account

Para que el Service Account pueda acceder a carpetas y archivos en Google Drive, debes compartirlos con el email del Service Account:

1. Abre Google Drive en tu navegador
2. Selecciona la carpeta o archivo que quieres compartir
3. Haz clic derecho > **"Share"** (Compartir)
4. En el campo de búsqueda, ingresa el email del Service Account (ej: `cotizador-service@tu-proyecto.iam.gserviceaccount.com`)
5. Asigna el permiso **"Editor"** o **"Viewer"** según necesites
6. Haz clic en **"Send"** (Enviar)

**Nota:** El Service Account no puede acceder a archivos/carpetas que no le hayas compartido explícitamente.

### 8. Verificar la Configuración

1. Reinicia el servidor backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Revisa los logs del servidor. Deberías ver:
   ```
   ✅ Google Drive Service inicializado con Service Account
   ✅ Google Docs API inicializada con Service Account
   ```

3. Si ves errores, verifica:
   - Que las variables de entorno estén correctamente configuradas
   - Que el formato de `GOOGLE_PRIVATE_KEY` sea correcto (con `\n` para saltos de línea)
   - Que las APIs estén habilitadas en Google Cloud Console
   - Que hayas compartido las carpetas necesarias con el Service Account

## Solución de Problemas

### Error: "Google Drive Service no se pudo inicializar"

**Posibles causas:**
1. Las variables de entorno no están configuradas correctamente
2. El formato de `GOOGLE_PRIVATE_KEY` es incorrecto
3. Las APIs no están habilitadas en Google Cloud Console

**Solución:**
- Verifica que todas las variables estén en el archivo `.env`
- Asegúrate de que `GOOGLE_PRIVATE_KEY` tenga el formato correcto con `\n` para saltos de línea
- Verifica en Google Cloud Console que las APIs estén habilitadas

### Error: "Permission denied" o "File not found"

**Posibles causas:**
- El Service Account no tiene acceso a la carpeta/archivo

**Solución:**
- Comparte la carpeta o archivo con el email del Service Account
- Asegúrate de dar permisos de "Editor" si necesita modificar archivos

### Error: "Invalid credentials"

**Posibles causas:**
- La clave privada está mal formateada
- El Service Account fue eliminado o deshabilitado

**Solución:**
- Verifica el formato de `GOOGLE_PRIVATE_KEY` en el archivo `.env`
- Crea una nueva clave JSON si es necesario

## Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** subas el archivo JSON del Service Account a un repositorio público
- **NUNCA** compartas las credenciales del Service Account
- El archivo `.env` debe estar en `.gitignore` (ya está incluido)
- Si las credenciales se comprometen, elimina el Service Account y crea uno nuevo

## Referencias

- [Google Cloud Service Accounts Documentation](https://cloud.google.com/iam/docs/service-accounts)
- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-auth)
- [Google Docs API Documentation](https://developers.google.com/docs/api)

