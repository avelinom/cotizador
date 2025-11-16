/**
 * Migration: Add final_document_path to proposals table
 * This field stores the path to the final formatted document (static + dynamic + format template)
 */

exports.up = function(knex) {
  return knex.schema.table('proposals', function(table) {
    table.string('final_document_path').nullable().comment('Path to final formatted Word document combining static sections, dynamic content, and format template');
  }).then(() => {
    console.log('✅ Added final_document_path field to proposals table');
  });
};

exports.down = function(knex) {
  return knex.schema.table('proposals', function(table) {
    table.dropColumn('final_document_path');
  }).then(() => {
    console.log('⚠️ Removed final_document_path field from proposals table');
  });
};

