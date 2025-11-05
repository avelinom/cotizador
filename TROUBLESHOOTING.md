# Troubleshooting - Cotizador

## Error: "Unexpected token 'I', "Internal S"... is not valid JSON"

### Causa
Este error ocurre cuando:
1. El backend no está corriendo en el puerto 3005
2. El frontend intenta hacer una petición y recibe un error HTML en lugar de JSON
3. El formato de respuesta del backend no coincide con lo que espera el frontend

### Solución

**1. Verificar que el backend esté corriendo:**
```bash
lsof -i :3005 | grep LISTEN
```

Si no hay nada, iniciar el backend:
```bash
cd /Users/amiguelez/GitHub/cotizador/backend
npm run dev
```

Deberías ver:
```
🚀 Cotizador Backend running on 0.0.0.0:3005
```

**2. Verificar que el frontend esté corriendo:**
```bash
lsof -i :3006 | grep LISTEN
```

Si no hay nada, iniciar el frontend:
```bash
cd /Users/amiguelez/GitHub/cotizador/frontend
npm run dev
```

**3. Probar el login directamente:**
```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cotizador.com","password":"admin123"}'
```

Deberías recibir JSON válido:
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "user": {...},
    "token": "..."
  }
}
```

## Error: "Cannot connect to database"

### Solución
1. Verificar que PostgreSQL esté corriendo:
```bash
pg_isready
```

2. Verificar que la base de datos existe:
```bash
psql -U amiguelez -d cotizador_db -c "SELECT 1"
```

3. Verificar las credenciales en `.env`:
```bash
cd /Users/amiguelez/GitHub/cotizador/backend
cat .env | grep DB_
```

## Error: "Ruta no encontrada" en frontend

### Solución
1. Limpiar cache de Next.js:
```bash
cd /Users/amiguelez/GitHub/cotizador/frontend
rm -rf .next
npm run dev
```

2. Verificar que estés accediendo a http://localhost:3006 (NO 3004)

## Verificar que todo está funcionando

```bash
# Verificar puertos
lsof -i :3005 -i :3006

# Probar backend
curl http://localhost:3005/health

# Probar frontend
curl http://localhost:3006/
```

## Reiniciar todo desde cero

```bash
# Detener todos los procesos
lsof -ti :3005 | xargs kill -9 2>/dev/null
lsof -ti :3006 | xargs kill -9 2>/dev/null

# Iniciar backend
cd /Users/amiguelez/GitHub/cotizador/backend
npm run dev

# En otra terminal, iniciar frontend
cd /Users/amiguelez/GitHub/cotizador/frontend
npm run dev
```

