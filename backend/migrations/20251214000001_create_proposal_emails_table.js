/**
 * Migration: Create proposal_emails table
 * Stores records of proposal emails sent to clients
 */

exports.up = function(knex) {
  return knex.schema.createTable('proposal_emails', function(table) {
    table.increments('id').primary();
    table.integer('proposal_id').notNullable();
    table.string('client_email', 255).notNullable();
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    table.string('document_type', 10).notNullable(); // 'doc' or 'pdf'
    table.string('document_id', 255).notNullable(); // Google Doc/Drive ID
    table.string('document_url', 500); // Shareable URL
    table.string('subject', 500);
    table.text('message'); // Optional custom message
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Foreign key
    table.foreign('proposal_id').references('id').inTable('proposals').onDelete('CASCADE');
    
    // Indexes
    table.index('proposal_id');
    table.index('client_email');
    table.index('sent_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('proposal_emails');
};

