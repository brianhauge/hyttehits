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
    
    // Get counts by category
    const modernResult = await client.query(`
      SELECT COUNT(DISTINCT s.id) 
      FROM songs s 
      JOIN song_categories sc ON s.id = sc.song_id 
      JOIN categories c ON sc.category_id = c.id 
      WHERE c.name = $1
    `, ['Modern']);
    const classicResult = await client.query(`
      SELECT COUNT(DISTINCT s.id) 
      FROM songs s 
      JOIN song_categories sc ON s.id = sc.song_id 
      JOIN categories c ON sc.category_id = c.id 
      WHERE c.name = $1
    `, ['Classic']);
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
