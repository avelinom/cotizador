#!/usr/bin/env node

/**
 * Script para verificar el estado de OAuth en el backend (no en el script local)
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3005,
  path: '/api/google-oauth/status',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📊 Estado de OAuth en el backend:');
      console.log(`   Autenticado: ${response.authenticated ? '✅ SÍ' : '❌ NO'}\n`);
      
      if (response.authenticated) {
        console.log('✅ El backend tiene tokens de OAuth guardados');
        console.log('   Puedes usar Google Docs API ahora.\n');
      } else {
        console.log('⚠️  El backend NO tiene tokens de OAuth');
        console.log('   Necesitas autenticarte visitando:');
        console.log('   http://localhost:3005/api/google-oauth/auth\n');
      }
    } catch (error) {
      console.error('❌ Error parseando respuesta:', error);
      console.log('Respuesta:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error conectando al backend:', error.message);
  console.log('   Asegúrate de que el backend esté corriendo en http://localhost:3005\n');
});

req.end();

