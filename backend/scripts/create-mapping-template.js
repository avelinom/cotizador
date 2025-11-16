/**
 * Script para generar un documento de mapeo de ejemplo
 * Ejecutar con: node scripts/create-mapping-template.js
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');

async function createMappingTemplate() {
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
          // Título principal (ESTÁTICO)
          new Paragraph({
            text: 'PROPUESTA TÉCNICA Y ECONÓMICA [ESTÁTICO]',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Línea en blanco
          new Paragraph({
            text: '',
            spacing: { after: 200 }
          }),

          // Índice (ESTÁTICO)
          new Paragraph({
            text: 'Índice [ESTÁTICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            text: '1. Objeto y Alcance de la Propuesta',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '2. Metodología',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '3. Arquitectura',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '4. Flujo de Trabajo',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '5. Personal asignado al proyecto',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '6. Entregables',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '7. Propuesta Económica',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: '8. Condiciones Comerciales',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: 'Anexo A - Control de Cambios',
            spacing: { after: 400 }
          }),

          // Sección 1: Objeto y Alcance (DINÁMICO)
          new Paragraph({
            text: '1. Objeto y Alcance de la Propuesta [DINÁMICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '[Esta sección será completada por el usuario en el documento dinámico]',
            spacing: { after: 400 }
          }),

          // Sección 2: Metodología (ESTÁTICO)
          new Paragraph({
            text: '2. Metodología [ESTÁTICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'Céfiro manejará este proyecto usando la metodología "STAR Methodology". Esta metodología abarca desde la planeación hasta la operación, definiendo el sistema de trabajo, recopilando necesidades y estableciendo objetivos.',
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Céfiro agendará una cita de planeación con el cliente, durante la cual, las partes abordarán los siguientes puntos:',
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Revisarán los alcances del proyecto, incluyendo los entregables deseados')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Se analizará la metodología STAR')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Planearán y agendarán el arranque del proyecto')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Establecerán la cadencia del proyecto (frecuencia de las reuniones y participantes)')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Determinarán el plan de comunicación más apropiado para los directivos')
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Responsabilidades de Céfiro:',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Planear y gestionar la reunión inicial')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Identificar recursos de Céfiro asignados al proyecto y sus responsabilidades')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Identificar al equipo asignado por el cliente y familiarizarlos con la metodología STAR')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Proveer acceso al equipo asignado por el cliente al ambiente de trabajo de Céfiro')
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Responsabilidad del cliente:',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Confirmar los alcances del proyecto')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Designar al equipo de personas que colaborará con Céfiro durante el proyecto')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun('• '),
              new TextRun('Revisar y aprobar el programa de trabajo')
            ],
            spacing: { after: 400 }
          }),

          // Sección 3: Arquitectura (DINÁMICO)
          new Paragraph({
            text: '3. Arquitectura [DINÁMICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '[Esta sección será completada por el usuario en el documento dinámico]',
            spacing: { after: 400 }
          }),

          // Sección 4: Flujo de Trabajo (ESTÁTICO)
          new Paragraph({
            text: '4. Flujo de Trabajo [ESTÁTICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'El siguiente flujo de trabajo es representativo y no necesariamente asume las actividades finales. El flujo puede ajustarse durante las reuniones iniciales.',
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: 'Tome este flujo de trabajo como un ejemplo de cómo visualizamos las actividades en general.',
            spacing: { after: 400 }
          }),

          // Sección 5: Personal asignado (DINÁMICO)
          new Paragraph({
            text: '5. Personal asignado al proyecto [DINÁMICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'CEFIRO asignará al siguiente personal que estará participando parcial o durante todo el proyecto. [Esta sección será completada por el usuario en el documento dinámico]',
            spacing: { after: 400 }
          }),

          // Sección 6: Entregables (DINÁMICO)
          new Paragraph({
            text: '6. Entregables [DINÁMICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '[Esta sección será completada por el usuario en el documento dinámico]',
            spacing: { after: 400 }
          }),

          // Sección 7: Propuesta Económica (DINÁMICO)
          new Paragraph({
            text: '7. Propuesta Económica [DINÁMICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '[Esta sección será completada por el usuario en el documento dinámico]',
            spacing: { after: 400 }
          }),

          // Sección 8: Condiciones Comerciales (ESTÁTICO)
          new Paragraph({
            text: '8. Condiciones Comerciales [ESTÁTICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '[Contenido estático de condiciones comerciales que no cambia entre propuestas]',
            spacing: { after: 400 }
          }),

          // Anexo A (ESTÁTICO)
          new Paragraph({
            text: 'Anexo A - Control de Cambios [ESTÁTICO]',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '[Contenido estático del anexo de control de cambios]',
            spacing: { after: 200 }
          })
        ]
      }
    ]
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);

  // Ensure output directory exists
  const outputDir = path.join(__dirname, '../uploads/templates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save file
  const outputPath = path.join(outputDir, 'documento-mapeo-ejemplo.docx');
  fs.writeFileSync(outputPath, buffer);

  console.log('✅ Documento de mapeo creado exitosamente en:');
  console.log(`   ${outputPath}`);
  console.log('\n📝 Este documento contiene:');
  console.log('   - Secciones marcadas con [ESTÁTICO] (contenido que no cambia)');
  console.log('   - Secciones marcadas con [DINÁMICO] (contenido que el usuario completa)');
  console.log('\n💡 Puedes usar este archivo como base y modificarlo según tus necesidades.');
}

createMappingTemplate().catch(console.error);

