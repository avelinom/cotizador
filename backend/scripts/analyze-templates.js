/**
 * Script para analizar los 3 archivos del template y verificar su estructura
 */

const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function analyzeFile(filePath, fileName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📄 ANALIZANDO: ${fileName}`);
  console.log('='.repeat(80));
  
  try {
    // Extract text
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    console.log(`\n✅ Archivo leído exitosamente`);
    console.log(`   Tamaño del archivo: ${fs.statSync(filePath).size} bytes`);
    console.log(`   Longitud del texto extraído: ${text.length} caracteres`);
    
    // Extract HTML to see formatting
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    const html = htmlResult.value;
    
    console.log(`\n📝 CONTENIDO DEL DOCUMENTO:`);
    console.log('-'.repeat(80));
    console.log(text.substring(0, 2000)); // First 2000 chars
    if (text.length > 2000) {
      console.log(`\n... (${text.length - 2000} caracteres más)`);
    }
    
    // Check for placeholders
    const placeholderPatterns = [
      /\{[\w#\/]+\}/g,  // {variableName}, {#sections}, {/sections}
      /\[ESTÁTICO\]/gi,
      /\[ESTATICO\]/gi,
      /\[DINÁMICO\]/gi,
      /\[DINAMICO\]/gi,
      /Insertar.*?/gi
    ];
    
    console.log(`\n🔍 ANÁLISIS DE PLACEHOLDERS:`);
    placeholderPatterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`   Patrón ${index + 1}: Encontrados ${matches.length} placeholders`);
        console.log(`   Ejemplos: ${matches.slice(0, 5).join(', ')}`);
      }
    });
    
    // Check for sections
    const sectionPatterns = [
      /^\d+[\.\)]\s+[A-Z]/gm,  // Numbered sections like "1. TITLE"
      /^[A-Z][A-Z\s]+$/gm,     // All caps titles
    ];
    
    console.log(`\n📑 ANÁLISIS DE SECCIONES:`);
    sectionPatterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`   Patrón ${index + 1}: Encontradas ${matches.length} secciones`);
        console.log(`   Ejemplos: ${matches.slice(0, 5).map(m => m.trim()).join(', ')}`);
      }
    });
    
    // Check HTML structure
    console.log(`\n🏗️ ESTRUCTURA HTML (primeros 1000 caracteres):`);
    console.log('-'.repeat(80));
    console.log(html.substring(0, 1000));
    
    return {
      text,
      html,
      size: fs.statSync(filePath).size,
      textLength: text.length
    };
  } catch (error) {
    console.error(`❌ Error analizando ${fileName}:`, error.message);
    return null;
  }
}

async function main() {
  const downloadsDir = '/Users/amiguelez/Downloads/cotizador';
  
  const files = [
    {
      path: path.join(downloadsDir, 'doc-mapeo-propuesta-tecnica-economica.docx'),
      name: 'DOCUMENTO DE MAPEO'
    },
    {
      path: path.join(downloadsDir, 'doc-dinamico-propuesta-tecnica-economica.docx'),
      name: 'DOCUMENTO DINÁMICO'
    },
    {
      path: path.join(downloadsDir, 'doc-template-formato-propuesta-tecnica-economica.dotx'),
      name: 'TEMPLATE DE FORMATO (.dotx)'
    }
  ];
  
  const results = {};
  
  for (const file of files) {
    if (fs.existsSync(file.path)) {
      results[file.name] = await analyzeFile(file.path, file.name);
    } else {
      console.log(`\n❌ Archivo no encontrado: ${file.path}`);
    }
  }
  
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 RESUMEN DEL ANÁLISIS');
  console.log('='.repeat(80));
  
  Object.keys(results).forEach(key => {
    if (results[key]) {
      console.log(`\n${key}:`);
      console.log(`   - Tamaño: ${results[key].size} bytes`);
      console.log(`   - Texto: ${results[key].textLength} caracteres`);
    }
  });
  
  // Recommendations
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('💡 RECOMENDACIONES');
  console.log('='.repeat(80));
  
  if (results['DOCUMENTO DE MAPEO']) {
    const mapeoText = results['DOCUMENTO DE MAPEO'].text;
    const hasStaticMarkers = /\[ESTÁTICO\]|\[ESTATICO\]/gi.test(mapeoText);
    const hasDynamicMarkers = /\[DINÁMICO\]|\[DINAMICO\]/gi.test(mapeoText);
    
    console.log(`\n📋 DOCUMENTO DE MAPEO:`);
    if (!hasStaticMarkers && !hasDynamicMarkers) {
      console.log(`   ⚠️ No se encontraron marcadores [ESTÁTICO] o [DINÁMICO]`);
      console.log(`   💡 Agrega marcadores después de cada título de sección`);
    } else {
      console.log(`   ✅ Marcadores encontrados`);
    }
  }
  
  if (results['DOCUMENTO DINÁMICO']) {
    const dinamicoText = results['DOCUMENTO DINÁMICO'].text;
    const hasPlaceholders = /\{[a-zA-Z]+\}/g.test(dinamicoText);
    
    console.log(`\n📝 DOCUMENTO DINÁMICO:`);
    if (!hasPlaceholders) {
      console.log(`   ⚠️ No se encontraron placeholders {variableName}`);
      console.log(`   💡 Agrega placeholders como {proposalType}, {clientName}, {modificationDate}`);
    } else {
      console.log(`   ✅ Placeholders encontrados`);
    }
  }
  
  if (results['TEMPLATE DE FORMATO (.dotx)']) {
    const templateText = results['TEMPLATE DE FORMATO (.dotx)'].text;
    const hasDocxtemplaterPlaceholders = /\{[\w#\/]+\}/g.test(templateText);
    
    console.log(`\n🎨 TEMPLATE DE FORMATO:`);
    if (!hasDocxtemplaterPlaceholders) {
      console.log(`   ⚠️ No se encontraron placeholders de docxtemplater`);
      console.log(`   💡 Agrega placeholders como {proposalTitle}, {clientName}, {#sections}...{/sections}`);
    } else {
      console.log(`   ✅ Placeholders de docxtemplater encontrados`);
    }
  }
}

main().catch(console.error);

