# Guía de Configuración - Cotizador

## Prerrequisitos

1. **Node.js** >= 18.0.0
2. **PostgreSQL** >= 12.0
3. **npm** >= 8.0.0

## Configuración Inicial

### 1. Base de Datos PostgreSQL

```sql
-- Crear base de datos
CREATE DATABASE cotizador_db;

-- O usar psql
psql -U postgres -c "CREATE DATABASE cotizador_db;"
```

### 2. Configurar Backend

```bash
cd backend
npm install

# Copiar archivo de configuración
cp env.example .env

# Editar .env con tus configuraciones:
# - DB_NAME=cotizador_db
# - DB_USER=tu_usuario
# - DB_PASSWORD=tu_password
# - JWT_SECRET=tu-secret-key-seguro
```

### 3. Ejecutar Migraciones

```bash
cd backend
npm run migrate
```

### 4. Crear Usuario Inicial

```bash
# Opción 1: Usar SQL directamente
psql -U postgres -d cotizador_db -c "INSERT INTO users (email, password, name, role, is_active) VALUES ('admin@cotizador.com', '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYq5j5K6L5m', 'Admin', 'admin', true);"

# Opción 2: Usar el endpoint de registro (después de iniciar el servidor)
# POST http://localhost:3001/api/auth/register
# {
#   "email": "admin@cotizador.com",
#   "password": "password123",
#   "name": "Admin"
# }
```

### 5. Configurar Frontend

```bash
cd frontend
npm install

# Crear archivo .env.local (opcional, por defecto usa /api)
# echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
```

## Ejecutar el Proyecto

### Desarrollo

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend correrá en: http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend correrá en: http://localhost:3000

### Producción

**Backend:**
```bash
cd backend
npm run migrate
NODE_ENV=production npm start
```

**Frontend:**
```bash
cd frontend
npm run build
NODE_ENV=production npm start
```

## Estructura del Proyecto

```
cotizador/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuración (DB, app)
│   │   ├── controllers/   # Controladores de lógica
│   │   ├── middleware/    # Middleware (auth, error handling)
│   │   ├── routes/        # Rutas de API
│   │   ├── utils/         # Utilidades (logger)
│   │   └── server.js       # Servidor principal
│   ├── migrations/        # Migraciones de base de datos
│   ├── uploads/           # Archivos subidos
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/         # Páginas Next.js
│   │   ├── components/    # Componentes React
│   │   ├── hooks/         # Custom hooks
│   │   └── services/      # Servicios API
│   └── package.json
└── README.md
```

## Crear Repositorio en GitHub

```bash
cd /Users/amiguelez/GitHub/cotizador

# Inicializar git (ya está hecho)
git add .
git commit -m "Initial commit: Cotizador project setup"

# Crear repositorio en GitHub y luego:
git remote add origin https://github.com/tu-usuario/cotizador.git
git branch -M main
git push -u origin main
```

## Variables de Entorno

### Backend (.env)

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=cotizador_db
DB_USER=postgres
DB_PASSWORD=
DB_SSL=false

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

CORS_ORIGIN=http://localhost:3000
```

## Troubleshooting

### Error de conexión a base de datos
- Verifica que PostgreSQL esté corriendo: `pg_isready`
- Verifica las credenciales en `.env`
- Verifica que la base de datos exista

### Error de migraciones
- Asegúrate de que la base de datos esté creada
- Verifica las credenciales en `.env`
- Ejecuta `npm run migrate:rollback` si hay problemas

### Error de permisos en uploads
- Asegúrate de que el directorio `backend/uploads/proposals` exista
- Verifica permisos de escritura

## Siguiente Paso

Una vez configurado, puedes:
1. Acceder a http://localhost:3000
2. Iniciar sesión con el usuario creado
3. Subir tu primer documento Word
4. Comenzar a generar propuestas

