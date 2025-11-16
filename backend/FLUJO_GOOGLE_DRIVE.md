# 📋 Flujo Completo: Cotizador con Google Drive

## 🎯 Visión General

El sistema ahora funciona completamente con Google Drive/Docs:
- ✅ Selección de documentos desde carpetas de Google Drive
- ✅ Merge de secciones estáticas y dinámicas
- ✅ Organización por carpetas de clientes
- ✅ Exportación a PDF
- ✅ Envío de correo con registro en BD

## 📁 Estructura de Carpetas en Google Drive

```
Google Drive/
├── Propuestas - Secciones Estáticas/
│   ├── Propuesta Tecnica y Economica - Estatica.docx
│   └── ...
├── Propuestas - Secciones Dinámicas/
│   ├── Propuesta Tecnica y Economica - Dinamica.docx
│   └── ...
└── Documentos Finales/
    ├── Cliente 1/
    │   ├── Propuesta_Cliente1_20241114.docx
    │   └── Propuesta_Cliente1_20241114.pdf
    ├── Cliente 2/
    │   └── ...
    └── ...
```

## 🔄 Flujo de Trabajo

### 1. Configuración Inicial (Una vez)

1. **Crear carpetas en Google Drive**:
   - `Propuestas - Secciones Estáticas`
   - `Propuestas - Secciones Dinámicas`
   - `Documentos Finales`

2. **Obtener IDs de carpetas**:
   - Abre cada carpeta en Google Drive
   - El ID está en la URL: `https://drive.google.com/drive/folders/[ID]`
   - Guarda estos IDs (los necesitarás en el frontend)

3. **Subir documentos**:
   - Sube documentos estáticos a la carpeta correspondiente
   - Sube documentos dinámicos a la carpeta correspondiente
   - Los documentos deben tener secciones numeradas (1., 2., 3., etc.)

### 2. Crear Propuesta

1. **Seleccionar documentos**:
   - Selecciona carpeta de documentos estáticos
   - Selecciona documento estático
   - Selecciona carpeta de documentos dinámicos
   - Selecciona documento dinámico

2. **Seleccionar cliente/prospecto**:
   - Elige de la lista de clientes/prospectos

3. **Crear propuesta**:
   - El sistema:
     - Extrae secciones de ambos documentos
     - Fusiona respetando el orden numérico
     - Crea documento final en carpeta del cliente
     - Guarda registro en BD

### 3. Exportar a PDF

1. **Click en "Exportar a PDF"**
2. El sistema:
   - Exporta el documento de Google Docs a PDF
   - Guarda el PDF en la carpeta del cliente
   - Actualiza metadatos de la propuesta

### 4. Enviar Correo

1. **Click en "Enviar Correo"**
2. **Completa**:
   - Email del cliente
   - Asunto (opcional)
   - Mensaje (opcional)
   - Enviar como PDF (checkbox)
3. El sistema:
   - Genera PDF si es necesario
   - Hace el documento compartible
   - Envía correo con enlace
   - Guarda registro en BD

## 🔌 Endpoints Disponibles

### Google Drive
- `GET /api/google-drive/folders/:folderId/files` - Listar archivos
- `GET /api/google-drive/folders/:folderId/docs` - Listar solo Google Docs
- `POST /api/google-drive/folders/find` - Buscar carpeta por nombre
- `POST /api/google-drive/folders/create` - Crear carpeta

### Propuestas (Google Drive)
- `POST /api/proposals/google-drive/create` - Crear propuesta desde Google Drive
- `POST /api/proposals/:id/export-pdf` - Exportar a PDF
- `POST /api/proposals/:id/send-email` - Enviar correo

## 📊 Base de Datos

### Tabla: `proposal_emails`
Registra todos los envíos de propuestas:
- `proposal_id` - ID de la propuesta
- `client_email` - Email del cliente
- `sent_at` - Fecha/hora de envío
- `document_type` - 'doc' o 'pdf'
- `document_id` - ID del documento en Google Drive
- `document_url` - URL compartible
- `subject` - Asunto del correo

## ⚙️ Variables de Entorno Necesarias

```env
# Google OAuth 2.0 (ya configurado)
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=...

# Email (para envío de propuestas)
EMAIL_SERVICE=gmail
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
EMAIL_FROM=noreply@cefiro.com
```

## 🚀 Próximos Pasos

1. **Crear carpetas en Google Drive** y obtener sus IDs
2. **Configurar variables de email** en `.env`
3. **Ejecutar migración** para crear tabla `proposal_emails`
4. **Crear interfaz frontend** para seleccionar documentos
5. **Probar el flujo completo**

