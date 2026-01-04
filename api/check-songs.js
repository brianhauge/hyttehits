const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hyttehits:hyttehits123@localhost:5432/hyttehits',
});

async function checkSongs() {
  const client = await pool.connect();
  
  try {
    console.log('Fetching all songs from database...');
    const result = await client.query('SELECT video_id, title, artist, status FROM songs ORDER BY year, title');
    const songs = result.rows;
    
    console.log(`Found ${songs.length} songs to check\n`);
    
    let checked = 0;
    let working = 0;
    let broken = 0;
    
    for (const song of songs) {
      checked++;
      process.stdout.write(`\r[${checked}/${songs.length}] Checking: ${song.title} - ${song.artist}...`);
      
      try {
        // Check if video is embeddable by checking oembed
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${song.video_id}&format=json`;
        await axios.get(oembedUrl, { timeout: 5000 });
        
        // If we get here, video exists and is likely embeddable
        if (song.status !== 'working') {
          await client.query(
            'UPDATE songs SET status = $1, last_checked = CURRENT_TIMESTAMP WHERE video_id = $2',
            ['working', song.video_id]
          );
        }
        working++;
      } catch (err) {
        // Video not available or not embeddable
        if (song.status !== 'broken') {
          await client.query(
            'UPDATE songs SET status = $1, last_checked = CURRENT_TIMESTAMP WHERE video_id = $2',
            ['broken', song.video_id]
          );
        }
        broken++;
        console.log(`\n  ✗ BROKEN: ${song.title} - ${song.artist} (${song.video_id})`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n\n✓ Check complete!`);
    console.log(`  Total songs: ${songs.length}`);
    console.log(`  Working: ${working}`);
    console.log(`  Broken: ${broken}`);
    
  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSongs();
