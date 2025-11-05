/**
 * Migration: Add template_id to proposals table
 * 
 * Links proposals to templates that were applied
 */

exports.up = function(knex) {
  return knex.schema.alterTable('proposals', (table) => {
    table.integer('template_id').unsigned().nullable().references('id').inTable('templates').onDelete('SET NULL');
    table.index('template_id');
  }).then(() => {
    console.log('✅ Added template_id to proposals table');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('proposals', (table) => {
    table.dropColumn('template_id');
  }).then(() => {
    console.log('⚠️ Removed template_id from proposals table');
  });
};

