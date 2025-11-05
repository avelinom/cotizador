/**
 * Migration: Create users table
 * 
 * Basic user authentication table
 */

exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('name').notNullable();
    table.string('role').defaultTo('user').comment('user, admin');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('email');
    table.index('role');
  }).then(() => {
    console.log('✅ Created users table');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users').then(() => {
    console.log('⚠️ Dropped users table');
  });
};

