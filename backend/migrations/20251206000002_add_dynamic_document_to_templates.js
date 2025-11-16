/**
 * Migration: Add dynamic document field to templates table
 * 
 * Adds field to store dynamic document Word file path
 */

exports.up = function(knex) {
  return knex.schema.table('templates', (table) => {
    table.string('dynamic_document_path').nullable().comment('Path to Word document template for dynamic sections');
  }).then(() => {
    console.log('✅ Added dynamic_document_path field to templates table');
  });
};

exports.down = function(knex) {
  return knex.schema.table('templates', (table) => {
    table.dropColumn('dynamic_document_path');
  }).then(() => {
    console.log('⚠️ Removed dynamic_document_path field from templates table');
  });
};

