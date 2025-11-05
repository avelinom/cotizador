# Iniciar Ambiente de Desarrollo

## Configuración de Puertos

- **Backend**: Puerto 3005
- **Frontend**: Puerto 3004

## Credenciales de Acceso

**Usuario Admin:**
- Email: `admin@cotizador.com`
- Password: `admin123`

## Iniciar Servicios

### Terminal 1 - Backend

```bash
cd /Users/amiguelez/GitHub/cotizador/backend
npm run dev
```

El backend estará disponible en: http://localhost:3005

### Terminal 2 - Frontend

```bash
cd /Users/amiguelez/GitHub/cotizador/frontend
npm run dev
```

El frontend estará disponible en: http://localhost:3004

## Verificar que todo funciona

1. Abre http://localhost:3004 en tu navegador
2. Inicia sesión con las credenciales de admin
3. Deberías ver la página de propuestas

## Base de Datos

- **Nombre**: `cotizador_db`
- **Usuario**: `amiguelez`
- **Host**: `localhost:5432`
- **Migraciones**: Ya ejecutadas ✅

## Estructura de Puertos en tu Mac

- **3000**: Healthynola Frontend
- **3001**: Healthynola Backend
- **3002**: BeWealth
- **3003**: Cefiro Azure Portal
- **3004**: Cotizador Frontend ✅
- **3005**: Cotizador Backend ✅

