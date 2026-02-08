const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

/**
 * Extract direct video URL from YouTube using yt-dlp
 * 
 * @param {string} videoId - YouTube video ID
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {boolean} forceRefresh - Skip cache and force new extraction (for testing)
 * @returns {Promise<Object|null>} - { url, quality, format, expiresAt } or null if failed
 */
async function extractVideoUrl(videoId, pool, forceRefresh = false) {
  try {
    // Step 1: Check cache (unless forcing refresh)
    if (!forceRefresh) {
      const cached = await checkCache(videoId, pool);
      if (cached) {
        console.log(`Cache HIT for ${videoId} (expires: ${cached.expiresAt})`);
        return cached;
      }
    }
    
    // Step 2: Check if video is marked as failed (unless forcing refresh)
    if (!forceRefresh) {
      const failureStatus = await checkFailureStatus(videoId, pool);
      if (failureStatus === 'failed') {
        console.log(`Video ${videoId} is marked as failed, skipping extraction`);
        return null;
      }
      if (failureStatus === 'rate_limited') {
        console.log(`Video ${videoId} is rate limited, skipping extraction`);
        return null;
      }
    }
    
    console.log(`Extracting video URL for ${videoId}...`);
    
    // Step 3: Execute yt-dlp to extract direct URL
    const result = await executeYtDlp(videoId);
    
    if (result.success) {
      // Step 4: Store in cache
      await storeInCache(videoId, result, pool);
      
      // Step 5: Update song status to 'working'
      await updateSongStatus(videoId, 'working', null, pool);
      
      console.log(`✓ Successfully extracted ${videoId} (${result.quality})`);
      return result;
    } else {
      // Step 6: Handle extraction failure
      await handleExtractionFailure(videoId, result.error, pool);
      return null;
    }
    
  } catch (err) {
    console.error(`Error extracting ${videoId}:`, err);
    await handleExtractionFailure(videoId, err.message, pool);
    return null;
  }
}

/**
 * Check if video URL is cached and not expired
 */
async function checkCache(videoId, pool) {
  const result = await pool.query(
    `SELECT direct_url, quality, format, expires_at 
     FROM video_extraction_cache 
     WHERE video_id = $1 AND expires_at > NOW()`,
    [videoId]
  );
  
  if (result.rows.length > 0) {
    const row = result.rows[0];
    return {
      url: row.direct_url,
      quality: row.quality,
      format: row.format,
      expiresAt: row.expires_at
    };
  }
  
  return null;
}

/**
 * Check if video has failed extraction previously
 */
async function checkFailureStatus(videoId, pool) {
  const result = await pool.query(
    `SELECT extraction_status, extraction_last_tested 
     FROM songs 
     WHERE video_id = $1`,
    [videoId]
  );
  
  if (result.rows.length === 0) {
    return 'unknown';
  }
  
  const row = result.rows[0];
  const status = row.extraction_status;
  const lastTested = row.extraction_last_tested;
  
  // If failed, don't retry for 24 hours
  if (status === 'failed' && lastTested) {
    const hoursSinceTest = (Date.now() - new Date(lastTested).getTime()) / (1000 * 60 * 60);
    if (hoursSinceTest < 24) {
      return 'failed';
    }
  }
  
  // If rate limited, don't retry for 1 hour
  if (status === 'rate_limited' && lastTested) {
    const hoursSinceTest = (Date.now() - new Date(lastTested).getTime()) / (1000 * 60 * 60);
    if (hoursSinceTest < 1) {
      return 'rate_limited';
    }
  }
  
  return 'unknown';
}

/**
 * Execute yt-dlp command to extract video URL
 */
async function executeYtDlp(videoId) {
  try {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Command explanation:
    // -f 'bestvideo[height<=1080]+bestaudio/best[height<=1080]'
    //    Try to get 1080p video+audio, or best single format up to 1080p
    // --get-url: Just output the URL, don't download
    // --no-playlist: Only extract single video
    // --skip-download: Don't download the video
    // --no-warnings: Suppress warnings
    // --quiet: Less output
    const { stdout, stderr } = await execFileAsync('yt-dlp', [
      '-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
      '--get-url',
      '--no-playlist',
      '--skip-download',
      '--no-warnings',
      youtubeUrl
    ], {
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    // Parse output - yt-dlp returns URLs separated by newlines
    // For merged formats, it returns video URL then audio URL
    const urls = stdout.trim().split('\n').filter(u => u.length > 0);
    
    if (urls.length === 0) {
      return {
        success: false,
        error: 'No URL returned from yt-dlp'
      };
    }
    
    // For merged format (video+audio), use the first URL (video)
    // For single format, there's only one URL
    const directUrl = urls[0];
    
    // Try to determine quality from URL or assume 1080p
    const quality = extractQuality(directUrl) || '1080p';
    const format = urls.length > 1 ? 'merged' : 'single';
    
    return {
      success: true,
      url: directUrl,
      quality,
      format
    };
    
  } catch (err) {
    // Parse yt-dlp error messages
    const errorMsg = err.stderr || err.message || 'Unknown error';
    
    // Categorize errors
    if (errorMsg.includes('Video unavailable')) {
      return { success: false, error: 'video_unavailable', message: errorMsg };
    }
    if (errorMsg.includes('Private video')) {
      return { success: false, error: 'private_video', message: errorMsg };
    }
    if (errorMsg.includes('age')) {
      return { success: false, error: 'age_restricted', message: errorMsg };
    }
    if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      return { success: false, error: 'rate_limited', message: errorMsg };
    }
    if (err.killed || err.code === 'ETIMEDOUT') {
      return { success: false, error: 'timeout', message: 'Extraction timeout' };
    }
    
    return { success: false, error: 'unknown', message: errorMsg };
  }
}

/**
 * Extract quality information from URL
 */
function extractQuality(url) {
  // Try to find quality indicators in URL
  const qualityMatch = url.match(/\/(\d+)p\//);
  if (qualityMatch) {
    return `${qualityMatch[1]}p`;
  }
  
  // Check for common quality identifiers
  if (url.includes('1080')) return '1080p';
  if (url.includes('720')) return '720p';
  if (url.includes('480')) return '480p';
  if (url.includes('360')) return '360p';
  
  return null;
}

/**
 * Store extracted URL in cache
 */
async function storeInCache(videoId, result, pool) {
  await pool.query(
    `INSERT INTO video_extraction_cache (video_id, direct_url, quality, format, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '5 minutes')
     ON CONFLICT (video_id) 
     DO UPDATE SET 
       direct_url = $2,
       quality = $3,
       format = $4,
       extracted_at = NOW(),
       expires_at = NOW() + INTERVAL '5 minutes'`,
    [videoId, result.url, result.quality, result.format]
  );
}

/**
 * Update song extraction status
 */
async function updateSongStatus(videoId, status, errorMessage, pool) {
  await pool.query(
    `UPDATE songs 
     SET extraction_status = $1::VARCHAR(20),
         extraction_last_tested = NOW(),
         extraction_error_count = CASE 
           WHEN $1::VARCHAR(20) = 'working' THEN 0 
           ELSE extraction_error_count + 1 
         END
     WHERE video_id = $2`,
    [status, videoId]
  );
}

/**
 * Handle extraction failure - categorize and update database
 */
async function handleExtractionFailure(videoId, errorInfo, pool) {
  let status;
  
  if (typeof errorInfo === 'object' && errorInfo.error) {
    const errorType = errorInfo.error;
    
    // Permanent failures - don't retry
    if (['video_unavailable', 'private_video', 'age_restricted'].includes(errorType)) {
      status = 'failed';
      console.log(`Video ${videoId} permanently failed: ${errorType}`);
    }
    // Temporary failures - retry later
    else if (['rate_limited', 'timeout'].includes(errorType)) {
      status = 'rate_limited';
      console.log(`Video ${videoId} temporarily failed: ${errorType}`);
    }
    // Unknown errors - treat as rate limited to allow retry
    else {
      status = 'rate_limited';
      console.log(`Video ${videoId} failed with unknown error: ${errorInfo.message}`);
    }
  } else {
    // Generic error
    status = 'rate_limited';
    console.log(`Video ${videoId} failed: ${errorInfo}`);
  }
  
  await updateSongStatus(videoId, status, errorInfo, pool);
}

/**
 * Get extraction statistics
 */
async function getExtractionStats(pool) {
  const statusStats = await pool.query(
    `SELECT extraction_status, COUNT(*) as count 
     FROM songs 
     GROUP BY extraction_status`
  );
  
  const totalSongs = await pool.query('SELECT COUNT(*) as count FROM songs');
  
  const cacheStats = await pool.query(
    `SELECT COUNT(*) as count, 
            MIN(expires_at) as oldest_expires 
     FROM video_extraction_cache 
     WHERE expires_at > NOW()`
  );
  
  const recentFailures = await pool.query(
    `SELECT video_id, title, artist, extraction_status, extraction_last_tested, extraction_error_count
     FROM songs 
     WHERE extraction_status IN ('failed', 'rate_limited')
     ORDER BY extraction_last_tested DESC 
     LIMIT 10`
  );
  
  return {
    totalSongs: parseInt(totalSongs.rows[0].count),
    statusBreakdown: statusStats.rows.reduce((acc, row) => {
      acc[row.extraction_status] = parseInt(row.count);
      return acc;
    }, {}),
    cacheSize: parseInt(cacheStats.rows[0].count),
    cacheOldestExpires: cacheStats.rows[0].oldest_expires,
    recentFailures: recentFailures.rows
  };
}

/**
 * Clear expired cache entries
 */
async function clearExpiredCache(pool) {
  const result = await pool.query(
    'DELETE FROM video_extraction_cache WHERE expires_at <= NOW()'
  );
  return result.rowCount;
}

/**
 * Clear all cache (for testing)
 */
async function clearAllCache(pool) {
  const result = await pool.query('DELETE FROM video_extraction_cache');
  return result.rowCount;
}

module.exports = {
  extractVideoUrl,
  getExtractionStats,
  clearExpiredCache,
  clearAllCache
};
