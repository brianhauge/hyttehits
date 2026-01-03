const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hyttehits:hyttehits123@localhost:5432/hyttehits',
});

async function populateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database population...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'songs-data.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    // Get counts
    const modernResult = await client.query('SELECT COUNT(*) FROM songs WHERE playlist = $1', ['modern']);
    const classicResult = await client.query('SELECT COUNT(*) FROM songs WHERE playlist = $1', ['classic']);
    const totalResult = await client.query('SELECT COUNT(*) FROM songs');
    
    console.log('Database populated successfully!');
    console.log(`Modern songs: ${modernResult.rows[0].count}`);
    console.log(`Classic songs: ${classicResult.rows[0].count}`);
    console.log(`Total songs: ${totalResult.rows[0].count}`);
    
  } catch (err) {
    console.error('Error populating database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

populateDatabase();
