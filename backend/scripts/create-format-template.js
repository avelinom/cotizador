/**
 * Script para generar el template de formato (.dotx) de ejemplo
 * NOTA: Este script genera un .docx que debes guardar como .dotx en Word
 * Los placeholders de docxtemplater deben estar en el documento
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');

async function createFormatTemplate() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children: [
          // Header con placeholders
          new Paragraph({
            text: '{proposalType} - {clientName}',
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),

          // Título principal con placeholder
          new Paragraph({
            text: '{proposalTitle}',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Información del cliente y fecha
          new Paragraph({
            text: 'Propuesta para: {clientName}',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: 'Fecha: {date}',
            spacing: { after: 400 }
          }),

          // Instrucciones para el usuario sobre cómo usar los placeholders
          new Paragraph({
            text: 'INSTRUCCIONES PARA USAR ESTE TEMPLATE:',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun('1. Guarda este archivo como '),
              new TextRun('.dotx', { bold: true }),
              new TextRun(' (Word Template)')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('2. Reemplaza este texto de instrucciones con: '),
              new TextRun('{#sections}', { bold: true }),
              new TextRun(' para crear un loop de secciones')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('3. Dentro del loop, usa '),
              new TextRun('{title}', { bold: true }),
              new TextRun(' y '),
              new TextRun('{content}', { bold: true }),
              new TextRun(' para cada sección')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '4. Inserta una Tabla de Contenido de Word (Referencias → Tabla de contenido)',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '5. Configura el formato visual deseado (fuentes, estilos, header/footer)',
            spacing: { after: 400 }
          }),

          // Ejemplo de cómo debería verse el loop de secciones
          new Paragraph({
            text: 'EJEMPLO DE ESTRUCTURA CON PLACEHOLDERS:',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '[Aquí va la Tabla de Contenido de Word]',
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '{#sections}',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '{title}',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: '{content}',
            spacing: { after: 400 }
          }),
          new Paragraph({
            text: '{/sections}',
            spacing: { after: 400 }
          }),

          // Nota importante
          new Paragraph({
            text: 'NOTA IMPORTANTE:',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'Este es un documento de ejemplo. Debes:',
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Abrir este archivo en Word')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Eliminar estas instrucciones')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Insertar la Tabla de Contenido de Word (Referencias → Tabla de contenido)')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Configurar el formato visual (márgenes, fuentes, estilos, header/footer)')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Usar los placeholders: '),
              new TextRun('{proposalTitle}', { bold: true }),
              new TextRun(', '),
              new TextRun('{clientName}', { bold: true }),
              new TextRun(', '),
              new TextRun('{#sections}...{/sections}', { bold: true })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Guardar como '),
              new TextRun('.dotx', { bold: true }),
              new TextRun(' (Word Template)')
            ],
            spacing: { after: 200 }
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputDir = path.join(__dirname, '../uploads/templates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Guardar como .docx primero (el usuario lo convertirá a .dotx)
  const outputPath = path.join(outputDir, 'template-formato-ejemplo.docx');
  fs.writeFileSync(outputPath, buffer);

  console.log('✅ Template de formato creado exitosamente en:');
  console.log(`   ${outputPath}`);
  console.log('\n📝 Este documento contiene:');
  console.log('   - Placeholders de ejemplo: {proposalTitle}, {clientName}, {date}');
  console.log('   - Instrucciones para crear el loop de secciones: {#sections}...{/sections}');
  console.log('   - Instrucciones para insertar Tabla de Contenido de Word');
  console.log('\n⚠️  IMPORTANTE:');
  console.log('   1. Abre este archivo en Microsoft Word');
  console.log('   2. Elimina las instrucciones y configura el formato visual deseado');
  console.log('   3. Inserta la Tabla de Contenido de Word (Referencias → Tabla de contenido)');
  console.log('   4. Usa los placeholders: {proposalTitle}, {clientName}, {#sections}...{/sections}');
  console.log('   5. Guarda como .dotx (Word Template)');
  console.log('\n💡 El sistema usará este template para aplicar el formato visual al documento final.');
}

createFormatTemplate().catch(console.error);

