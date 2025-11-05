/**
 * Seed: Create default templates
 */

exports.seed = async function(knex) {
  // Delete all existing templates
  await knex('templates').del();

  // Insert default templates
  await knex('templates').insert([
    {
      name: 'Template Comercial',
      description: 'Template estándar para propuestas comerciales con estructura profesional',
      metadata: JSON.stringify({
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        },
        fontSize: 12,
        fontFamily: 'Arial',
        lineSpacing: 1.5,
        header: {
          enabled: true,
          text: 'Propuesta Comercial',
          alignment: 'center'
        },
        footer: {
          enabled: true,
          text: 'Página {page}',
          alignment: 'center'
        }
      }),
      sections: JSON.stringify([
        {
          title: 'Introducción',
          order: 1,
          required: true,
          baseContent: 'En el presente documento se detalla la propuesta comercial para el proyecto solicitado.',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        },
        {
          title: 'Alcance del Proyecto',
          order: 2,
          required: false,
          baseContent: 'El alcance del proyecto incluye los siguientes aspectos principales:',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        },
        {
          title: 'Metodología',
          order: 3,
          required: false,
          baseContent: 'La metodología propuesta se basa en las mejores prácticas del sector.',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        },
        {
          title: 'Precios y Condiciones',
          order: 4,
          required: true,
          baseContent: 'A continuación se detallan los precios y condiciones comerciales:',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        },
        {
          title: 'Términos y Condiciones',
          order: 5,
          required: false,
          baseContent: 'Los términos y condiciones se aplican según lo establecido en el contrato.',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        }
      ]),
      default_styles: JSON.stringify({
        heading1: {
          fontSize: 16,
          bold: true,
          marginTop: 30,
          marginBottom: 15
        },
        heading2: {
          fontSize: 14,
          bold: true,
          marginTop: 20,
          marginBottom: 10
        },
        paragraph: {
          fontSize: 12,
          marginTop: 0,
          marginBottom: 10
        }
      }),
      is_default: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Template Técnico',
      description: 'Template para propuestas técnicas con enfoque en detalles y especificaciones',
      metadata: JSON.stringify({
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        },
        fontSize: 11,
        fontFamily: 'Arial',
        lineSpacing: 1.4,
        header: {
          enabled: true,
          text: 'Propuesta Técnica',
          alignment: 'left'
        },
        footer: {
          enabled: true,
          text: 'Confidencial - {date}',
          alignment: 'right'
        }
      }),
      sections: JSON.stringify([
        {
          title: 'Resumen Ejecutivo',
          order: 1,
          required: true,
          baseContent: 'Este documento presenta la propuesta técnica para el proyecto.',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        },
        {
          title: 'Especificaciones Técnicas',
          order: 2,
          required: true,
          baseContent: 'Las especificaciones técnicas del proyecto son las siguientes:',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        },
        {
          title: 'Arquitectura y Diseño',
          order: 3,
          required: false,
          baseContent: 'La arquitectura propuesta se basa en los siguientes principios:',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        },
        {
          title: 'Cronograma',
          order: 4,
          required: true,
          baseContent: 'El cronograma de implementación se detalla a continuación:',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        },
        {
          title: 'Presupuesto',
          order: 5,
          required: true,
          baseContent: 'El presupuesto detallado se presenta en la siguiente sección:',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        }
      ]),
      default_styles: JSON.stringify({
        heading1: {
          fontSize: 15,
          bold: true,
          marginTop: 25,
          marginBottom: 12
        },
        heading2: {
          fontSize: 13,
          bold: true,
          marginTop: 18,
          marginBottom: 8
        },
        paragraph: {
          fontSize: 11,
          marginTop: 0,
          marginBottom: 8
        }
      }),
      is_default: false,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Template Simple',
      description: 'Template minimalista para propuestas simples y directas',
      metadata: JSON.stringify({
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        },
        fontSize: 12,
        fontFamily: 'Arial',
        lineSpacing: 1.5,
        header: {
          enabled: false
        },
        footer: {
          enabled: false
        }
      }),
      sections: JSON.stringify([
        {
          title: 'Propuesta',
          order: 1,
          required: true,
          baseContent: '',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        },
        {
          title: 'Precios',
          order: 2,
          required: true,
          baseContent: '',
          marginTop: 20,
          marginBottom: 20,
          marginLeft: 0,
          marginRight: 0
        }
      ]),
      default_styles: JSON.stringify({
        heading1: {
          fontSize: 14,
          bold: true,
          marginTop: 20,
          marginBottom: 10
        },
        heading2: {
          fontSize: 12,
          bold: true,
          marginTop: 15,
          marginBottom: 8
        },
        paragraph: {
          fontSize: 12,
          marginTop: 0,
          marginBottom: 10
        }
      }),
      is_default: false,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('✅ Created default templates');
};

