const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hyttehits:hyttehits123@localhost:5432/hyttehits',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting YouTube extraction migration...');
    
    await client.query('BEGIN');
    
    // Step 1: Add extraction tracking columns to songs table
    console.log('Adding extraction tracking columns to songs table...');
    await client.query(`
      ALTER TABLE songs 
      ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(20) DEFAULT 'unknown',
      ADD COLUMN IF NOT EXISTS extraction_last_tested TIMESTAMP,
      ADD COLUMN IF NOT EXISTS extraction_error_count INTEGER DEFAULT 0
    `);
    
    // Step 2: Create video_extraction_cache table
    console.log('Creating video_extraction_cache table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_extraction_cache (
        video_id VARCHAR(50) PRIMARY KEY,
        direct_url TEXT NOT NULL,
        quality VARCHAR(10),
        format VARCHAR(50),
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);
    
    // Step 3: Create index for cache cleanup
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cache_expires 
      ON video_extraction_cache(expires_at)
    `);
    
    // Step 4: Create index for extraction status queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_songs_extraction_status 
      ON songs(extraction_status)
    `);
    
    await client.query('COMMIT');
    
    console.log('✓ Migration completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log('- Added extraction_status, extraction_last_tested, extraction_error_count to songs table');
    console.log('- Created video_extraction_cache table');
    console.log('- Created necessary indexes');
    console.log('');
    console.log('Extraction status values:');
    console.log('  - unknown: Not tested yet (default)');
    console.log('  - working: Extraction successful');
    console.log('  - failed: Extraction failed permanently');
    console.log('  - rate_limited: Temporary rate limit');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });
