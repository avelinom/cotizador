# Cotizador - Generador de Propuestas

Sistema para generar y gestionar propuestas automáticamente desde documentos Word.

## Características

- 📄 Upload de archivos Word (.docx, .doc)
- 🔄 Procesamiento automático y extracción de secciones
- ✏️ Edición visual de secciones con control de márgenes
- 📊 Visualización de propuestas formateadas
- 📥 Exportación a Word y PDF
- 💾 Gestión de múltiples propuestas

## Estructura del Proyecto

```
Cotizador/
├── backend/          # API Node.js + Express
├── frontend/         # Frontend Next.js + TypeScript
├── README.md
└── .gitignore
```

## Tecnologías

### Backend
- Node.js + Express
- PostgreSQL
- mammoth (procesamiento de Word)
- docx (generación de Word)
- PDFKit (generación de PDF)

### Frontend
- Next.js 14
- TypeScript
- Material-UI
- React Hooks

## Instalación

### Prerrequisitos
- Node.js >= 18
- PostgreSQL >= 12
- npm >= 8

### Configuración del Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus configuraciones
npm run migrate
npm run dev
```

### Configuración del Frontend

```bash
cd frontend
npm install
npm run dev
```

## Desarrollo

El backend corre en `http://localhost:3001`
El frontend corre en `http://localhost:3000`

## Licencia

MIT
