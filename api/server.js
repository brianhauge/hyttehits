const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const XLSX = require('xlsx');
const { extractVideoUrl, getExtractionStats, clearExpiredCache, clearAllCache } = require('./youtube-extractor');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://hyttehits:hyttehits123@localhost:5432/hyttehits',
});

// Middleware
app.use(cors());
app.use(express.json());

// Swagger documentation
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Hyttehits API Documentation'
}));

// OpenAPI spec JSON endpoint
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

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

// Audit logging helper function
async function logAudit(userId, action, resourceType, resourceId, details, ipAddress) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    console.error('Error logging audit:', err);
  }
}

// Get client IP address
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
}

// ============================================
// AUTHENTICATION ROUTES
// ============================================

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login and get authentication token
 *     description: Authenticate with username and password to receive a session token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Missing username or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
    
    // Log audit
    await logAudit(user.id, 'login', 'auth', user.id, { username: user.username }, getClientIp(req));
    
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

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout and invalidate token
 *     description: Logout and delete the current session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Access token required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    // Log audit before deleting session
    await logAudit(req.user.user_id, 'logout', 'auth', req.user.user_id, { username: req.user.username }, getClientIp(req));
    
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Error logging out:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /api/auth/verify:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Verify authentication token
 *     description: Check if the current token is valid
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Access token required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
// PUBLIC ROUTES
// ============================================

/**
 * @openapi
 * /api/playlists:
 *   get:
 *     tags:
 *       - Public Playlists
 *     summary: Get all playlists
 *     description: Returns all playlists with song counts (only includes playlists with working songs)
 *     responses:
 *       200:
 *         description: List of playlists
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Playlist'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get all playlists (public endpoint for game interface)
app.get('/api/playlists', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.name, c.description, COUNT(sc.song_id) as song_count
      FROM playlists c
      LEFT JOIN song_playlists sc ON c.id = sc.playlist_id
      LEFT JOIN songs s ON sc.song_id = s.id AND s.status = 'working'
      GROUP BY c.id
      HAVING COUNT(sc.song_id) > 0
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching playlists:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /api/songs/year-range-info:
 *   get:
 *     tags:
 *       - Public Songs
 *     summary: Get year range information
 *     description: Returns the minimum and maximum years available and total song count
 *     responses:
 *       200:
 *         description: Year range information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/YearRangeInfo'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get year range from database (public endpoint for game interface)
app.get('/api/songs/year-range-info', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        MIN(year) as min_year, 
        MAX(year) as max_year,
        COUNT(*) as total_songs
      FROM songs 
      WHERE status = 'working'
    `);
    
    if (result.rows.length === 0 || !result.rows[0].min_year) {
      return res.json({ min_year: 1960, max_year: 2025, total_songs: 0 });
    }
    
    res.json({
      min_year: parseInt(result.rows[0].min_year),
      max_year: parseInt(result.rows[0].max_year),
      total_songs: parseInt(result.rows[0].total_songs)
    });
  } catch (err) {
    console.error('Error fetching year range info:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /api/songs/counts-by-year:
 *   get:
 *     tags:
 *       - Public Songs
 *     summary: Get song counts by year
 *     description: Returns the number of working songs for each year
 *     responses:
 *       200:
 *         description: Song counts by year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: integer
 *               example:
 *                 "1990": 15
 *                 "1991": 20
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get song counts by year (public endpoint for game interface)
app.get('/api/songs/counts-by-year', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT year, COUNT(*) as count
      FROM songs 
      WHERE status = 'working'
      GROUP BY year
      ORDER BY year
    `);
    
    // Convert to object for easy lookup
    const countsByYear = {};
    result.rows.forEach(row => {
      countsByYear[row.year] = parseInt(row.count);
    });
    
    res.json(countsByYear);
  } catch (err) {
    console.error('Error fetching song counts by year:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PUBLIC SONG ROUTES
// ============================================

/**
 * @openapi
 * /api/songs:
 *   get:
 *     tags:
 *       - Public Songs
 *     summary: Get all songs
 *     description: Returns all songs with their playlists, optionally filtered by status or playlist
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [working, broken]
 *         description: Filter by status
 *       - in: query
 *         name: playlist
 *         schema:
 *           type: string
 *         description: Filter by playlist name
 *     responses:
 *       200:
 *         description: List of songs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Song'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get all songs with playlists
app.get('/api/songs', async (req, res) => {
  try {
    const { status, playlist } = req.query;
    let query = `
      SELECT s.*, 
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name) 
            ORDER BY c.name
          ) FILTER (WHERE c.id IS NOT NULL), 
          '[]'
        ) as playlists
      FROM songs s
      LEFT JOIN song_playlists sc ON s.id = sc.song_id
      LEFT JOIN playlists c ON sc.playlist_id = c.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }
    
    if (playlist) {
      params.push(playlist);
      query += ` AND EXISTS (
        SELECT 1 FROM song_playlists sc2 
        JOIN playlists c2 ON sc2.playlist_id = c2.id 
        WHERE sc2.song_id = s.id AND c2.name = $${params.length}
      )`;
    }
    
    query += ' GROUP BY s.id ORDER BY s.year, s.title';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching songs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get songs by year range
app.get('/api/songs/year-range', async (req, res) => {
  try {
    const { start, end, status } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end year parameters required' });
    }
    
    const startYear = parseInt(start);
    const endYear = parseInt(end);
    
    if (isNaN(startYear) || isNaN(endYear)) {
      return res.status(400).json({ error: 'Invalid year parameters' });
    }
    
    if (startYear > endYear) {
      return res.status(400).json({ error: 'Start year must be less than or equal to end year' });
    }
    
    let query = `
      SELECT s.*, 
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name) 
            ORDER BY c.name
          ) FILTER (WHERE c.id IS NOT NULL), 
          '[]'
        ) as playlists
      FROM songs s
      LEFT JOIN song_playlists sc ON s.id = sc.song_id
      LEFT JOIN playlists c ON sc.playlist_id = c.id
      WHERE s.year >= $1 AND s.year <= $2
    `;
    const params = [startYear, endYear];
    
    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }
    
    query += ' GROUP BY s.id ORDER BY s.year, s.title';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching songs by year range:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /api/songs/random:
 *   get:
 *     tags:
 *       - Public Songs
 *     summary: Get a random song
 *     description: Returns a random working song, optionally filtered by playlist or excluding specific video IDs
 *     parameters:
 *       - in: query
 *         name: playlist
 *         schema:
 *           type: string
 *         description: Filter by playlist name
 *       - in: query
 *         name: exclude
 *         schema:
 *           type: string
 *         description: Comma-separated list of video IDs to exclude
 *         example: "abc123,def456"
 *     responses:
 *       200:
 *         description: Random song
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Song'
 *       404:
 *         description: No songs available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get a random song
app.get('/api/songs/random', async (req, res) => {
  try {
    const { playlist, exclude } = req.query;
    let query = `
      SELECT s.*, 
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name) 
            ORDER BY c.name
          ) FILTER (WHERE c.id IS NOT NULL), 
          '[]'
        ) as playlists
      FROM songs s
      LEFT JOIN song_playlists sc ON s.id = sc.song_id
      LEFT JOIN playlists c ON sc.playlist_id = c.id
      WHERE s.status = $1
    `;
    const params = ['working'];
    
    if (playlist) {
      params.push(playlist);
      query += ` AND EXISTS (
        SELECT 1 FROM song_playlists sc2 
        JOIN playlists c2 ON sc2.playlist_id = c2.id 
        WHERE sc2.song_id = s.id AND c2.name = $${params.length}
      )`;
    }
    
    if (exclude) {
      const excludeIds = exclude.split(',');
      params.push(excludeIds);
      query += ` AND s.video_id != ALL($${params.length})`;
    }
    
    query += ' GROUP BY s.id ORDER BY RANDOM() LIMIT 1';
    
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { videoId } = req.params;
    const { title, artist, year, video_id, status, playlists } = req.body;
    
    // Update song
    const result = await client.query(
      'UPDATE songs SET title = $1, artist = $2, year = $3, video_id = $4, status = $5 WHERE video_id = $6 RETURNING *',
      [title, artist, year, video_id, status || 'working', videoId]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Song not found' });
    }
    
    const song = result.rows[0];
    
    // Update playlists if provided
    if (playlists && Array.isArray(playlists)) {
      // Delete existing playlists
      await client.query('DELETE FROM song_playlists WHERE song_id = $1', [song.id]);
      
      // Insert new playlists
      for (const playlistId of playlists) {
        await client.query(
          'INSERT INTO song_playlists (song_id, playlist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [song.id, playlistId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Log audit
    await logAudit(req.user.user_id, 'update', 'song', video_id, { oldVideoId: videoId, newData: req.body }, getClientIp(req));
    
    // Fetch updated song with playlists
    const updatedResult = await pool.query(`
      SELECT s.*, 
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name) 
            ORDER BY c.name
          ) FILTER (WHERE c.id IS NOT NULL), 
          '[]'
        ) as playlists
      FROM songs s
      LEFT JOIN song_playlists sc ON s.id = sc.song_id
      LEFT JOIN playlists c ON sc.playlist_id = c.id
      WHERE s.video_id = $1
      GROUP BY s.id
    `, [video_id]);
    
    res.json(updatedResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating song:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Song with this video ID already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    client.release();
  }
});

/**
 * @openapi
 * /api/admin/songs:
 *   post:
 *     tags:
 *       - Admin Songs
 *     summary: Add a new song
 *     description: Create a new song (requires authentication)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SongCreate'
 *     responses:
 *       201:
 *         description: Song created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Song'
 *       400:
 *         description: Missing required fields or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Access token required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Song with this video ID already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Add a new song
app.post('/api/admin/songs', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { title, artist, year, video_id, status, playlists } = req.body;
    
    if (!title || !artist || !year || !video_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Missing required fields: title, artist, year, video_id' });
    }
    
    if (!playlists || !Array.isArray(playlists) || playlists.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'At least one playlist is required' });
    }
    
    // Insert song
    const result = await client.query(
      'INSERT INTO songs (title, artist, year, video_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, artist, year, video_id, status || 'working']
    );
    
    const song = result.rows[0];
    
    // Insert playlists
    for (const playlistId of playlists) {
      await client.query(
        'INSERT INTO song_playlists (song_id, playlist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [song.id, playlistId]
      );
    }
    
    await client.query('COMMIT');
    
    // Log audit
    await logAudit(req.user.user_id, 'create', 'song', video_id, { title, artist, year, playlists }, getClientIp(req));
    
    // Fetch created song with playlists
    const createdResult = await pool.query(`
      SELECT s.*, 
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name) 
            ORDER BY c.name
          ) FILTER (WHERE c.id IS NOT NULL), 
          '[]'
        ) as playlists
      FROM songs s
      LEFT JOIN song_playlists sc ON s.id = sc.song_id
      LEFT JOIN playlists c ON sc.playlist_id = c.id
      WHERE s.video_id = $1
      GROUP BY s.id
    `, [video_id]);
    
    res.status(201).json(createdResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding song:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Song with this video ID already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    client.release();
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
    
    // Log audit
    await logAudit(req.user.user_id, 'delete', 'song', videoId, { song: result.rows[0] }, getClientIp(req));
    
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

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags:
 *       - Admin Songs
 *     summary: Get song statistics
 *     description: Returns statistics about songs (requires authentication)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Song statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Stats'
 *       401:
 *         description: Access token required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get statistics
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    // Get overall stats
    const overallStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working,
        SUM(CASE WHEN status = 'broken' THEN 1 ELSE 0 END) as broken,
        SUM(CASE WHEN last_checked IS NULL THEN 1 ELSE 0 END) as unchecked
      FROM songs
    `);
    
    // Get stats by playlist
    const playlistStats = await pool.query(`
      SELECT c.name, COUNT(sc.song_id) as count
      FROM playlists c
      LEFT JOIN song_playlists sc ON c.id = sc.playlist_id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);
    
    const stats = {
      total: parseInt(overallStats.rows[0].total),
      working: parseInt(overallStats.rows[0].working),
      broken: parseInt(overallStats.rows[0].broken),
      unchecked: parseInt(overallStats.rows[0].unchecked),
      byPlaylist: {}
    };
    
    playlistStats.rows.forEach(row => {
      stats.byPlaylist[row.name.toLowerCase()] = parseInt(row.count);
    });
    
    // Keep modern/classic for backwards compatibility
    stats.modern = stats.byPlaylist.modern || 0;
    stats.classic = stats.byPlaylist.classic || 0;
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search YouTube for alternative videos
app.post('/api/admin/songs/:videoId/find-alternative', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Get song details
    const songResult = await pool.query('SELECT * FROM songs WHERE video_id = $1', [videoId]);
    if (songResult.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }
    
    const song = songResult.rows[0];
    const searchQuery = `${song.title} ${song.artist}`;
    
    console.log(`Finding alternative for: ${searchQuery}`);
    
    // Use a simpler approach: try common video ID patterns
    // Many songs have multiple uploads with similar patterns
    const alternatives = [];
    
    // Try to find alternatives by searching for similar videos
    // We'll use oEmbed to test if videos are embeddable
    // Common patterns: official uploads, topic channels, lyrics videos
    const searchVariations = [
      `${song.title} ${song.artist} official`,
      `${song.title} ${song.artist} official video`,
      `${song.title} ${song.artist} lyrics`,
      `${song.title} ${song.artist} official audio`,
      `${song.title} ${song.artist} topic`
    ];
    
    // Try YouTube Music/Topic channel pattern
    // These often have working embeds
    for (const variation of searchVariations) {
      try {
        // Encode search query for URL
        const encoded = encodeURIComponent(variation);
        
        // Try to get suggestions using YouTube's autocomplete API (doesn't require auth)
        const suggestUrl = `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&q=${encoded}`;
        
        // Note: This is a simplified approach
        // In production, you might want to use the official YouTube Data API
        console.log(`Trying search variation: ${variation}`);
        
      } catch (err) {
        console.error(`Error with variation ${variation}:`, err.message);
        continue;
      }
    }
    
    // Since YouTube scraping is unreliable, return a helpful response
    // with search URLs for different variations
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    
    res.json({
      song: {
        title: song.title,
        artist: song.artist,
        year: song.year,
        current_video_id: song.video_id
      },
      alternatives: [],
      search_variations: searchVariations.map(v => ({
        query: v,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(v)}`
      })),
      search_url: searchUrl,
      message: 'YouTube scraping is unreliable. Please manually search for alternatives using the provided search links.'
    });
    
  } catch (err) {
    console.error('Error finding alternative:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Get all broken songs
app.get('/api/admin/songs/broken', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, 
        COALESCE(
          json_agg(
            json_build_object('id', c.id, 'name', c.name) 
            ORDER BY c.name
          ) FILTER (WHERE c.id IS NOT NULL), 
          '[]'
        ) as playlists
      FROM songs s
      LEFT JOIN song_playlists sc ON s.id = sc.song_id
      LEFT JOIN playlists c ON sc.playlist_id = c.id
      WHERE s.status = 'broken'
      GROUP BY s.id
      ORDER BY s.year
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching broken songs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// EXCEL IMPORT/EXPORT ROUTES
// ============================================

// Export all songs to Excel
app.get('/api/admin/songs/export-excel', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.video_id, s.title, s.artist, s.year, s.status,
        string_agg(c.name, ', ' ORDER BY c.name) as playlists
      FROM songs s
      LEFT JOIN song_playlists sc ON s.id = sc.song_id
      LEFT JOIN playlists c ON sc.playlist_id = c.id
      GROUP BY s.id
      ORDER BY s.year, s.title
    `);
    
    const songs = result.rows;
    
    // Prepare data for Excel
    const data = songs.map(song => ({
      video_id: song.video_id,
      title: song.title,
      artist: song.artist,
      year: song.year,
      status: song.status,
      playlists: song.playlists || ''
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // video_id
      { wch: 40 }, // title
      { wch: 30 }, // artist
      { wch: 8 },  // year
      { wch: 10 }, // status
      { wch: 30 }  // playlists
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Songs');
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Log audit
    await logAudit(req.user.user_id, 'export', 'songs', null, { count: songs.length, format: 'excel' }, getClientIp(req));
    
    // Send as downloadable file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=songs-export.xlsx');
    res.send(excelBuffer);
  } catch (err) {
    console.error('Error exporting Excel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import songs from Excel
app.post('/api/admin/songs/import-excel', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { base64Data } = req.body;
    
    if (!base64Data) {
      return res.status(400).json({ error: 'Excel file data required' });
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Read Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get first worksheet
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }
    
    // Validate required columns
    const expectedHeaders = ['video_id', 'title', 'artist', 'year', 'status', 'playlists'];
    const firstRow = data[0];
    const hasAllHeaders = expectedHeaders.every(h => h in firstRow);
    
    if (!hasAllHeaders) {
      const foundHeaders = Object.keys(firstRow);
      return res.status(400).json({ 
        error: `Excel must have these columns: ${expectedHeaders.join(', ')}. Found: ${foundHeaders.join(', ')}` 
      });
    }
    
    await client.query('BEGIN');
    
    let created = 0;
    let updated = 0;
    const errors = [];
    
    // Get all playlists for lookup
    const playlistsResult = await client.query('SELECT id, name FROM playlists');
    const playlistMap = {};
    playlistsResult.rows.forEach(p => {
      playlistMap[p.name.toLowerCase()] = p.id;
    });
    
    // Process each row
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        
        const video_id = String(row.video_id || '').trim();
        const title = String(row.title || '').trim();
        const artist = String(row.artist || '').trim();
        const year = parseInt(row.year);
        const status = String(row.status || 'working').trim();
        const playlistsStr = String(row.playlists || '').trim();
        
        // Validate required fields
        if (!video_id || !title || !artist || !year) {
          errors.push(`Row ${i + 2}: Missing required fields (video_id, title, artist, or year)`);
          continue;
        }
        
        if (isNaN(year)) {
          errors.push(`Row ${i + 2}: Invalid year value`);
          continue;
        }
        
        // Parse playlists
        const playlistNames = playlistsStr
          .split(',')
          .map(p => p.trim())
          .filter(p => p.length > 0);
        
        const playlistIds = [];
        for (const name of playlistNames) {
          const playlistId = playlistMap[name.toLowerCase()];
          if (playlistId) {
            playlistIds.push(playlistId);
          } else {
            errors.push(`Row ${i + 2}: Playlist "${name}" not found`);
          }
        }
        
        if (playlistIds.length === 0 && playlistNames.length > 0) {
          errors.push(`Row ${i + 2}: No valid playlists found`);
          continue;
        }
        
        // Check if song exists by video_id
        let existingResult = await client.query(
          'SELECT id FROM songs WHERE video_id = $1',
          [video_id]
        );
        
        let songId;
        let isUpdate = false;
        
        if (existingResult.rows.length > 0) {
          // Song exists by video_id - update it
          songId = existingResult.rows[0].id;
          isUpdate = true;
        } else {
          // Check by title + artist
          existingResult = await client.query(
            'SELECT id FROM songs WHERE LOWER(title) = LOWER($1) AND LOWER(artist) = LOWER($2)',
            [title, artist]
          );
          
          if (existingResult.rows.length > 0) {
            // Song exists by title+artist - update it
            songId = existingResult.rows[0].id;
            isUpdate = true;
          }
        }
        
        if (isUpdate) {
          // Update existing song
          await client.query(
            'UPDATE songs SET video_id = $1, title = $2, artist = $3, year = $4, status = $5 WHERE id = $6',
            [video_id, title, artist, year, status, songId]
          );
          
          // Delete existing playlists
          await client.query('DELETE FROM song_playlists WHERE song_id = $1', [songId]);
          
          updated++;
        } else {
          // Insert new song
          const insertResult = await client.query(
            'INSERT INTO songs (video_id, title, artist, year, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [video_id, title, artist, year, status]
          );
          songId = insertResult.rows[0].id;
          created++;
        }
        
        // Insert playlists
        for (const playlistId of playlistIds) {
          await client.query(
            'INSERT INTO song_playlists (song_id, playlist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [songId, playlistId]
          );
        }
        
      } catch (err) {
        console.error(`Error processing row ${i + 2}:`, err);
        errors.push(`Row ${i + 2}: ${err.message}`);
      }
    }
    
    await client.query('COMMIT');
    
    // Log audit
    await logAudit(req.user.user_id, 'import', 'songs', null, { 
      total: data.length, 
      created, 
      updated, 
      errors: errors.length,
      format: 'excel'
    }, getClientIp(req));
    
    res.json({
      total: data.length,
      created,
      updated,
      errors
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error importing Excel:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    client.release();
  }
});

// ============================================
// PLAYLIST MANAGEMENT ROUTES
// ============================================

// Get all playlists
app.get('/api/admin/playlists', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(sc.song_id) as song_count
      FROM playlists c
      LEFT JOIN song_playlists sc ON c.id = sc.playlist_id
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching playlists:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new playlist
app.post('/api/admin/playlists', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Playlist name required' });
    }
    
    const result = await pool.query(
      'INSERT INTO playlists (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    );
    
    // Log audit
    await logAudit(req.user.user_id, 'create', 'playlist', result.rows[0].id, { name, description }, getClientIp(req));
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating playlist:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Playlist with this name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update a playlist
app.put('/api/admin/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Playlist name required' });
    }
    
    const result = await pool.query(
      'UPDATE playlists SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Log audit
    await logAudit(req.user.user_id, 'update', 'playlist', id, { name, description }, getClientIp(req));
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating playlist:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Playlist with this name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete a playlist
app.delete('/api/admin/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if playlist has songs
    const checkResult = await pool.query(
      'SELECT COUNT(*) FROM song_playlists WHERE playlist_id = $1',
      [id]
    );
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete playlist with associated songs. Remove songs from this playlist first.' 
      });
    }
    
    const result = await pool.query('DELETE FROM playlists WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Log audit
    await logAudit(req.user.user_id, 'delete', 'playlist', id, { name: result.rows[0].name }, getClientIp(req));
    
    res.json({ message: 'Playlist deleted successfully' });
  } catch (err) {
    console.error('Error deleting playlist:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// USER ADMINISTRATION ROUTES
// ============================================

// Get all users
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new user
app.post('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username, passwordHash, role || 'admin']
    );
    
    // Log audit
    await logAudit(req.user.user_id, 'create', 'user', result.rows[0].id, { username, role: role || 'admin' }, getClientIp(req));
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update user
app.put('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;
    
    let query = 'UPDATE users SET username = $1, role = $2';
    let params = [username, role || 'admin'];
    
    // If password is provided, hash it
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      query += ', password_hash = $3 WHERE id = $4 RETURNING id, username, role, created_at, last_login';
      params.push(passwordHash, id);
    } else {
      query += ' WHERE id = $3 RETURNING id, username, role, created_at, last_login';
      params.push(id);
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log audit
    await logAudit(req.user.user_id, 'update', 'user', id, { username, role, passwordChanged: !!password }, getClientIp(req));
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete user
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting self
    if (parseInt(id) === req.user.user_id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING username', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log audit
    await logAudit(req.user.user_id, 'delete', 'user', id, { username: result.rows[0].username }, getClientIp(req));
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// AUDIT LOG ROUTES
// ============================================

// Get audit logs
app.get('/api/admin/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0, user_id, action, resource_type } = req.query;
    
    let query = `
      SELECT al.*, u.username 
      FROM audit_logs al 
      JOIN users u ON al.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];
    
    if (user_id) {
      params.push(user_id);
      query += ` AND al.user_id = $${params.length}`;
    }
    
    if (action) {
      params.push(action);
      query += ` AND al.action = $${params.length}`;
    }
    
    if (resource_type) {
      params.push(resource_type);
      query += ` AND al.resource_type = $${params.length}`;
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1';
    const countParams = [];
    
    if (user_id) {
      countParams.push(user_id);
      countQuery += ` AND user_id = $${countParams.length}`;
    }
    
    if (action) {
      countParams.push(action);
      countQuery += ` AND action = $${countParams.length}`;
    }
    
    if (resource_type) {
      countParams.push(resource_type);
      countQuery += ` AND resource_type = $${countParams.length}`;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GAME LOG ROUTES
// ============================================

/**
 * @openapi
 * /api/game-logs:
 *   post:
 *     tags:
 *       - Game Logs
 *     summary: Log a song play
 *     description: Record a song play event from the game
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameLog'
 *     responses:
 *       201:
 *         description: Game log created
 *       400:
 *         description: video_id is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Log a song play (public endpoint)
app.post('/api/game-logs', async (req, res) => {
  try {
    const { video_id, team_name, playlist, guessed_correctly, session_id } = req.body;
    
    if (!video_id) {
      return res.status(400).json({ error: 'video_id required' });
    }
    
    await pool.query(
      'INSERT INTO game_logs (video_id, team_name, playlist, guessed_correctly, session_id, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [video_id, team_name, playlist || 'Modern', guessed_correctly, session_id, getClientIp(req)]
    );
    
    res.status(201).json({ message: 'Game log created' });
  } catch (err) {
    console.error('Error creating game log:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get game logs (admin only)
app.get('/api/admin/game-logs', authenticateToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0, video_id, playlist, session_id } = req.query;
    
    let query = `
      SELECT gl.*, s.title, s.artist, s.year 
      FROM game_logs gl 
      JOIN songs s ON gl.video_id = s.video_id 
      WHERE 1=1
    `;
    const params = [];
    
    if (video_id) {
      params.push(video_id);
      query += ` AND gl.video_id = $${params.length}`;
    }
    
    if (playlist) {
      params.push(playlist);
      query += ` AND gl.playlist = $${params.length}`;
    }
    
    if (session_id) {
      params.push(session_id);
      query += ` AND gl.session_id = $${params.length}`;
    }
    
    query += ` ORDER BY gl.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM game_logs WHERE 1=1';
    const countParams = [];
    
    if (video_id) {
      countParams.push(video_id);
      countQuery += ` AND video_id = $${countParams.length}`;
    }
    
    if (playlist) {
      countParams.push(playlist);
      countQuery += ` AND playlist = $${countParams.length}`;
    }
    
    if (session_id) {
      countParams.push(session_id);
      countQuery += ` AND session_id = $${countParams.length}`;
    }
    
    const countResult = await pool.query(countQuery, countParams);
    
    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error fetching game logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get game statistics
app.get('/api/admin/game-stats', authenticateToken, async (req, res) => {
  try {
    const stats = {};
    
    // Total plays
    const totalResult = await pool.query('SELECT COUNT(*) FROM game_logs');
    stats.totalPlays = parseInt(totalResult.rows[0].count);
    
    // Plays by playlist
    const playlistResult = await pool.query(
      'SELECT playlist, COUNT(*) as count FROM game_logs GROUP BY playlist'
    );
    stats.byPlaylist = {};
    playlistResult.rows.forEach(row => {
      stats.byPlaylist[row.playlist] = parseInt(row.count);
    });
    
    // Most played songs
    const mostPlayedResult = await pool.query(`
      SELECT gl.video_id, s.title, s.artist, s.year, COUNT(*) as play_count 
      FROM game_logs gl 
      JOIN songs s ON gl.video_id = s.video_id 
      GROUP BY gl.video_id, s.title, s.artist, s.year 
      ORDER BY play_count DESC 
      LIMIT 10
    `);
    stats.mostPlayed = mostPlayedResult.rows;
    
    // Success rate
    const successResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE guessed_correctly = true) as correct,
        COUNT(*) FILTER (WHERE guessed_correctly = false) as incorrect,
        COUNT(*) as total
      FROM game_logs 
      WHERE guessed_correctly IS NOT NULL
    `);
    if (successResult.rows[0].total > 0) {
      stats.successRate = {
        correct: parseInt(successResult.rows[0].correct),
        incorrect: parseInt(successResult.rows[0].incorrect),
        total: parseInt(successResult.rows[0].total),
        percentage: ((parseInt(successResult.rows[0].correct) / parseInt(successResult.rows[0].total)) * 100).toFixed(2)
      };
    } else {
      stats.successRate = { correct: 0, incorrect: 0, total: 0, percentage: 0 };
    }
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching game stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// YOUTUBE EXTRACTION ROUTES
// ============================================

/**
 * @openapi
 * /api/youtube/extract/{videoId}:
 *   get:
 *     tags:
 *       - YouTube
 *     summary: Extract direct video URL from YouTube (public endpoint for TV app)
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *         description: YouTube video ID
 *     responses:
 *       200:
 *         description: Extraction result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 videoId:
 *                   type: string
 *                 directUrl:
 *                   type: string
 *                 quality:
 *                   type: string
 *                 cachedUntil:
 *                   type: string
 *                 fallbackToIframe:
 *                   type: boolean
 */
app.get('/api/youtube/extract/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    console.log(`[Extract] Request for ${videoId}`);
    
    const result = await extractVideoUrl(videoId, pool);
    
    if (result) {
      res.json({
        success: true,
        videoId,
        directUrl: result.url,
        quality: result.quality,
        cachedUntil: result.expiresAt
      });
    } else {
      // Extraction failed, TV app will fallback to iframe
      res.json({
        success: false,
        videoId,
        fallbackToIframe: true
      });
    }
  } catch (err) {
    console.error('[Extract] Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Extraction failed',
      fallbackToIframe: true
    });
  }
});

/**
 * @openapi
 * /api/admin/youtube/test/{videoId}:
 *   post:
 *     tags:
 *       - Admin - YouTube
 *     summary: Test extraction for a single video (force refresh)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: videoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Test result
 */
app.post('/api/admin/youtube/test/:videoId', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    console.log(`[Admin Test] Testing ${videoId}`);
    
    const startTime = Date.now();
    const result = await extractVideoUrl(videoId, pool, true); // Force refresh
    const duration = Date.now() - startTime;
    
    if (result) {
      res.json({
        success: true,
        videoId,
        directUrl: result.url,
        quality: result.quality,
        duration: `${duration}ms`
      });
    } else {
      res.json({
        success: false,
        videoId,
        error: 'Extraction failed',
        duration: `${duration}ms`
      });
    }
    
    await logAudit(req.user.user_id, 'test', 'youtube_extraction', videoId, { duration }, getClientIp(req));
  } catch (err) {
    console.error('[Admin Test] Error:', err);
    res.status(500).json({ error: 'Test failed', message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/youtube/test-batch:
 *   post:
 *     tags:
 *       - Admin - YouTube
 *     summary: Test extraction for multiple videos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               videoIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 description: Optional filter - test only videos with this status
 *     responses:
 *       200:
 *         description: Batch test results
 */
app.post('/api/admin/youtube/test-batch', authenticateToken, async (req, res) => {
  try {
    let { videoIds, status } = req.body;
    
    // If no videoIds provided, get all videos (or filtered by status)
    if (!videoIds || videoIds.length === 0) {
      let query = 'SELECT video_id FROM songs';
      let params = [];
      
      if (status) {
        query += ' WHERE extraction_status = $1';
        params.push(status);
      }
      
      const result = await pool.query(query, params);
      videoIds = result.rows.map(row => row.video_id);
    }
    
    console.log(`[Admin Batch Test] Testing ${videoIds.length} videos`);
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Process sequentially to avoid rate limiting (5 per minute = 12 second intervals)
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      
      try {
        const startTime = Date.now();
        const result = await extractVideoUrl(videoId, pool, true);
        const duration = Date.now() - startTime;
        
        if (result) {
          successCount++;
          results.push({
            videoId,
            success: true,
            quality: result.quality,
            duration: `${duration}ms`
          });
        } else {
          failureCount++;
          results.push({
            videoId,
            success: false,
            duration: `${duration}ms`
          });
        }
      } catch (err) {
        failureCount++;
        results.push({
          videoId,
          success: false,
          error: err.message
        });
      }
      
      // Rate limiting: wait 12 seconds between requests (5 per minute)
      if (i < videoIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    }
    
    res.json({
      totalTested: videoIds.length,
      successCount,
      failureCount,
      results
    });
    
    await logAudit(req.user.user_id, 'test_batch', 'youtube_extraction', null, 
      { totalTested: videoIds.length, successCount, failureCount }, getClientIp(req));
  } catch (err) {
    console.error('[Admin Batch Test] Error:', err);
    res.status(500).json({ error: 'Batch test failed', message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/youtube/stats:
 *   get:
 *     tags:
 *       - Admin - YouTube
 *     summary: Get extraction statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics
 */
app.get('/api/admin/youtube/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getExtractionStats(pool);
    res.json(stats);
  } catch (err) {
    console.error('[Admin Stats] Error:', err);
    res.status(500).json({ error: 'Failed to get statistics', message: err.message });
  }
});

/**
 * @openapi
 * /api/admin/youtube/cache:
 *   delete:
 *     tags:
 *       - Admin - YouTube
 *     summary: Clear extraction cache
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *         description: Clear all cache (true) or only expired (false)
 *     responses:
 *       200:
 *         description: Cache cleared
 */
app.delete('/api/admin/youtube/cache', authenticateToken, async (req, res) => {
  try {
    const clearAll = req.query.all === 'true';
    
    const count = clearAll 
      ? await clearAllCache(pool) 
      : await clearExpiredCache(pool);
    
    res.json({
      success: true,
      cleared: count,
      type: clearAll ? 'all' : 'expired'
    });
    
    await logAudit(req.user.user_id, 'clear_cache', 'youtube_extraction', null, 
      { cleared: count, type: clearAll ? 'all' : 'expired' }, getClientIp(req));
  } catch (err) {
    console.error('[Admin Clear Cache] Error:', err);
    res.status(500).json({ error: 'Failed to clear cache', message: err.message });
  }
});

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
