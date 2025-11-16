# 📧 Configuración de Email para Envío de Propuestas

## Variables de Entorno Necesarias

Agrega las siguientes variables a tu archivo `.env` del backend:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=tu-app-password
EMAIL_FROM=noreply@cefiro.com
```

## Configuración para Gmail

### 1. Habilitar Autenticación de 2 Factores
- Ve a tu cuenta de Google
- Activa la autenticación de 2 factores

### 2. Generar App Password
1. Ve a: https://myaccount.google.com/apppasswords
2. Selecciona "Mail" y "Other (Custom name)"
3. Ingresa un nombre (ej: "Cotizador Cefiro")
4. Copia la contraseña generada (16 caracteres sin espacios)
5. Úsala como `EMAIL_PASSWORD` en el `.env`

### 3. Configurar Variables
```env
EMAIL_SERVICE=gmail
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # Sin espacios
EMAIL_FROM=tu-email@gmail.com
```

## Otras Opciones de Email

### SendGrid
```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=tu-sendgrid-api-key
EMAIL_FROM=noreply@cefiro.com
```

### SMTP Personalizado
```env
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.tu-servidor.com
EMAIL_PORT=587
EMAIL_USER=tu-usuario
EMAIL_PASSWORD=tu-contraseña
EMAIL_FROM=noreply@cefiro.com
```

## Notas

- **Gmail**: Requiere App Password si tienes 2FA activado
- **SendGrid**: Requiere cuenta y API key
- **SMTP Personalizado**: Configura según tu proveedor

## Prueba de Configuración

Una vez configurado, puedes probar enviando una propuesta desde la interfaz. El sistema registrará el envío en la tabla `proposal_emails`.

