const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: node create-admin.js <username> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters long');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://hyttehits:hyttehits123@localhost:5432/hyttehits',
  });

  const client = await pool.connect();

  try {
    console.log('Connected to database');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      console.error(`User "${username}" already exists`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    await client.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
      [username, passwordHash, 'admin']
    );

    console.log(`Admin user "${username}" created successfully!`);
    console.log('You can now login at /admin');
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin();
