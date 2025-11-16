#!/usr/bin/env node

/**
 * Script para verificar que la carpeta de Google Drive esté compartida correctamente
 */

require('dotenv').config();
const { google } = require('googleapis');
const logger = require('../src/utils/logger');

async function verificarCarpeta() {
  console.log('🔍 Verificando acceso a la carpeta de Google Drive...\n');

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const serviceAccountEmail = process.env.GOOGLE_CLIENT_EMAIL;

  if (!folderId) {
    console.error('❌ GOOGLE_DRIVE_FOLDER_ID no está configurado en .env');
    process.exit(1);
  }

  if (!serviceAccountEmail) {
    console.error('❌ GOOGLE_CLIENT_EMAIL no está configurado en .env');
    process.exit(1);
  }

  console.log(`📁 ID de carpeta: ${folderId}`);
  console.log(`👤 Service Account: ${serviceAccountEmail}\n`);

  try {
    // Obtener credenciales
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL
    };

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    const authClient = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: authClient });

    // Intentar obtener información de la carpeta
    console.log('📋 Intentando acceder a la carpeta...');
    try {
      const folderInfo = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, permissions, shared'
      });

      console.log('✅ Carpeta encontrada:');
      console.log(`   Nombre: ${folderInfo.data.name}`);
      console.log(`   ID: ${folderInfo.data.id}`);
      console.log(`   Compartida: ${folderInfo.data.shared ? 'Sí' : 'No'}\n`);

      // Verificar permisos
      if (folderInfo.data.permissions) {
        console.log('👥 Permisos en la carpeta:');
        const serviceAccountHasAccess = folderInfo.data.permissions.some(
          perm => perm.emailAddress === serviceAccountEmail
        );

        if (serviceAccountHasAccess) {
          console.log(`   ✅ Service Account tiene acceso`);
        } else {
          console.log(`   ❌ Service Account NO tiene acceso`);
          console.log(`\n🔧 Solución:`);
          console.log(`   1. Ve a Google Drive`);
          console.log(`   2. Abre la carpeta con ID: ${folderId}`);
          console.log(`   3. Haz clic derecho → Compartir`);
          console.log(`   4. Agrega este email como Editor:`);
          console.log(`      ${serviceAccountEmail}`);
          console.log(`   5. Guarda y vuelve a ejecutar este script\n`);
        }

        folderInfo.data.permissions.forEach(perm => {
          console.log(`   - ${perm.emailAddress || perm.type}: ${perm.role}`);
        });
      }
    } catch (error) {
      if (error.code === 404) {
        console.error('❌ Carpeta no encontrada. Verifica que el ID sea correcto.');
      } else if (error.code === 403) {
        console.error('❌ No tienes permisos para acceder a esta carpeta.');
        console.error(`\n🔧 Solución:`);
        console.error(`   1. Ve a Google Drive`);
        console.error(`   2. Abre la carpeta con ID: ${folderId}`);
        console.error(`   3. Haz clic derecho → Compartir`);
        console.error(`   4. Agrega este email como Editor:`);
        console.error(`      ${serviceAccountEmail}`);
        console.error(`   5. Guarda y vuelve a ejecutar este script\n`);
      } else {
        console.error('❌ Error:', error.message);
      }
      process.exit(1);
    }

    // Intentar crear un archivo de prueba
    console.log('\n🧪 Intentando crear archivo de prueba...');
    try {
      const testFile = await drive.files.create({
        requestBody: {
          name: 'test-cotizador-' + Date.now(),
          mimeType: 'application/vnd.google-apps.document',
          parents: [folderId]
        },
        fields: 'id, name, webViewLink'
      });

      console.log('✅ Archivo de prueba creado exitosamente!');
      console.log(`   ID: ${testFile.data.id}`);
      console.log(`   Nombre: ${testFile.data.name}`);
      console.log(`   URL: ${testFile.data.webViewLink}\n`);

      // Limpiar: eliminar archivo de prueba
      console.log('🧹 Eliminando archivo de prueba...');
      await drive.files.delete({
        fileId: testFile.data.id
      });
      console.log('   ✅ Archivo eliminado\n');

      console.log('🎉 ¡Todo está funcionando correctamente!\n');
    } catch (error) {
      console.error('❌ Error creando archivo de prueba:', error.message);
      if (error.code === 403) {
        console.error('\n🔧 El problema es que la Service Account no puede crear archivos en la carpeta.');
        console.error('   Asegúrate de:');
        console.error(`   1. La carpeta esté compartida con: ${serviceAccountEmail}`);
        console.error('   2. Los permisos sean de "Editor" (no solo "Lector")');
        console.error('   3. La carpeta no esté en "Mi unidad" de otra cuenta\n');
      }
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    process.exit(1);
  }
}

verificarCarpeta();

