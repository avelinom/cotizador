# Configuración de Google Docs API

Este documento explica cómo configurar Google Docs API para el sistema de cotizador.

## Pasos para Configurar Google Docs API

### 1. Crear un Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el **Project ID**

### 2. Habilitar las APIs Necesarias

1. En el menú lateral, ve a **APIs & Services** > **Library**
2. Busca y habilita las siguientes APIs:
   - **Google Docs API**
   - **Google Drive API**

### 3. Crear una Service Account

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **Service Account**
3. Completa el formulario:
   - **Service account name**: `cotizador-docs` (o el nombre que prefieras)
   - **Service account ID**: Se genera automáticamente
   - **Description**: `Service account para el sistema de cotizador`
4. Haz clic en **Create and Continue**
5. En **Grant this service account access to project**, puedes omitir los roles por ahora
6. Haz clic en **Done**

### 4. Crear y Descargar la Clave JSON

1. En la lista de Service Accounts, haz clic en la que acabas de crear
2. Ve a la pestaña **Keys**
3. Haz clic en **Add Key** > **Create new key**
4. Selecciona **JSON** y haz clic en **Create**
5. Se descargará un archivo JSON con las credenciales

### 5. Configurar Variables de Entorno

Abre el archivo JSON descargado y copia los siguientes valores a tu archivo `.env`:

```env
# Google Docs API Configuration
GOOGLE_PROJECT_ID=tu-project-id
GOOGLE_PRIVATE_KEY_ID=tu-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=tu-service-account@tu-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=tu-client-id
GOOGLE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/tu-service-account%40tu-project.iam.gserviceaccount.com
```

**Importante:**
- El `GOOGLE_PRIVATE_KEY` debe incluir los caracteres `\n` literalmente (no saltos de línea reales)
- Si estás usando un archivo `.env`, asegúrate de escapar correctamente las comillas

### 6. Compartir Documentos (Opcional)

Si quieres que los documentos creados sean accesibles públicamente o compartidos con usuarios específicos, puedes configurar permisos en Google Drive después de crear los documentos.

## Uso

Una vez configurado, el sistema automáticamente:

1. **Detectará si Google Docs API está configurada** verificando las variables de entorno
2. **Si está configurada**: Creará documentos en Google Docs, los fusionará, y exportará a Word/PDF
3. **Si NO está configurada**: Usará el método tradicional de manipulación de Word (fallback)

## Ventajas de Usar Google Docs

- ✅ **Sin problemas de corrupción**: No manipulamos XML directamente
- ✅ **Formato preservado**: Google Docs maneja el formato automáticamente
- ✅ **Colaboración**: Los documentos pueden ser compartidos y editados en tiempo real
- ✅ **Exportación fácil**: Exportación nativa a Word, PDF, y otros formatos
- ✅ **Versionado**: Google Docs mantiene historial de versiones automáticamente

## Troubleshooting

### Error: "Google Docs API no está inicializada"

- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que el `GOOGLE_PRIVATE_KEY` tenga los `\n` literales
- Verifica que las APIs estén habilitadas en Google Cloud Console

### Error: "Permission denied"

- Verifica que la Service Account tenga permisos en el proyecto
- Asegúrate de que las APIs (Docs y Drive) estén habilitadas

### Los documentos no se crean

- Revisa los logs del backend para ver errores específicos
- Verifica que la Service Account tenga los permisos necesarios

