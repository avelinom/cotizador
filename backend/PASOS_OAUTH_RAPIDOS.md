# ⚡ Pasos Rápidos: Configurar OAuth 2.0

## 🎯 Resumen

OAuth 2.0 permite crear documentos en tu cuenta de Google sin las limitaciones de Service Account.

## 📋 Pasos (15 minutos)

### 1. Crear Credenciales OAuth en Google Cloud

1. Ve a: https://console.cloud.google.com/
2. Proyecto: `cefiro-cotizador`
3. **APIs & Services** → **Credentials**
4. **+ CREATE CREDENTIALS** → **OAuth client ID**

### 2. Configurar Consent Screen (si es primera vez)

1. **Application type**: External
2. **App name**: `Cefiro Cotizador`
3. **User support email**: Tu email
4. **Scopes**: Agrega:
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive`
5. **Test users**: Agrega tu email
6. **SAVE**

### 3. Crear OAuth Client ID

1. **Application type**: Web application
2. **Name**: `Cotizador Web Client`
3. **Authorized redirect URIs**:
   ```
   http://localhost:3005/api/google-oauth/callback
   ```
4. **CREATE**
5. **Copia Client ID y Client Secret**

### 4. Agregar al .env

```bash
cd /Users/amiguelez/GitHub/cotizador/backend
```

Agrega al `.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=tu-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3005/api/google-oauth/callback
```

### 5. Reiniciar Backend

```bash
npm run dev
```

### 6. Autenticarse (Primera Vez)

**Opción A: Usar el script de prueba**
```bash
node scripts/test-oauth.js
```
Te dará una URL para autenticarte.

**Opción B: Manual**
1. Visita: `http://localhost:3005/api/google-oauth/auth`
2. Copia la URL que aparece
3. Ábrela en el navegador
4. Inicia sesión con Google
5. Acepta los permisos
6. Serás redirigido de vuelta

### 7. Verificar

```bash
node scripts/test-oauth.js
```

Deberías ver: `✅ Documento de prueba creado exitosamente!`

## ✅ ¡Listo!

Ahora el sistema puede crear documentos en tu cuenta de Google usando OAuth 2.0.

## 🔄 Próximas Veces

- Los tokens se guardan en memoria
- Se refrescan automáticamente cuando expiran
- Si reinicias el servidor, necesitarás autenticarte de nuevo

## 📝 Nota

En producción, considera almacenar los tokens en base de datos para persistencia.

