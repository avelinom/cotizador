/**
 * Script para generar el documento dinámico de ejemplo
 * Este es el template que el usuario descarga, completa y vuelve a subir
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } = require('docx');
const fs = require('fs');
const path = require('path');

async function createDynamicTemplate() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children: [
          // Header con placeholders
          new Paragraph({
            text: 'Propuesta: {proposalType}',
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: 'Cliente: {clientName}',
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: 'Fecha: {modificationDate}',
            spacing: { after: 400 }
          }),

          // Sección 1: Objeto y Alcance (DINÁMICO)
          new Paragraph({
            text: '1. Objeto y Alcance de la Propuesta',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '[Completa esta sección describiendo el objeto y alcance específico del proyecto para este cliente]',
            spacing: { after: 400 }
          }),

          // Sección 3: Arquitectura (DINÁMICO)
          new Paragraph({
            text: '3. Arquitectura',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: '[Completa esta sección describiendo la arquitectura propuesta. Puedes incluir diagramas o imágenes si es necesario]',
            spacing: { after: 400 }
          }),

          // Sección 5: Personal asignado (DINÁMICO) - CON TABLA
          new Paragraph({
            text: '5. Personal asignado al proyecto',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'CEFIRO asignará al siguiente personal que estará participando parcial o durante todo el proyecto:',
            spacing: { after: 200 }
          }),
          
          // Tabla para Personal
          new Table({
            columnWidths: [3000, 2000, 2000, 2000],
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Nombre',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 3000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Rol',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Horas Estimadas',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Participación',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              // Example rows (usuario puede agregar más)
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph('Nombre del recurso 1')],
                    width: { size: 3000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('Rol del recurso')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('40')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('Parcial')],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph('Nombre del recurso 2')],
                    width: { size: 3000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('Rol del recurso')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('80')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('Completo')],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              // Empty row for user to add more
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 3000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              })
            ]
          }),

          new Paragraph({
            text: '',
            spacing: { after: 400 }
          }),

          // Sección 6: Entregables (DINÁMICO) - CON TABLA
          new Paragraph({
            text: '6. Entregables',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'Los siguientes entregables serán proporcionados durante el proyecto:',
            spacing: { after: 200 }
          }),

          // Tabla para Entregables
          new Table({
            columnWidths: [2000, 4000, 2000],
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      text: 'No.',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Descripción del Entregable',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 4000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Fecha Estimada',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              // Example rows
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph('1')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('Descripción del entregable 1')],
                    width: { size: 4000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('DD/MM/YYYY')],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph('2')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('Descripción del entregable 2')],
                    width: { size: 4000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('DD/MM/YYYY')],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              // Empty row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 4000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              })
            ]
          }),

          new Paragraph({
            text: '',
            spacing: { after: 400 }
          }),

          // Sección 7: Propuesta Económica (DINÁMICO) - CON TABLA
          new Paragraph({
            text: '7. Propuesta Económica',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: 'Desglose económico del proyecto:',
            spacing: { after: 200 }
          }),

          // Tabla para Propuesta Económica
          new Table({
            columnWidths: [3000, 2000, 2000, 2000],
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Concepto',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 3000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Cantidad',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Precio Unitario',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      text: 'Total',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              // Example rows
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph('Concepto 1')],
                    width: { size: 3000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('1')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('$0.00')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('$0.00')],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph('Concepto 2')],
                    width: { size: 3000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('1')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('$0.00')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('$0.00')],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              // Total row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      text: 'TOTAL',
                      heading: HeadingLevel.HEADING_3
                    })],
                    width: { size: 3000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('')],
                    width: { size: 2000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph('$0.00')],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              })
            ]
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

  const outputPath = path.join(outputDir, 'documento-dinamico-ejemplo.docx');
  fs.writeFileSync(outputPath, buffer);

  console.log('✅ Documento dinámico creado exitosamente en:');
  console.log(`   ${outputPath}`);
  console.log('\n📝 Este documento contiene:');
  console.log('   - Placeholders en el header: {proposalType}, {clientName}, {modificationDate}');
  console.log('   - Solo las secciones DINÁMICAS del mapeo');
  console.log('   - Tablas pre-formateadas para:');
  console.log('     • Personal asignado al proyecto');
  console.log('     • Entregables');
  console.log('     • Propuesta Económica');
  console.log('\n💡 El usuario descarga este documento, completa las secciones y tablas, y lo vuelve a subir.');
}

createDynamicTemplate().catch(console.error);

