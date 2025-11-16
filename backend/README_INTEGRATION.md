# Integración con Portal de Cefiro

## Configuración Requerida

Para que el backend del cotizador acepte tokens del portal de Cefiro, necesitas agregar la siguiente variable de entorno:

```bash
CEFIRO_PORTAL_JWT_SECRET=<mismo-secret-que-el-portal>
```

### Pasos:

1. **Obtener el JWT_SECRET del portal:**
   - El portal usa `JWT_SECRET` del archivo `.env` del backend del portal
   - Si no está configurado, usa el valor por defecto: `cefiro-secret-key-change-in-production`

2. **Agregar al `.env` del backend del cotizador:**
   ```bash
   CEFIRO_PORTAL_JWT_SECRET=cefiro-secret-key-change-in-production
   ```
   (O el valor que tengas configurado en el portal)

3. **Reiniciar el backend del cotizador** para que tome los cambios

## CORS

El backend ya está configurado para aceptar peticiones desde:
- `http://localhost:3006` (frontend original del cotizador)
- `http://localhost:3003` (portal de Cefiro)

## Autenticación

El middleware de autenticación ahora:
1. Intenta verificar el token con el secret del cotizador
2. Si falla, intenta con el secret del portal
3. Mapea `role_name` a `role` si viene del portal

