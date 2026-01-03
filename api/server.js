const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hyttehits:hyttehits123@localhost:5432/hyttehits',
});

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// API Routes

// Get all songs
app.get('/api/songs', async (req, res) => {
  try {
    const { playlist, status } = req.query;
    let query = 'SELECT * FROM songs WHERE 1=1';
    const params = [];
    
    if (playlist) {
      params.push(playlist);
      query += ` AND playlist = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    query += ' ORDER BY year, title';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching songs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a random song
app.get('/api/songs/random', async (req, res) => {
  try {
    const { playlist, exclude } = req.query;
    let query = 'SELECT * FROM songs WHERE status = $1';
    const params = ['working'];
    
    if (playlist) {
      params.push(playlist);
      query += ` AND playlist = $${params.length}`;
    }
    
    if (exclude) {
      const excludeIds = exclude.split(',');
      params.push(excludeIds);
      query += ` AND video_id != ALL($${params.length})`;
    }
    
    query += ' ORDER BY RANDOM() LIMIT 1';
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No songs available' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching random song:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get song by video ID
app.get('/api/songs/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const result = await pool.query('SELECT * FROM songs WHERE video_id = $1', [videoId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching song:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update song status
app.patch('/api/songs/:videoId/status', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { status } = req.body;
    
    if (!['working', 'broken'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "working" or "broken"' });
    }
    
    const result = await pool.query(
      'UPDATE songs SET status = $1, last_checked = CURRENT_TIMESTAMP WHERE video_id = $2 RETURNING *',
      [status, videoId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating song status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new song
app.post('/api/songs', async (req, res) => {
  try {
    const { title, artist, year, video_id, playlist, status } = req.body;
    
    if (!title || !artist || !year || !video_id || !playlist) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      'INSERT INTO songs (title, artist, year, video_id, playlist, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, artist, year, video_id, playlist, status || 'working']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding song:', err);
    if (err.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Song with this video ID already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete a song
app.delete('/api/songs/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const result = await pool.query('DELETE FROM songs WHERE video_id = $1 RETURNING *', [videoId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json({ message: 'Song deleted successfully' });
  } catch (err) {
    console.error('Error deleting song:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
