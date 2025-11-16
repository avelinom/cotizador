# ⚡ Solución Rápida: Permisos de Google Docs API

## ✅ Estado Actual

- ✅ Google Docs API está inicializada correctamente
- ✅ Las credenciales están configuradas
- ❌ La Service Account no tiene permisos para crear documentos

## 🎯 Solución Más Simple (5 minutos)

### Paso 1: Crear Carpeta Compartida en Google Drive

1. Ve a tu Google Drive: https://drive.google.com
2. Crea una nueva carpeta llamada: **"Cotizador - Documentos"**
3. Haz clic derecho en la carpeta → **Compartir**
4. En el campo "Agregar personas y grupos", pega el email de la Service Account:
   ```
   cotizador-docs@cefiro-cotizador.iam.gserviceaccount.com
   ```
5. Dale permisos de **Editor**
6. Haz clic en **Enviar** (puedes desmarcar "Notificar a las personas")

### Paso 2: Obtener el ID de la Carpeta

1. Abre la carpeta que acabas de crear
2. Mira la URL en el navegador, debería verse así:
   ```
   https://drive.google.com/drive/folders/1ABC123xyz...
   ```
3. Copia el ID que está después de `/folders/` (ejemplo: `1ABC123xyz...`)

### Paso 3: Configurar el ID de Carpeta

Agrega esta variable al archivo `.env`:

```env
GOOGLE_DRIVE_FOLDER_ID=tu-id-de-carpeta-aqui
```

### Paso 4: Modificar el Código (Ya lo haré por ti)

Voy a modificar el código para que cree documentos en esa carpeta compartida.

## 🔄 Alternativa: Habilitar Domain-Wide Delegation

Si tienes Google Workspace y eres administrador:

1. Ve a Google Cloud Console
2. **APIs & Services** → **Credentials**
3. Haz clic en tu Service Account
4. Ve a **"Advanced settings"** o busca **"Domain-wide delegation"**
5. Marca **"Enable Google Workspace Domain-wide Delegation"**
6. Guarda

## 📝 ¿Qué Prefieres?

- **A)** Usar carpeta compartida (más rápido, 5 minutos)
- **B)** Habilitar Domain-Wide Delegation (requiere admin de Google Workspace)

Si eliges A, solo necesitas:
1. Crear la carpeta y compartirla con la Service Account
2. Darme el ID de la carpeta
3. Yo modifico el código para usarla

¿Cuál prefieres?

