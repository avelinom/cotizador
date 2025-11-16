/**
 * Migration: Add Google Docs fields to proposals table
 * Adds google_doc_id and google_doc_url columns to store Google Docs document references
 */

exports.up = function(knex) {
  return knex.schema.table('proposals', function(table) {
    // Check if columns exist before adding
    table.string('google_doc_id', 255).nullable().comment('Google Docs document ID');
    table.string('google_doc_url', 500).nullable().comment('Google Docs document URL');
  });
};

exports.down = function(knex) {
  return knex.schema.table('proposals', function(table) {
    table.dropColumn('google_doc_id');
    table.dropColumn('google_doc_url');
  });
};

