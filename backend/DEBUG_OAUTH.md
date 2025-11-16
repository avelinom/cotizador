# 🔍 Debug: OAuth 2.0 No Guarda Tokens

## Problema

Aceptaste los permisos pero el sistema dice que no estás autenticado.

## Posibles Causas

### 1. El callback no se ejecutó correctamente

**Síntoma**: Aceptaste permisos pero no viste ningún log en el backend.

**Solución**: 
- Verifica que el backend esté corriendo
- Revisa los logs del backend cuando aceptas los permisos
- Verifica que la URL de redirect_uri coincida exactamente

### 2. Error al intercambiar código por tokens

**Síntoma**: El callback se ejecutó pero hubo un error.

**Solución**:
- Revisa los logs del backend para ver el error específico
- Verifica que el Client ID y Client Secret sean correctos

### 3. Los tokens se guardaron pero se perdieron

**Síntoma**: Los tokens se guardaron pero el servidor se reinició.

**Solución**:
- Los tokens están en memoria, se pierden al reiniciar
- Necesitas autenticarte de nuevo después de reiniciar

## Pasos para Debug

### Paso 1: Verificar que el backend esté corriendo

```bash
lsof -i :3005
```

O visita: `http://localhost:3005/health`

### Paso 2: Revisar logs del backend

Cuando aceptas los permisos, deberías ver en los logs:

```
📥 Callback recibido, intercambiando código por tokens...
✅ Tokens de OAuth obtenidos exitosamente
✅ OAuth tokens obtenidos y almacenados en memoria
```

### Paso 3: Verificar estado después del callback

```bash
curl http://localhost:3005/api/google-oauth/status
```

Debería devolver: `{"success":true,"authenticated":true}`

### Paso 4: Si no funciona, intenta de nuevo

1. Visita: `http://localhost:3005/api/google-oauth/auth`
2. Copia la URL y ábrela
3. Acepta los permisos
4. **Mira los logs del backend** mientras aceptas
5. Verifica el estado: `curl http://localhost:3005/api/google-oauth/status`

## Solución Temporal: Guardar Tokens en Archivo

Si los tokens se pierden al reiniciar, podemos guardarlos en un archivo temporal (solo para desarrollo).

¿Quieres que implemente esto?

