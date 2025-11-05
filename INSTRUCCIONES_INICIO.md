# Instrucciones para Iniciar el Cotizador

## Método 1: Script Automático (Recomendado)

```bash
cd /Users/amiguelez/GitHub/cotizador
./start-dev.sh
```

Este script:
- ✅ Verifica y libera puertos si están ocupados
- ✅ Inicia backend en puerto 3005
- ✅ Inicia frontend en puerto 3006
- ✅ Muestra las URLs y credenciales

Para detener: Presiona `Ctrl+C`

## Método 2: Manual (Dos Terminales)

### Terminal 1 - Backend

```bash
cd /Users/amiguelez/GitHub/cotizador/backend
npm run dev
```

Deberías ver:
```
🚀 Cotizador Backend running on 0.0.0.0:3005
```

### Terminal 2 - Frontend

```bash
cd /Users/amiguelez/GitHub/cotizador/frontend
npm run dev
```

Deberías ver:
```
▲ Next.js 14.2.33
- Local:        http://localhost:3006
✓ Ready in X.Xs
```

## Verificar que está corriendo

```bash
# Verificar puertos
lsof -i :3005 -i :3006

# Verificar que responden
curl http://localhost:3005/health
curl http://localhost:3006/
```

## Acceder a la aplicación

1. Abre tu navegador
2. Ve a: **http://localhost:3006**
3. Debería redirigir automáticamente a `/login`
4. Usa las credenciales:
   - Email: `admin@cotizador.com`
   - Password: `admin123`

## Problemas Comunes

### Error: "Puerto en uso"
```bash
# Detener procesos en puertos 3005 y 3006
lsof -ti :3005 | xargs kill -9 2>/dev/null
lsof -ti :3006 | xargs kill -9 2>/dev/null
```

### Error: "Cannot connect to database"
```bash
# Verificar que PostgreSQL esté corriendo
pg_isready

# Verificar que la base de datos existe
psql -U amiguelez -d cotizador_db -c "SELECT 1"
```

### Frontend no responde
```bash
# Limpiar cache de Next.js
cd /Users/amiguelez/GitHub/cotizador/frontend
rm -rf .next
npm run dev
```

## Estructura de Puertos

- **3005**: Backend API ✅
- **3006**: Frontend Next.js ✅

