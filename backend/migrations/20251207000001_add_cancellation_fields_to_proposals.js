/**
 * Migration: Add cancellation fields to proposals table
 * 
 * Adds fields to track proposal cancellations with reason
 */

exports.up = async function(knex) {
  // Check which columns already exist
  const hasCancelledAt = await knex.schema.hasColumn('proposals', 'cancelled_at');
  const hasCancellationReason = await knex.schema.hasColumn('proposals', 'cancellation_reason');
  
  return knex.schema.alterTable('proposals', (table) => {
    if (!hasCancelledAt) {
      table.timestamp('cancelled_at').nullable().comment('When the proposal was cancelled');
    }
    if (!hasCancellationReason) {
      table.text('cancellation_reason').nullable().comment('Reason for cancellation');
    }
  }).then(() => {
    console.log('✅ Added cancellation fields to proposals table');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('proposals', (table) => {
    table.dropColumn('cancelled_at');
    table.dropColumn('cancellation_reason');
  }).then(() => {
    console.log('⚠️ Removed cancellation fields from proposals table');
  });
};

