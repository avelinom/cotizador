/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if columns exist before adding
  const hasProposalId = await knex.schema.hasColumn('templates', 'proposal_id');
  const hasStaticFolderId = await knex.schema.hasColumn('templates', 'static_folder_id');
  const hasDynamicFolderId = await knex.schema.hasColumn('templates', 'dynamic_folder_id');

  if (!hasProposalId) {
    await knex.schema.table('templates', function(table) {
      table.string('proposal_id', 100).nullable().comment('ID de la propuesta asociada');
    });
  }

  if (!hasStaticFolderId) {
    await knex.schema.table('templates', function(table) {
      table.string('static_folder_id', 255).nullable().comment('ID de la carpeta de Google Drive para documentos estáticos');
    });
  }

  if (!hasDynamicFolderId) {
    await knex.schema.table('templates', function(table) {
      table.string('dynamic_folder_id', 255).nullable().comment('ID de la carpeta de Google Drive para documentos dinámicos');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasProposalId = await knex.schema.hasColumn('templates', 'proposal_id');
  const hasStaticFolderId = await knex.schema.hasColumn('templates', 'static_folder_id');
  const hasDynamicFolderId = await knex.schema.hasColumn('templates', 'dynamic_folder_id');

  return knex.schema.table('templates', function(table) {
    if (hasProposalId) {
      table.dropColumn('proposal_id');
    }
    if (hasStaticFolderId) {
      table.dropColumn('static_folder_id');
    }
    if (hasDynamicFolderId) {
      table.dropColumn('dynamic_folder_id');
    }
  });
};

