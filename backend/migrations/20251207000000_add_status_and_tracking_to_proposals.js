/**
 * Migration: Add status and tracking fields to proposals table
 * 
 * Adds fields to track proposal status, client, and time tracking
 */

exports.up = async function(knex) {
  // Check which columns already exist
  const hasStatus = await knex.schema.hasColumn('proposals', 'status');
  const hasClientId = await knex.schema.hasColumn('proposals', 'client_id');
  const hasClientName = await knex.schema.hasColumn('proposals', 'client_name');
  const hasProposalType = await knex.schema.hasColumn('proposals', 'proposal_type');
  const hasStartedAt = await knex.schema.hasColumn('proposals', 'started_at');
  const hasCompletedAt = await knex.schema.hasColumn('proposals', 'completed_at');
  
  return knex.schema.alterTable('proposals', (table) => {
    if (!hasStatus) {
      table.string('status').defaultTo('draft').comment('Status: draft, in_progress, completed, cancelled');
    }
    if (!hasClientId) {
      table.integer('client_id').unsigned().nullable().comment('Client ID from Cefiro portal');
    }
    if (!hasClientName) {
      table.string('client_name').nullable().comment('Client name');
    }
    if (!hasProposalType) {
      table.string('proposal_type').nullable().comment('Type of proposal');
    }
    if (!hasStartedAt) {
      table.timestamp('started_at').nullable().comment('When the proposal work started');
    }
    if (!hasCompletedAt) {
      table.timestamp('completed_at').nullable().comment('When the proposal was completed');
    }
  }).then(async () => {
    // Add indexes if columns were added
    if (!hasStatus) {
      await knex.schema.alterTable('proposals', (table) => {
        table.index('status');
      });
    }
    if (!hasClientId) {
      await knex.schema.alterTable('proposals', (table) => {
        table.index('client_id');
      });
    }
    console.log('✅ Added status and tracking fields to proposals table');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('proposals', (table) => {
    table.dropColumn('status');
    table.dropColumn('client_id');
    table.dropColumn('client_name');
    table.dropColumn('proposal_type');
    table.dropColumn('started_at');
    table.dropColumn('completed_at');
    table.dropColumn('template_id');
  }).then(() => {
    console.log('⚠️ Removed status and tracking fields from proposals table');
  });
};

