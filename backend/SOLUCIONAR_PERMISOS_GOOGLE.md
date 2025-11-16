# 🔧 Solucionar Error de Permisos en Google Docs API

## ✅ Buenas Noticias

La API se inicializó correctamente, pero necesitamos dar permisos a la Service Account.

## 🔍 Problema

Error: `The caller does not have permission` (403)

Esto significa que la Service Account no tiene permisos para crear documentos.

## 🛠️ Solución: Dar Permisos a la Service Account

### Opción 1: Habilitar Domain-Wide Delegation (Recomendado para producción)

1. Ve a Google Cloud Console: https://console.cloud.google.com/
2. **APIs & Services** → **Credentials**
3. Haz clic en tu Service Account (`cotizador-docs`)
4. Ve a la pestaña **"Advanced settings"** o **"Show domain-wide delegation"**
5. Marca **"Enable Google Workspace Domain-wide Delegation"**
6. Guarda

### Opción 2: Usar OAuth 2.0 (Más simple para desarrollo)

Si prefieres una solución más simple, podemos modificar el código para usar OAuth 2.0 en lugar de Service Account. Esto requiere autenticación del usuario una vez.

### Opción 3: Verificar que las APIs estén habilitadas (Verificación rápida)

1. Ve a **APIs & Services** → **Enabled APIs**
2. Verifica que aparezcan:
   - ✅ Google Docs API
   - ✅ Google Drive API
3. Si no están, habilítalas desde **Library**

## 🎯 Solución Rápida: Crear Documentos en una Carpeta Compartida

Otra opción es crear una carpeta en Google Drive, compartirla con la Service Account, y crear los documentos ahí:

1. Crea una carpeta en Google Drive
2. Comparte la carpeta con el email de la Service Account: `cotizador-docs@cefiro-cotizador.iam.gserviceaccount.com`
3. Dale permisos de **Editor**
4. Modificamos el código para crear documentos en esa carpeta

## 📝 ¿Qué Prefieres?

- **A)** Habilitar Domain-Wide Delegation (más seguro, requiere admin de Google Workspace)
- **B)** Usar OAuth 2.0 (más simple, requiere autenticación del usuario)
- **C)** Crear documentos en carpeta compartida (solución rápida)
- **D)** Verificar primero que las APIs estén habilitadas

¿Cuál opción prefieres? Si tienes Google Workspace, la opción A es la mejor. Si no, la opción C es la más rápida.

