# Cotizador - Generador de Propuestas

Herramienta para generar y gestionar propuestas automáticamente a partir de documentos Word. El sistema procesa documentos Word, extrae secciones, permite visualizarlas y editarlas con control de márgenes, y exporta a Word o PDF.

## Características

- **Upload de Documentos Word**: Sube archivos .docx o .doc
- **Procesamiento Automático**: Extrae y formatea secciones del documento
- **Visualización**: Previsualiza las propuestas formateadas
- **Edición por Secciones**: Edita secciones individuales con control de márgenes
- **Exportación**: Exporta a Word (.docx) o PDF

## Tech Stack

### Backend
- Node.js con Express
- PostgreSQL database
- Mammoth (para procesar Word)
- Docx (para generar Word)
- PDFKit (para generar PDF)
- Multer (para upload de archivos)

### Frontend
- Next.js 15 con TypeScript
- Material-UI (MUI)
- React Hooks

## Prerrequisitos

- Node.js 18.0.0 o superior
- PostgreSQL 12 o superior
- npm o yarn

## Instalación

### Backend Setup

1. Navega al directorio backend:
```bash
cd backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```

4. Edita el archivo `.env` con tus configuraciones:
```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=cotizador_db

# JWT Configuration
JWT_SECRET=tu-jwt-secret-super-seguro-aqui
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads/proposals
```

5. Crea la base de datos:
```bash
createdb cotizador_db
```

6. Ejecuta las migraciones:
```bash
npm run migrate
```

7. Inicia el servidor backend:
```bash
npm run dev
```

El backend estará disponible en `http://localhost:3001`

### Frontend Setup

1. Navega al directorio frontend:
```bash
cd frontend
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.local.example .env.local
```

4. Edita el archivo `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

5. Inicia el servidor de desarrollo:
```bash
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

## Uso

1. **Subir Propuesta**: Haz clic en "Nueva Propuesta" y sube un archivo Word
2. **Visualizar**: Una vez procesado, puedes ver todas las secciones
3. **Editar Secciones**: Haz clic en el ícono de editar para modificar contenido y márgenes
4. **Exportar**: Exporta la propuesta final a Word o PDF

## Estructura del Proyecto

```
cotizador/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.js
│   ├── migrations/
│   ├── uploads/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── .env.local.example
│   └── package.json
├── .gitignore
└── README.md
```

## Desarrollo

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Migraciones de Base de Datos
```bash
cd backend
npm run migrate
```

## API Endpoints

### Propuestas
- `GET /api/proposals` - Obtener todas las propuestas
- `GET /api/proposals/:id` - Obtener una propuesta específica
- `POST /api/proposals` - Subir y procesar un documento Word
- `PUT /api/proposals/:id` - Actualizar una propuesta
- `PUT /api/proposals/:id/sections/:sectionId` - Actualizar una sección
- `DELETE /api/proposals/:id` - Eliminar una propuesta
- `GET /api/proposals/:id/export/word` - Exportar a Word
- `GET /api/proposals/:id/export/pdf` - Exportar a PDF

## Despliegue

### Backend
1. Configura una base de datos PostgreSQL (Neon, Supabase, AWS RDS, etc.)
2. Despliega en una plataforma cloud (Render, Heroku, AWS, etc.)
3. Configura las variables de entorno en la plataforma
4. Ejecuta las migraciones

### Frontend
1. Construye el frontend:
```bash
cd frontend
npm run build
```

2. Despliega en una plataforma estática (Vercel, Netlify, etc.)

## Licencia

MIT License

## Soporte

Para soporte, abre un issue en el repositorio de GitHub o contacta al equipo de desarrollo.

