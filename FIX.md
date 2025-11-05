# Solución al Error "Ruta no encontrada"

## Problema
Error 404 "Ruta no encontrada" en localhost:3004

## Solución Aplicada
- ✅ Eliminada carpeta `src/app/` vacía que causaba conflicto
- ✅ Cache de Next.js limpiado
- ✅ Configuración verificada

## Pasos para Reiniciar

### 1. Detener procesos actuales (si están corriendo)

```bash
# Buscar y matar procesos en puertos 3004 y 3005
lsof -ti :3004 | xargs kill -9 2>/dev/null
lsof -ti :3005 | xargs kill -9 2>/dev/null
```

### 2. Iniciar Backend

```bash
cd /Users/amiguelez/GitHub/cotizador/backend
npm run dev
```

Deberías ver:
```
🚀 Cotizador Backend running on 0.0.0.0:3005
```

### 3. Iniciar Frontend (en nueva terminal)

```bash
cd /Users/amiguelez/GitHub/cotizador/frontend
npm run dev
```

Deberías ver:
```
- ready started server on 0.0.0.0:3004
- Local:        http://localhost:3004
```

### 4. Verificar

1. Abre http://localhost:3004
2. Debería redirigir a /login automáticamente
3. Si ves el error, verifica que ambos servicios estén corriendo

## Verificar Estado

```bash
# Verificar puertos
lsof -i :3004 -i :3005

# Verificar logs del backend
cd /Users/amiguelez/GitHub/cotizador/backend && tail -f combined.log
```

