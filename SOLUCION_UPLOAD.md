# Solución al Error "Error al procesar la propuesta"

## Problema
Al intentar subir un archivo Word, se recibía el error:
```
Error al procesar la propuesta
```

## Causa
El controlador intentaba insertar `company_id` en la base de datos, pero la tabla `proposals` no tiene esa columna.

## Solución Aplicada
✅ Eliminadas todas las referencias a `company_id` del backend
✅ Eliminadas referencias a `company_id` y `company_name` del frontend
✅ Código actualizado y guardado en GitHub

## Para Aplicar la Corrección

**Si el backend ya está corriendo, reinícialo:**

```bash
# Detener backend
lsof -ti :3005 | xargs kill -9 2>/dev/null

# Reiniciar backend
cd /Users/amiguelez/GitHub/cotizador/backend
npm run dev
```

O simplemente reinicia el proceso del backend (Ctrl+C y vuelve a iniciarlo).

## Verificar que Funciona

1. Abre http://localhost:3006
2. Inicia sesión
3. Haz clic en "Nueva Propuesta"
4. Sube un archivo Word (.docx o .doc)
5. Ingresa un título
6. Haz clic en "Subir y Procesar"

Debería funcionar correctamente ahora.

## Si Aún Hay Problemas

1. Verifica que el backend esté corriendo:
```bash
lsof -i :3005
```

2. Verifica los logs del backend:
```bash
cd /Users/amiguelez/GitHub/cotizador/backend
tail -f combined.log
```

3. Verifica que la base de datos tenga la estructura correcta:
```bash
psql -U amiguelez -d cotizador_db -c "\d proposals"
```

La tabla NO debe tener columna `company_id`.

