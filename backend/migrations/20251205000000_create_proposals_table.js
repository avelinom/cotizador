/**
 * Migration: Create proposals table
 * 
 * Stores proposals/quotations generated from Word documents
 * Each proposal has sections that can be edited individually
 */

exports.up = function(knex) {
  return knex.schema.createTable('proposals', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable().comment('Proposal title');
    table.text('description').nullable().comment('Proposal description');
    table.string('original_filename').notNullable().comment('Original Word file name');
    table.string('file_path').nullable().comment('Path to uploaded Word file');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('sections').nullable().comment('Array of sections with content and formatting');
    table.jsonb('metadata').nullable().comment('Document metadata (margins, styles, etc.)');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('user_id');
    table.index('created_at');
  }).then(() => {
    console.log('✅ Created proposals table');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('proposals').then(() => {
    console.log('⚠️ Dropped proposals table');
  });
};

