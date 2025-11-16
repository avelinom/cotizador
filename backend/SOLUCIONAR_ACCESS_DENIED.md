# 🔧 Solucionar Error 403: access_denied

## ❌ Problema

Error: "cotizador has not completed the Google verification process. The app is currently being tested, and can only be accessed by developer-approved testers."

## ✅ Solución: Agregar Usuario de Prueba

Tu aplicación OAuth está en modo "Testing". Necesitas agregar tu email como usuario de prueba.

### Pasos:

1. **Ve a Google Cloud Console**: https://console.cloud.google.com/
2. **Selecciona tu proyecto**: `cefiro-cotizador`
3. **Ve a APIs & Services** → **OAuth consent screen**
4. **Desplázate hasta la sección "Test users"**
5. **Haz clic en "+ ADD USERS"**
6. **Agrega tu email de Google** (el que usas para iniciar sesión)
7. **Haz clic en "ADD"**
8. **Guarda los cambios**

### Después de agregar tu email:

1. **Vuelve a intentar autenticarte**:
   - Visita: `http://localhost:3005/api/google-oauth/auth`
   - O abre la URL de autorización que te dio el script

2. **Ahora deberías poder iniciar sesión** sin el error 403

## 🎯 Alternativa: Publicar la App (Solo para Producción)

Si quieres que cualquier usuario pueda usar la app (no recomendado para desarrollo):

1. **Ve a OAuth consent screen**
2. **Haz clic en "PUBLISH APP"**
3. **Confirma la publicación**

⚠️ **Nota**: Publicar la app requiere verificación de Google, lo cual puede tomar tiempo. Para desarrollo, es mejor usar "Test users".

## 📝 Verificar que Funciona

Después de agregar tu email como test user:

```bash
cd /Users/amiguelez/GitHub/cotizador/backend
node scripts/test-oauth.js
```

Deberías poder autenticarte sin el error 403.

