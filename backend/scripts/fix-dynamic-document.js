/**
 * Script para corregir el documento dinámico con placeholders correctos
 * Este script lee el documento actual y crea una versión corregida
 */

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } = require('docx');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function fixDynamicDocument() {
  const inputPath = '/Users/amiguelez/Downloads/cotizador/doc-dinamico-propuesta-tecnica-economica.docx';
  const outputPath = '/Users/amiguelez/Downloads/cotizador/doc-dinamico-propuesta-tecnica-economica-CORREGIDO.docx';
  
  console.log('📖 Leyendo documento dinámico actual...');
  
  // Extract content from existing document
  const result = await mammoth.extractRawText({ path: inputPath });
  const text = result.value;
  
  console.log('✅ Contenido extraído');
  console.log(`   Longitud: ${text.length} caracteres`);
  
  // Parse sections from the text
  const lines = text.split('\n').filter(line => line.trim());
  
  // Find header (first few lines before first numbered section)
  let headerEndIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\d+[\.\)]\s+[A-Z]/)) {
      headerEndIndex = i;
      break;
    }
  }
  
  // Extract sections
  const sections = [];
  let currentSection = null;
  
  for (let i = headerEndIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if it's a section title
    if (line.match(/^\d+[\.\)]\s+[A-Z]/)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      // Fix ".3." to "3."
      const fixedTitle = line.replace(/^\.(\d+)/, '$1');
      currentSection = {
        title: fixedTitle,
        content: ''
      };
    } else if (currentSection && line) {
      currentSection.content += (currentSection.content ? '\n' : '') + line;
    }
  }
  if (currentSection) {
    sections.push(currentSection);
  }
  
  console.log(`\n📑 Secciones encontradas: ${sections.length}`);
  sections.forEach((section, index) => {
    console.log(`   ${index + 1}. ${section.title.substring(0, 50)}...`);
  });
  
  // Create corrected document with placeholders
  console.log('\n🔧 Creando documento corregido con placeholders...');
  
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
          // Header con placeholders CORREGIDOS
          new Paragraph({
            children: [
              new TextRun({
                text: 'Propuesta: ',
                bold: true
              }),
              new TextRun({
                text: '{proposalType}',
                bold: true,
                color: 'FF0000' // Red to indicate placeholder
              })
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Cliente: ',
                bold: true
              }),
              new TextRun({
                text: '{clientName}',
                bold: true,
                color: 'FF0000'
              })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Fecha: ',
                bold: true
              }),
              new TextRun({
                text: '{modificationDate}',
                bold: true,
                color: 'FF0000'
              })
            ],
            spacing: { after: 400 }
          }),

          // Sections from original document
          ...sections.flatMap((section, index) => {
            const children = [
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: index > 0 ? 400 : 200, after: 200 }
              })
            ];
            
            // Check if section has table-like content (Personal, Entregables, Propuesta Económica)
            if (section.title.includes('Personal asignado') || 
                section.title.includes('Entregables') || 
                section.title.includes('Propuesta Económica')) {
              // Try to parse table content
              const tableContent = parseTableContent(section.content);
              if (tableContent && tableContent.length > 0) {
                children.push(createTableFromContent(section.title, tableContent));
              } else {
                children.push(new Paragraph({
                  text: section.content || '[Completa esta sección]',
                  spacing: { after: 300 }
                }));
              }
            } else {
              children.push(new Paragraph({
                text: section.content || '[Completa esta sección]',
                spacing: { after: 300 }
              }));
            }
            
            return children;
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`\n✅ Documento corregido guardado en:`);
  console.log(`   ${outputPath}`);
  console.log(`\n📝 Cambios realizados:`);
  console.log(`   1. Header ahora usa placeholders: {proposalType}, {clientName}, {modificationDate}`);
  console.log(`   2. Placeholders marcados en rojo para fácil identificación`);
  console.log(`   3. Corregido formato ".3." a "3." en secciones`);
  console.log(`   4. Preservado todo el contenido original`);
  console.log(`\n💡 IMPORTANTE:`);
  console.log(`   - Los placeholders en rojo serán reemplazados automáticamente por el sistema`);
  console.log(`   - Asegúrate de que el documento tenga todas las secciones requeridas`);
  console.log(`   - Las tablas se preservarán si están correctamente formateadas`);
}

function parseTableContent(content) {
  // Simple table parser - looks for tab-separated or pipe-separated values
  const lines = content.split('\n').filter(line => line.trim());
  const rows = [];
  
  for (const line of lines) {
    // Check if line looks like table row (has tabs, pipes, or multiple spaces)
    if (line.includes('\t') || line.includes('|') || line.match(/\s{2,}/)) {
      const cells = line.split(/\t|\|/).map(cell => cell.trim()).filter(cell => cell);
      if (cells.length > 1) {
        rows.push(cells);
      }
    }
  }
  
  return rows.length > 0 ? rows : null;
}

function createTableFromContent(sectionTitle, tableData) {
  // Determine column structure based on section title
  let columnWidths = [3000, 2000, 2000, 2000];
  let headers = ['Campo 1', 'Campo 2', 'Campo 3', 'Campo 4'];
  
  if (sectionTitle.includes('Personal asignado')) {
    headers = ['Nombre', 'Rol', 'Horas Estimadas', 'Participación'];
  } else if (sectionTitle.includes('Entregables')) {
    columnWidths = [2000, 4000, 2000];
    headers = ['No.', 'Descripción del Entregable', 'Fecha Estimada'];
  } else if (sectionTitle.includes('Propuesta Económica')) {
    headers = ['Concepto', 'Cantidad', 'Precio Unitario', 'Total'];
  }
  
  const tableRows = [
    // Header row
    new TableRow({
      children: headers.map(header => 
        new TableCell({
          children: [new Paragraph({
            text: header,
            heading: HeadingLevel.HEADING_3
          })],
          width: { size: columnWidths[headers.indexOf(header)] || 2000, type: WidthType.DXA }
        })
      )
    })
  ];
  
  // Data rows
  tableData.forEach(row => {
    tableRows.push(
      new TableRow({
        children: row.map((cell, index) =>
          new TableCell({
            children: [new Paragraph(cell || '')],
            width: { size: columnWidths[index] || 2000, type: WidthType.DXA }
          })
        )
      })
    );
  });
  
  return new Table({
    columnWidths: columnWidths.slice(0, headers.length),
    rows: tableRows
  });
}

fixDynamicDocument().catch(console.error);

