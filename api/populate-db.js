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
    
    // Read the CSV file
    const csvFilePath = path.join(__dirname, 'songs-data.csv');
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parse CSV (skip header row)
    const lines = csvContent.trim().split('\n');
    const songs = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line with quoted fields
      const fields = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim()); // Push the last field
      
      if (fields.length >= 5) {
        const title = fields[0];
        const artist = fields[1];
        const year = parseInt(fields[2]);
        const video_id = fields[3];
        const status = fields[4];
        
        if (!isNaN(year)) {
          songs.push({ title, artist, year, video_id, status });
        } else {
          console.log(`Skipping row ${i}: Invalid year "${fields[2]}" from fields:`, fields);
        }
      }
    }
    
    console.log(`Parsed ${songs.length} songs from CSV`);
    
    // Insert songs in batches
    let inserted = 0;
    for (const song of songs) {
      try {
        await client.query(
          'INSERT INTO songs (title, artist, year, video_id, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (video_id) DO NOTHING',
          [song.title, song.artist, song.year, song.video_id, song.status]
        );
        inserted++;
      } catch (err) {
        console.error(`Failed to insert song:`, song);
        console.error('Error:', err.message);
      }
    }
    console.log(`Inserted ${inserted} songs`);
    
    // Assign songs to playlists based on year
    // Modern: 2016-2025
    await client.query(`
      INSERT INTO song_playlists (song_id, playlist_id)
      SELECT s.id, c.id
      FROM songs s
      CROSS JOIN playlists c
      WHERE c.name = 'Modern' AND s.year >= 2016
      ON CONFLICT DO NOTHING
    `);
    
    // Classic: 1952-2015
    await client.query(`
      INSERT INTO song_playlists (song_id, playlist_id)
      SELECT s.id, c.id
      FROM songs s
      CROSS JOIN playlists c
      WHERE c.name = 'Classic' AND s.year < 2016
      ON CONFLICT DO NOTHING
    `);
    
    // Get counts by playlist
    const modernResult = await client.query(`
      SELECT COUNT(DISTINCT s.id) 
      FROM songs s 
      JOIN song_playlists sc ON s.id = sc.song_id 
      JOIN playlists c ON sc.playlist_id = c.id 
      WHERE c.name = $1
    `, ['Modern']);
    const classicResult = await client.query(`
      SELECT COUNT(DISTINCT s.id) 
      FROM songs s 
      JOIN song_playlists sc ON s.id = sc.song_id 
      JOIN playlists c ON sc.playlist_id = c.id 
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
