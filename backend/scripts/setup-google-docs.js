#!/usr/bin/env node

/**
 * Script helper para configurar Google Docs API
 * Este script ayuda a agregar las variables de entorno necesarias
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🚀 Configuración de Google Docs API\n');
  console.log('Este script te ayudará a configurar las variables de entorno.\n');
  console.log('Primero, necesitas:');
  console.log('1. Crear un proyecto en Google Cloud Console');
  console.log('2. Habilitar Google Docs API y Google Drive API');
  console.log('3. Crear una Service Account y descargar el archivo JSON\n');
  
  const continueSetup = await question('¿Ya tienes el archivo JSON de credenciales? (s/n): ');
  
  if (continueSetup.toLowerCase() !== 's' && continueSetup.toLowerCase() !== 'si') {
    console.log('\n📖 Por favor, sigue la guía en CONFIGURAR_GOOGLE_DOCS.md primero.');
    console.log('Luego ejecuta este script nuevamente.\n');
    rl.close();
    return;
  }

  const jsonPath = await question('\n📁 Ruta al archivo JSON descargado (o presiona Enter para ingresar manualmente): ');
  
  let credentials = {};
  
  if (jsonPath && fs.existsSync(jsonPath)) {
    try {
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      credentials = JSON.parse(jsonContent);
      console.log('✅ Archivo JSON leído correctamente\n');
    } catch (error) {
      console.error('❌ Error leyendo el archivo JSON:', error.message);
      console.log('Continuando con entrada manual...\n');
    }
  }

  // Si no se leyó el JSON, pedir valores manualmente
  if (!credentials.project_id) {
    credentials.project_id = await question('Project ID: ');
  }
  
  if (!credentials.private_key_id) {
    credentials.private_key_id = await question('Private Key ID: ');
  }
  
  if (!credentials.private_key) {
    console.log('\n⚠️  Para el Private Key, copia TODO el contenido incluyendo los \\n');
    credentials.private_key = await question('Private Key (con \\n literales): ');
  }
  
  if (!credentials.client_email) {
    credentials.client_email = await question('Client Email: ');
  }
  
  if (!credentials.client_id) {
    credentials.client_id = await question('Client ID: ');
  }
  
  if (!credentials.client_x509_cert_url) {
    credentials.client_x509_cert_url = await question('Client X509 Cert URL: ');
  }

  // Leer el archivo .env actual
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Verificar si ya existen las variables
  if (envContent.includes('GOOGLE_PROJECT_ID')) {
    const overwrite = await question('\n⚠️  Ya existen variables de Google Docs en .env. ¿Sobrescribir? (s/n): ');
    if (overwrite.toLowerCase() !== 's' && overwrite.toLowerCase() !== 'si') {
      console.log('\n❌ Configuración cancelada.');
      rl.close();
      return;
    }
    
    // Remover variables existentes
    envContent = envContent.replace(/# Google Docs API Configuration[\s\S]*?GOOGLE_CLIENT_CERT_URL=.*\n/g, '');
  }

  // Agregar nuevas variables
  const googleDocsConfig = `
# Google Docs API Configuration
GOOGLE_PROJECT_ID=${credentials.project_id}
GOOGLE_PRIVATE_KEY_ID=${credentials.private_key_id}
GOOGLE_PRIVATE_KEY="${credentials.private_key.replace(/"/g, '\\"')}"
GOOGLE_CLIENT_EMAIL=${credentials.client_email}
GOOGLE_CLIENT_ID=${credentials.client_id}
GOOGLE_CLIENT_CERT_URL=${credentials.client_x509_cert_url}
`;

  envContent += googleDocsConfig;

  // Escribir el archivo .env
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ Variables de entorno agregadas al archivo .env');
  console.log('\n📝 Próximos pasos:');
  console.log('1. Reinicia el backend: npm run dev');
  console.log('2. Verifica en los logs que aparezca: "✅ Google Docs API inicializada correctamente"');
  console.log('\n✨ ¡Listo! El sistema ahora usará Google Docs para generar documentos.\n');
  
  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});

