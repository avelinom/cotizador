/**
 * Script para analizar en detalle el template de formato y contar placeholders
 */

const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function analyzeFormatTemplate() {
  const templatePath = '/Users/amiguelez/Downloads/cotizador/doc-template-formato-propuesta-tecnica-economica.dotx';
  
  console.log('📄 ANALIZANDO TEMPLATE DE FORMATO');
  console.log('='.repeat(80));
  
  // Extract raw text
  const textResult = await mammoth.extractRawText({ path: templatePath });
  const text = textResult.value;
  
  // Extract HTML to see structure
  const htmlResult = await mammoth.convertToHtml({ path: templatePath });
  const html = htmlResult.value;
  
  console.log('\n📝 CONTENIDO COMPLETO DEL TEMPLATE:');
  console.log('-'.repeat(80));
  console.log(text);
  console.log('-'.repeat(80));
  
  // Count all placeholders
  const allPlaceholders = text.match(/\{[^}]+\}/g) || [];
  console.log(`\n🔍 TODOS LOS PLACEHOLDERS ENCONTRADOS (${allPlaceholders.length}):`);
  allPlaceholders.forEach((ph, index) => {
    console.log(`   ${index + 1}. ${ph}`);
  });
  
  // Count specific placeholders
  const sectionsStart = (text.match(/\{#sections\}/g) || []).length;
  const sectionsEnd = (text.match(/\{\/sections\}/g) || []).length;
  const proposalTitle = (text.match(/{proposalTitle}/g) || []).length;
  const clientName = (text.match(/{clientName}/g) || []).length;
  const date = (text.match(/{date}/g) || []).length;
  const title = (text.match(/{title}/g) || []).length;
  const content = (text.match(/{content}/g) || []).length;
  
  console.log(`\n📊 CONTEO DE PLACEHOLDERS ESPECÍFICOS:`);
  console.log(`   {#sections} (inicio de loop): ${sectionsStart}`);
  console.log(`   {/sections} (fin de loop): ${sectionsEnd}`);
  console.log(`   {proposalTitle}: ${proposalTitle}`);
  console.log(`   {clientName}: ${clientName}`);
  console.log(`   {date}: ${date}`);
  console.log(`   {title} (dentro del loop): ${title}`);
  console.log(`   {content} (dentro del loop): ${content}`);
  
  // Analyze structure
  console.log(`\n🏗️ ESTRUCTURA DEL TEMPLATE:`);
  console.log('-'.repeat(80));
  
  const lines = text.split('\n').filter(line => line.trim());
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.includes('{#sections}')) {
      console.log(`   Línea ${index + 1}: [INICIO DE LOOP] ${trimmed}`);
    } else if (trimmed.includes('{/sections}')) {
      console.log(`   Línea ${index + 1}: [FIN DE LOOP] ${trimmed}`);
    } else if (trimmed.match(/\{[^}]+\}/)) {
      console.log(`   Línea ${index + 1}: [PLACEHOLDER] ${trimmed}`);
    } else if (trimmed) {
      console.log(`   Línea ${index + 1}: ${trimmed.substring(0, 60)}`);
    }
  });
  
  // Recommendations
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('💡 RECOMENDACIONES');
  console.log('='.repeat(80));
  
  if (sectionsStart === 0 && sectionsEnd === 0) {
    console.log(`\n❌ PROBLEMA CRÍTICO: No se encontraron placeholders {#sections}...{/sections}`);
    console.log(`   El template necesita exactamente 1 par de estos placeholders para el loop de secciones.`);
    console.log(`\n   Estructura correcta:`);
    console.log(`   {proposalTitle}`);
    console.log(`   Propuesta para: {clientName}`);
    console.log(`   Fecha: {date}`);
    console.log(`   [Tabla de Contenido de Word]`);
    console.log(`   {#sections}`);
    console.log(`   {title}`);
    console.log(`   {content}`);
    console.log(`   {/sections}`);
  } else if (sectionsStart === 1 && sectionsEnd === 1) {
    console.log(`\n✅ CORRECTO: El template tiene exactamente 1 par de placeholders {#sections}...{/sections}`);
    console.log(`   Esto es lo correcto para un loop de secciones.`);
    
    if (title === 0 || content === 0) {
      console.log(`\n⚠️ ADVERTENCIA: Dentro del loop, faltan placeholders:`);
      if (title === 0) {
        console.log(`   - {title} (necesario para el título de cada sección)`);
      }
      if (content === 0) {
        console.log(`   - {content} (necesario para el contenido de cada sección)`);
      }
    } else {
      console.log(`\n✅ Los placeholders dentro del loop están correctos:`);
      console.log(`   - {title}: ${title} vez/veces`);
      console.log(`   - {content}: ${content} vez/veces`);
    }
  } else if (sectionsStart > 1 || sectionsEnd > 1) {
    console.log(`\n⚠️ ADVERTENCIA: Se encontraron múltiples placeholders {#sections} o {/sections}`);
    console.log(`   {#sections}: ${sectionsStart}`);
    console.log(`   {/sections}: ${sectionsEnd}`);
    console.log(`\n   El template debe tener exactamente 1 par de estos placeholders.`);
    console.log(`   Si hay múltiples loops, cada uno debe tener su propio par.`);
  } else if (sectionsStart !== sectionsEnd) {
    console.log(`\n❌ ERROR: Los placeholders {#sections} y {/sections} no están balanceados`);
    console.log(`   {#sections}: ${sectionsStart}`);
    console.log(`   {/sections}: ${sectionsEnd}`);
    console.log(`   Deben ser iguales (1 par).`);
  }
  
  // Check if placeholders are in correct order
  const sectionsStartIndex = text.indexOf('{#sections}');
  const sectionsEndIndex = text.indexOf('{/sections}');
  const titleIndex = text.indexOf('{title}');
  const contentIndex = text.indexOf('{content}');
  
  if (sectionsStartIndex !== -1 && sectionsEndIndex !== -1) {
    console.log(`\n🔍 ORDEN DE LOS PLACEHOLDERS:`);
    console.log(`   {#sections} está en posición: ${sectionsStartIndex}`);
    console.log(`   {title} está en posición: ${titleIndex}`);
    console.log(`   {content} está en posición: ${contentIndex}`);
    console.log(`   {/sections} está en posición: ${sectionsEndIndex}`);
    
    if (sectionsStartIndex < titleIndex && titleIndex < contentIndex && contentIndex < sectionsEndIndex) {
      console.log(`\n✅ El orden es correcto: {#sections} → {title} → {content} → {/sections}`);
    } else {
      console.log(`\n⚠️ El orden podría no ser óptimo. El orden recomendado es:`);
      console.log(`   {#sections}`);
      console.log(`   {title}`);
      console.log(`   {content}`);
      console.log(`   {/sections}`);
    }
  }
  
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📋 RESUMEN FINAL');
  console.log('='.repeat(80));
  console.log(`\nEl template debe tener EXACTAMENTE:`);
  console.log(`   ✅ 1 placeholder {#sections} (inicio del loop)`);
  console.log(`   ✅ 1 placeholder {/sections} (fin del loop)`);
  console.log(`   ✅ 1 o más {title} dentro del loop (para cada sección)`);
  console.log(`   ✅ 1 o más {content} dentro del loop (para cada sección)`);
  console.log(`   ✅ Placeholders fuera del loop: {proposalTitle}, {clientName}, {date}`);
}

analyzeFormatTemplate().catch(console.error);

