#!/usr/bin/env node

/**
 * Script para configurar Google Docs API desde archivo JSON
 * Uso: node scripts/setup-google-docs-from-json.js <ruta-al-json>
 */

const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 Uso: node scripts/setup-google-docs-from-json.js <ruta-al-json>');
    console.log('\nEjemplo:');
    console.log('  node scripts/setup-google-docs-from-json.js ~/Downloads/cotizador-docs-xxxxx.json\n');
    process.exit(1);
  }

  const jsonPath = args[0];
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Error: No se encontró el archivo: ${jsonPath}`);
    process.exit(1);
  }

  console.log('📖 Leyendo archivo JSON...\n');
  
  let credentials;
  try {
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    credentials = JSON.parse(jsonContent);
    console.log('✅ Archivo JSON leído correctamente\n');
  } catch (error) {
    console.error('❌ Error leyendo el archivo JSON:', error.message);
    process.exit(1);
  }

  // Validar que tenga los campos necesarios
  const requiredFields = ['project_id', 'private_key_id', 'private_key', 'client_email', 'client_id', 'client_x509_cert_url'];
  const missingFields = requiredFields.filter(field => !credentials[field]);
  
  if (missingFields.length > 0) {
    console.error(`❌ Error: Faltan campos en el JSON: ${missingFields.join(', ')}`);
    process.exit(1);
  }

  // Leer el archivo .env actual
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Remover configuración existente de Google Docs si existe
  if (envContent.includes('GOOGLE_PROJECT_ID')) {
    console.log('⚠️  Se encontró configuración existente de Google Docs. Será reemplazada.\n');
    envContent = envContent.replace(/# Google Docs API Configuration[\s\S]*?GOOGLE_CLIENT_CERT_URL=.*\n/g, '');
  }

  // Preparar el private_key (escapar comillas y mantener \n literales)
  const privateKey = credentials.private_key
    .replace(/\\n/g, '\\n')  // Asegurar que los \n sean literales
    .replace(/"/g, '\\"');   // Escapar comillas

  // Agregar nuevas variables
  const googleDocsConfig = `
# Google Docs API Configuration
GOOGLE_PROJECT_ID=${credentials.project_id}
GOOGLE_PRIVATE_KEY_ID=${credentials.private_key_id}
GOOGLE_PRIVATE_KEY="${privateKey}"
GOOGLE_CLIENT_EMAIL=${credentials.client_email}
GOOGLE_CLIENT_ID=${credentials.client_id}
GOOGLE_CLIENT_CERT_URL=${credentials.client_x509_cert_url}
`;

  envContent += googleDocsConfig;

  // Escribir el archivo .env
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Variables de entorno agregadas al archivo .env\n');
    console.log('📝 Configuración completada:\n');
    console.log(`   Project ID: ${credentials.project_id}`);
    console.log(`   Client Email: ${credentials.client_email}\n`);
    console.log('🚀 Próximos pasos:');
    console.log('   1. Reinicia el backend: npm run dev');
    console.log('   2. Verifica en los logs: "✅ Google Docs API inicializada correctamente"');
    console.log('\n✨ ¡Listo! El sistema ahora usará Google Docs para generar documentos.\n');
  } catch (error) {
    console.error('❌ Error escribiendo el archivo .env:', error.message);
    process.exit(1);
  }
}

main();

