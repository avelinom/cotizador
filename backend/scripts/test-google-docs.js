#!/usr/bin/env node

/**
 * Script de prueba para verificar que Google Docs API está configurada correctamente
 */

require('dotenv').config();
const googleDocsService = require('../src/services/googleDocsService');

async function test() {
  console.log('🧪 Probando configuración de Google Docs API...\n');
  
  // Verificar variables de entorno
  console.log('📋 Verificando variables de entorno:');
  const requiredVars = [
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY_ID',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_CERT_URL'
  ];
  
  let allPresent = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: ${varName === 'GOOGLE_PRIVATE_KEY' ? '***configurado***' : value.substring(0, 50)}...`);
    } else {
      console.log(`   ❌ ${varName}: NO CONFIGURADO`);
      allPresent = false;
    }
  }
  
  if (!allPresent) {
    console.log('\n❌ Faltan variables de entorno. Por favor, configura el .env primero.');
    process.exit(1);
  }
  
  console.log('\n🔌 Inicializando Google Docs API...\n');
  
  try {
    const initialized = await googleDocsService.initialize();
    
    if (initialized) {
      console.log('✅ ¡Google Docs API está funcionando correctamente!\n');
      console.log('🎉 Puedes usar el sistema de cotizador con Google Docs.\n');
      
      // Opcional: crear un documento de prueba
      console.log('📝 Creando documento de prueba...');
      try {
        const testDoc = await googleDocsService.createDocument('Test - Cotizador');
        console.log(`   ✅ Documento de prueba creado: ${testDoc.documentId}`);
        console.log(`   🔗 URL: https://docs.google.com/document/d/${testDoc.documentId}/edit\n`);
        
        // Limpiar: eliminar documento de prueba
        console.log('🧹 Eliminando documento de prueba...');
        await googleDocsService.deleteDocument(testDoc.documentId);
        console.log('   ✅ Documento de prueba eliminado\n');
      } catch (testError) {
        console.log(`   ⚠️  No se pudo crear documento de prueba: ${testError.message}`);
        console.log('   (Esto puede ser normal si hay problemas de permisos)\n');
      }
      
      process.exit(0);
    } else {
      console.log('❌ Google Docs API no se pudo inicializar.');
      console.log('   Revisa las credenciales y los logs para más detalles.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nDetalles del error:');
    console.error(error);
    process.exit(1);
  }
}

test();

