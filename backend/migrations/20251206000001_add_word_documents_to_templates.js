/**
 * Migration: Add Word document fields to templates table
 * 
 * Adds fields to store mapping document and format template document paths
 */

exports.up = function(knex) {
  return knex.schema.table('templates', (table) => {
    table.string('proposal_type').nullable().comment('Type of proposal this template is for');
    table.string('mapping_document_path').nullable().comment('Path to Word document with static/dynamic section markers');
    table.string('format_template_path').nullable().comment('Path to Word template for formatting final document');
  }).then(() => {
    console.log('✅ Added Word document fields to templates table');
  });
};

exports.down = function(knex) {
  return knex.schema.table('templates', (table) => {
    table.dropColumn('proposal_type');
    table.dropColumn('mapping_document_path');
    table.dropColumn('format_template_path');
  }).then(() => {
    console.log('⚠️ Removed Word document fields from templates table');
  });
};

