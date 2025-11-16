# 🔐 Configurar OAuth 2.0 para Google Docs API

Esta guía te ayudará a configurar OAuth 2.0 como alternativa a Service Account para crear documentos en Google Docs.

## 🎯 ¿Por qué OAuth 2.0?

- ✅ Permite crear documentos sin limitaciones de Service Account
- ✅ Los documentos se crean en tu cuenta de Google
- ✅ Más control sobre permisos y acceso
- ✅ Funciona mejor para crear documentos en carpetas compartidas

## 📋 Pasos para Configurar

### Paso 1: Crear Credenciales OAuth 2.0 en Google Cloud Console

1. **Ve a Google Cloud Console**: https://console.cloud.google.com/
2. **Selecciona tu proyecto**: `cefiro-cotizador`
3. **Ve a APIs & Services** → **Credentials**
4. **Haz clic en "+ CREATE CREDENTIALS"** → **OAuth client ID**

### Paso 2: Configurar Consent Screen (si es la primera vez)

Si es la primera vez que creas credenciales OAuth:

1. **Selecciona "External"** (o "Internal" si tienes Google Workspace)
2. **Completa el formulario**:
   - App name: `Cefiro Cotizador`
   - User support email: Tu email
   - Developer contact: Tu email
3. **Haz clic en "SAVE AND CONTINUE"**
4. **En Scopes**: Haz clic en "ADD OR REMOVE SCOPES"
   - Busca y agrega:
     - `https://www.googleapis.com/auth/documents`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/drive`
5. **Haz clic en "SAVE AND CONTINUE"**
6. **En Test users**: Agrega tu email de Google
7. **Haz clic en "SAVE AND CONTINUE"** → **BACK TO DASHBOARD**

### Paso 3: Crear OAuth Client ID

1. **Ve a "Credentials"** nuevamente
2. **Haz clic en "+ CREATE CREDENTIALS"** → **OAuth client ID**
3. **Application type**: Selecciona **"Web application"**
4. **Name**: `Cotizador Web Client`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3005
   http://localhost:3006
   http://localhost:3003
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:3005/api/google-oauth/callback
   http://localhost:3006/api/google-oauth/callback
   http://localhost:3003/api/google-oauth/callback
   ```
   (Ajusta según tus URLs de producción)
7. **Haz clic en "CREATE"**
8. **Copia el Client ID y Client Secret** (los necesitarás después)

### Paso 4: Configurar Variables de Entorno

Agrega estas variables al archivo `.env`:

```env
# Google OAuth 2.0 Configuration
GOOGLE_OAUTH_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=tu-client-secret-aqui
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3005/api/google-oauth/callback
```

**⚠️ IMPORTANTE:**
- Reemplaza `tu-client-id-aqui` con el Client ID que copiaste
- Reemplaza `tu-client-secret-aqui` con el Client Secret que copiaste
- Ajusta `GOOGLE_OAUTH_REDIRECT_URI` según tu configuración

### Paso 5: Reiniciar el Backend

```bash
cd /Users/amiguelez/GitHub/cotizador/backend
npm run dev
```

### Paso 6: Autenticarse (Primera Vez)

1. **Abre el navegador** y ve a:
   ```
   http://localhost:3005/api/google-oauth/auth
   ```

2. **Obtendrás una URL de autorización**, cópiala y ábrela en el navegador

3. **Inicia sesión con tu cuenta de Google** y acepta los permisos

4. **Serás redirigido** a la página del cotizador con `oauth_success=true`

5. **¡Listo!** Ahora el sistema puede crear documentos en tu cuenta de Google

## ✅ Verificar que Funciona

Ejecuta el script de prueba:

```bash
node scripts/test-google-docs.js
```

Deberías ver:
```
✅ Google Docs API está funcionando correctamente!
✅ Documento de prueba creado
```

## 🔄 Flujo de Autenticación

1. **Primera vez**: Usuario visita `/api/google-oauth/auth` → Se redirige a Google → Acepta permisos → Vuelve con tokens
2. **Siguientes veces**: Los tokens se usan automáticamente (se refrescan cuando expiran)
3. **Si expira**: El sistema intentará refrescar automáticamente

## 🛠️ Endpoints Disponibles

- `GET /api/google-oauth/auth` - Obtener URL de autorización
- `GET /api/google-oauth/callback` - Callback de Google (no llamar directamente)
- `GET /api/google-oauth/status` - Verificar si está autenticado
- `POST /api/google-oauth/revoke` - Revocar acceso

## 🔒 Seguridad

- Los tokens se almacenan en memoria (por ahora)
- En producción, considera almacenarlos en base de datos de forma encriptada
- Los tokens expiran y se refrescan automáticamente

## 📝 Notas

- **Test Mode**: Si tu app está en "Testing", solo los usuarios agregados en "Test users" pueden autenticarse
- **Production**: Para producción, necesitas verificar tu app en Google Cloud Console
- **Refresh Token**: Se obtiene solo la primera vez (con `prompt: 'consent'`)

## 🆘 Troubleshooting

### Error: "redirect_uri_mismatch"
- Verifica que la URL en `GOOGLE_OAUTH_REDIRECT_URI` coincida exactamente con la configurada en Google Cloud Console
- Asegúrate de incluir `http://` o `https://` según corresponda

### Error: "access_denied"
- El usuario canceló la autorización
- Intenta nuevamente visitando `/api/google-oauth/auth`

### Los tokens no se guardan
- Los tokens se almacenan en memoria, se pierden al reiniciar el servidor
- En producción, implementa almacenamiento persistente (base de datos)

