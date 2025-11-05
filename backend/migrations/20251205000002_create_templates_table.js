/**
 * Migration: Create templates table
 * 
 * Stores proposal templates with predefined formatting and structure
 */

exports.up = function(knex) {
  return knex.schema.createTable('templates', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable().comment('Template name');
    table.text('description').nullable().comment('Template description');
    table.jsonb('metadata').nullable().comment('Template metadata (margins, fonts, styles)');
    table.jsonb('sections').nullable().comment('Template sections structure');
    table.jsonb('default_styles').nullable().comment('Default styles for headings and paragraphs');
    table.boolean('is_default').defaultTo(false).comment('Is this the default template');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('is_default');
    table.index('created_at');
  }).then(() => {
    console.log('✅ Created templates table');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('templates').then(() => {
    console.log('⚠️ Dropped templates table');
  });
};

