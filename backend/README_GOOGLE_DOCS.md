# 📚 Google Docs API - Guía Completa

## 🎯 ¿Por qué Google Docs?

Hemos migrado de manipular archivos Word directamente (que causaba corrupción) a usar **Google Docs API**, que es mucho más robusto y confiable.

## 🚀 Inicio Rápido

### Opción 1: Script Automático (Recomendado)

```bash
cd /Users/amiguelez/GitHub/cotizador/backend
node scripts/setup-google-docs.js
```

El script te guiará paso a paso para configurar las credenciales.

### Opción 2: Manual

Sigue la guía detallada en `CONFIGURAR_GOOGLE_DOCS.md`

## 📋 Checklist de Configuración

- [ ] Proyecto creado en Google Cloud Console
- [ ] Google Docs API habilitada
- [ ] Google Drive API habilitada
- [ ] Service Account creada
- [ ] Archivo JSON de credenciales descargado
- [ ] Variables de entorno agregadas al `.env`
- [ ] Backend reiniciado
- [ ] Logs muestran "✅ Google Docs API inicializada correctamente"

## 🔍 Verificar que Funciona

1. **Reinicia el backend**:
   ```bash
   cd /Users/amiguelez/GitHub/cotizador/backend
   npm run dev
   ```

2. **Busca en los logs**:
   ```
   ✅ Google Docs API inicializada correctamente
   ```

3. **Prueba crear una propuesta**:
   - Sube un documento dinámico
   - Aplica un template
   - Deberías ver en los logs: "📝 Creando documento en Google Docs..."

## 🎨 Flujo de Trabajo

1. **Usuario sube documento dinámico** → Se guarda en el servidor
2. **Usuario aplica template** → Sistema:
   - Extrae texto de documentos Word (mapping + dynamic)
   - Crea documento en Google Docs
   - Fusiona contenido estático + dinámico
   - Exporta a Word automáticamente
   - Guarda enlace de Google Docs en BD

## 📁 Archivos Relacionados

- `src/services/googleDocsService.js` - Servicio principal de Google Docs
- `src/controllers/templatesController.js` - Lógica de generación de documentos
- `CONFIGURAR_GOOGLE_DOCS.md` - Guía paso a paso
- `scripts/setup-google-docs.js` - Script de configuración automática

## 🔧 Troubleshooting

### "Google Docs API no está inicializada"

**Causa**: Variables de entorno no configuradas o incorrectas

**Solución**:
1. Verifica que el `.env` tenga todas las variables de Google Docs
2. Asegúrate de que `GOOGLE_PRIVATE_KEY` tenga los `\n` literales
3. Reinicia el backend

### "Permission denied"

**Causa**: APIs no habilitadas o Service Account sin permisos

**Solución**:
1. Ve a Google Cloud Console
2. Verifica que Google Docs API y Drive API estén habilitadas
3. Verifica que la Service Account exista

### Los documentos no se crean

**Causa**: Error en la autenticación o permisos

**Solución**:
1. Revisa los logs del backend para ver el error específico
2. Verifica que el archivo JSON de credenciales sea válido
3. Asegúrate de que el Service Account tenga acceso al proyecto

## 💡 Ventajas de Google Docs

✅ **Sin corrupción**: No manipulamos XML directamente  
✅ **Formato preservado**: Google Docs maneja todo automáticamente  
✅ **Colaboración**: Documentos compartibles y editables en tiempo real  
✅ **Exportación fácil**: Word, PDF, y más formatos  
✅ **Versionado**: Historial automático de cambios  
✅ **Fallback**: Si no está configurado, usa método tradicional

## 🔒 Seguridad

- **NUNCA** subas el archivo JSON de credenciales a Git
- El archivo `.env` ya está en `.gitignore`
- Las credenciales se leen solo del `.env` en el servidor

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del backend
2. Verifica la guía `CONFIGURAR_GOOGLE_DOCS.md`
3. Ejecuta el script de verificación: `node scripts/setup-google-docs.js`

