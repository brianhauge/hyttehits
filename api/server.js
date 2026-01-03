const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

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

// Authentication middleware
async function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const result = await pool.query(
      'SELECT s.*, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Error authenticating token:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await pool.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Error logging out:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.user_id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// ============================================
// PUBLIC SONG ROUTES
// ============================================

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

// Update song status (public for game use)
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

// ============================================
// ADMIN SONG ROUTES (PROTECTED)
// ============================================

// Update song
app.put('/api/admin/songs/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, artist, year, video_id, playlist, status } = req.body;
    
    const result = await pool.query(
      'UPDATE songs SET title = $1, artist = $2, year = $3, video_id = $4, playlist = $5, status = $6 WHERE video_id = $7 RETURNING *',
      [title, artist, year, video_id, playlist, status, videoId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating song:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Song with this video ID already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Add a new song
app.post('/api/admin/songs', authenticateToken, async (req, res) => {
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
    if (err.code === '23505') {
      res.status(409).json({ error: 'Song with this video ID already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete a song
app.delete('/api/admin/songs/:videoId', authenticateToken, async (req, res) => {
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

// Check all songs for iframe loading
app.post('/api/admin/songs/check-all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT video_id, title, artist FROM songs');
    const songs = result.rows;
    
    res.json({
      message: 'Song check started',
      total: songs.length,
      songs: songs.map(s => ({ video_id: s.video_id, title: s.title, artist: s.artist }))
    });
    
    // Process in background
    checkSongsInBackground(songs);
  } catch (err) {
    console.error('Error starting song check:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check songs in background
async function checkSongsInBackground(songs) {
  console.log(`Starting background check of ${songs.length} songs...`);
  
  for (const song of songs) {
    try {
      // Check if video is embeddable by checking oembed
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${song.video_id}&format=json`;
      await axios.get(oembedUrl);
      
      // If we get here, video exists and is likely embeddable
      await pool.query(
        'UPDATE songs SET status = $1, last_checked = CURRENT_TIMESTAMP WHERE video_id = $2',
        ['working', song.video_id]
      );
      console.log(`✓ ${song.title} - ${song.artist} (${song.video_id})`);
    } catch (err) {
      // Video not available or not embeddable
      await pool.query(
        'UPDATE songs SET status = $1, last_checked = CURRENT_TIMESTAMP WHERE video_id = $2',
        ['broken', song.video_id]
      );
      console.log(`✗ ${song.title} - ${song.artist} (${song.video_id})`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('Background song check completed');
}

// Get statistics
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working,
        SUM(CASE WHEN status = 'broken' THEN 1 ELSE 0 END) as broken,
        SUM(CASE WHEN playlist = 'modern' THEN 1 ELSE 0 END) as modern,
        SUM(CASE WHEN playlist = 'classic' THEN 1 ELSE 0 END) as classic
      FROM songs
    `);
    
    res.json(stats.rows[0]);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search YouTube for alternative
app.post('/api/admin/songs/:videoId/find-alternative', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Get song details
    const songResult = await pool.query('SELECT * FROM songs WHERE video_id = $1', [videoId]);
    if (songResult.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    const song = songResult.rows[0];
    const searchQuery = `${song.title} ${song.artist} official`;
    
    // Search YouTube using oembed (simple alternative without API key)
    // In production, you'd want to use the official YouTube Data API
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    
    res.json({
      message: 'Search for alternatives',
      song: {
        title: song.title,
        artist: song.artist,
        year: song.year,
        current_video_id: song.video_id
      },
      search_url: searchUrl,
      instructions: 'Open the search URL and find an alternative video. Use the video ID to update the song.'
    });
  } catch (err) {
    console.error('Error finding alternative:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all broken songs
app.get('/api/admin/songs/broken', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM songs WHERE status = $1 ORDER BY playlist, year',
      ['broken']
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching broken songs:', err);
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
