/**
 * Seed: Create admin user
 */

const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Check if admin user already exists
  const existingAdmin = await knex('users').where('email', 'admin@cotizador.com').first();
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await knex('users').insert({
      name: 'Administrador',
      email: 'admin@cotizador.com',
      password: hashedPassword,
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date()
    });
    
    console.log('✅ Created admin user (admin@cotizador.com / admin123)');
  } else {
    // Update existing admin to ensure role is correct
    await knex('users')
      .where('email', 'admin@cotizador.com')
      .update({
        role: 'admin',
        updated_at: new Date()
      });
    console.log('✅ Updated admin user role');
  }
};

