#!/usr/bin/env node

/**
 * Script de prueba para verificar OAuth 2.0 de Google Docs
 */

require('dotenv').config();
const googleOAuthService = require('../src/services/googleOAuthService');
const googleDocsService = require('../src/services/googleDocsService');

async function test() {
  console.log('🧪 Probando OAuth 2.0 para Google Docs API...\n');
  
  // Verificar variables de entorno
  console.log('📋 Verificando variables de entorno OAuth:');
  const requiredVars = [
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET'
  ];
  
  let allPresent = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: ${value.substring(0, 30)}...`);
    } else {
      console.log(`   ❌ ${varName}: NO CONFIGURADO`);
      allPresent = false;
    }
  }
  
  if (!allPresent) {
    console.log('\n❌ Faltan variables de entorno OAuth.');
    console.log('   Por favor, configura OAuth 2.0 siguiendo CONFIGURAR_OAUTH2.md\n');
    process.exit(1);
  }
  
  // Inicializar OAuth
  console.log('\n🔌 Inicializando OAuth 2.0...\n');
  googleOAuthService.initialize();
  
  // Verificar si está autenticado
  const isAuthenticated = googleOAuthService.isAuthenticated();
  
  if (!isAuthenticated) {
    console.log('⚠️  No estás autenticado con OAuth 2.0.\n');
    console.log('📝 Para autenticarte:');
    console.log('   1. Visita: http://localhost:3005/api/google-oauth/auth');
    console.log('   2. Obtendrás una URL, cópiala y ábrela en el navegador');
    console.log('   3. Inicia sesión con Google y acepta los permisos');
    console.log('   4. Vuelve a ejecutar este script\n');
    
    // Mostrar URL de autorización
    try {
      const authUrl = googleOAuthService.getAuthUrl();
      console.log('🔗 URL de autorización:');
      console.log(`   ${authUrl}\n`);
    } catch (error) {
      console.error('❌ Error obteniendo URL de autorización:', error.message);
    }
    
    process.exit(1);
  }
  
  console.log('✅ Estás autenticado con OAuth 2.0\n');
  
  // Probar creación de documento
  console.log('📝 Probando creación de documento...\n');
  
  try {
    await googleDocsService.initialize();
    
    if (!googleDocsService.initialized) {
      console.error('❌ Google Docs Service no se pudo inicializar');
      process.exit(1);
    }
    
    const testDoc = await googleDocsService.createDocument('Test OAuth - Cotizador');
    console.log('✅ Documento de prueba creado exitosamente!');
    console.log(`   ID: ${testDoc.documentId}`);
    console.log(`   Nombre: ${testDoc.title || testDoc.name}`);
    if (testDoc.webViewLink) {
      console.log(`   URL: ${testDoc.webViewLink}`);
    }
    console.log();
    
    // Limpiar: eliminar documento de prueba
    console.log('🧹 Eliminando documento de prueba...');
    await googleDocsService.deleteDocument(testDoc.documentId);
    console.log('   ✅ Documento eliminado\n');
    
    console.log('🎉 ¡OAuth 2.0 está funcionando correctamente!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 403) {
      console.error('\n💡 El problema puede ser de permisos. Verifica que hayas aceptado todos los permisos solicitados.');
    }
    process.exit(1);
  }
}

test();

