// Video Player Manager for TV
// Supports both direct video URLs (ad-free) and YouTube iframe (fallback)

const API_URL = 'http://birkehaven.dyndns.dk/api';

class VideoPlayerManager {
    constructor() {
        this.currentPlayer = null; // 'direct' or 'iframe'
        this.directPlayer = document.getElementById('direct-player');
        this.iframePlayerElement = document.getElementById('youtube-player');
        this.loadingSpinner = document.getElementById('video-loading');
        this.errorMessage = document.getElementById('video-error');
        this.iframePlayer = null; // YouTube IFrame API player
        this.isIframeReady = false;
        this.currentVideoId = null;
        
        // Load failed extractions from localStorage
        this.failedExtractions = this.loadFailedExtractions();
        
        console.log('[VideoPlayerManager] Initialized');
        console.log(`[VideoPlayerManager] Known failed extractions: ${this.failedExtractions.size}`);
    }
    
    /**
     * Load failed extractions from localStorage
     */
    loadFailedExtractions() {
        try {
            const stored = localStorage.getItem('hyttehits-failed-extractions');
            if (stored) {
                const array = JSON.parse(stored);
                return new Set(array);
            }
        } catch (err) {
            console.error('[VideoPlayerManager] Error loading failed extractions:', err);
        }
        return new Set();
    }
    
    /**
     * Save failed extractions to localStorage
     */
    saveFailedExtractions() {
        try {
            const array = Array.from(this.failedExtractions);
            localStorage.setItem('hyttehits-failed-extractions', JSON.stringify(array));
        } catch (err) {
            console.error('[VideoPlayerManager] Error saving failed extractions:', err);
        }
    }
    
    /**
     * Main method to play a video - tries extraction first, then iframe fallback
     */
    async playVideo(videoId) {
        this.currentVideoId = videoId;
        console.log(`[VideoPlayerManager] Playing video: ${videoId}`);
        
        // Check if this video is known to fail extraction
        if (this.failedExtractions.has(videoId)) {
            console.log(`[VideoPlayerManager] ${videoId} is known failed extraction, using iframe`);
            return this.playViaIframe(videoId);
        }
        
        // Show loading spinner
        this.showLoading();
        
        // Try extraction via API
        try {
            const response = await fetch(`${API_URL}/youtube/extract/${videoId}`, {
                timeout: 10000 // 10 second timeout
            });
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.directUrl) {
                console.log(`[VideoPlayerManager] Extraction successful: ${data.quality}`);
                return this.playViaDirect(videoId, data.directUrl);
            } else {
                console.log(`[VideoPlayerManager] Extraction failed, using iframe fallback`);
                this.failedExtractions.add(videoId);
                this.saveFailedExtractions();
                return this.playViaIframe(videoId);
            }
        } catch (err) {
            console.error(`[VideoPlayerManager] API error:`, err);
            console.log(`[VideoPlayerManager] Using iframe fallback due to API error`);
            return this.playViaIframe(videoId);
        }
    }
    
    /**
     * Play video using HTML5 video element with direct URL
     */
    async playViaDirect(videoId, directUrl) {
        return new Promise((resolve, reject) => {
            console.log(`[VideoPlayerManager] Playing via direct URL`);
            
            // Hide iframe and loading, show direct player
            this.hideLoading();
            this.hideError();
            this.iframePlayerElement.classList.add('hidden');
            this.directPlayer.classList.remove('hidden');
            
            // Set current player
            this.currentPlayer = 'direct';
            
            // Set up error handler - fallback to iframe on error
            const errorHandler = async () => {
                console.error(`[VideoPlayerManager] Direct playback failed, falling back to iframe`);
                this.directPlayer.removeEventListener('error', errorHandler);
                
                // Remember this failure
                this.failedExtractions.add(videoId);
                this.saveFailedExtractions();
                
                // Try iframe instead
                try {
                    await this.playViaIframe(videoId);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            
            // Set up success handler
            const canPlayHandler = () => {
                console.log(`[VideoPlayerManager] Direct video can play`);
                this.directPlayer.removeEventListener('canplay', canPlayHandler);
                resolve();
            };
            
            this.directPlayer.addEventListener('error', errorHandler, { once: true });
            this.directPlayer.addEventListener('canplay', canPlayHandler, { once: true });
            
            // Set source and play
            this.directPlayer.src = directUrl;
            this.directPlayer.load();
            
            // Attempt to play
            const playPromise = this.directPlayer.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    console.error(`[VideoPlayerManager] Play promise rejected:`, err);
                    errorHandler();
                });
            }
        });
    }
    
    /**
     * Play video using YouTube iframe (fallback method)
     */
    async playViaIframe(videoId) {
        return new Promise(async (resolve, reject) => {
            console.log(`[VideoPlayerManager] Playing via YouTube iframe`);
            
            // Hide direct player and loading, show iframe
            this.hideLoading();
            this.hideError();
            this.directPlayer.classList.add('hidden');
            this.iframePlayerElement.classList.remove('hidden');
            
            // Set current player
            this.currentPlayer = 'iframe';
            
            // Set up error handler for this video
            const errorHandler = (error) => {
                console.error(`[VideoPlayerManager] YouTube iframe error:`, error);
                this.showError();
                setTimeout(() => {
                    this.hideError();
                    reject(new Error('Video failed to load'));
                }, 3000);
            };
            
            // If player doesn't exist yet, create it
            if (!this.iframePlayer) {
                await this.initIframePlayer(videoId, errorHandler);
                resolve();
            } else {
                // Player exists, just load new video
                this.iframePlayer.loadVideoById(videoId);
                
                // Wait a bit to see if it loads successfully
                setTimeout(() => resolve(), 2000);
            }
        });
    }
    
    /**
     * Initialize YouTube IFrame player
     */
    initIframePlayer(videoId, errorHandler) {
        return new Promise((resolve, reject) => {
            this.iframePlayer = new YT.Player('youtube-player', {
                height: '945',
                width: '1680',
                videoId: videoId,
                playerVars: {
                    'autoplay': 1,
                    'controls': 1,
                    'disablekb': 0,
                    'modestbranding': 1,
                    'rel': 0,
                    'showinfo': 0,
                    'iv_load_policy': 3,
                    'fs': 1,
                    'playsinline': 0
                },
                events: {
                    'onReady': (event) => {
                        this.isIframeReady = true;
                        console.log('[VideoPlayerManager] YouTube iframe ready');
                        event.target.setVolume(100);
                        resolve();
                    },
                    'onError': errorHandler,
                    'onStateChange': (event) => {
                        if (event.data === YT.PlayerState.ENDED) {
                            console.log('[VideoPlayerManager] Video ended');
                        }
                    }
                }
            });
        });
    }
    
    /**
     * Pause current video
     */
    pauseVideo() {
        if (this.currentPlayer === 'direct') {
            this.directPlayer.pause();
        } else if (this.currentPlayer === 'iframe' && this.iframePlayer && this.isIframeReady) {
            this.iframePlayer.pauseVideo();
        }
    }
    
    /**
     * Stop current video
     */
    stopVideo() {
        if (this.currentPlayer === 'direct') {
            this.directPlayer.pause();
            this.directPlayer.currentTime = 0;
            this.directPlayer.src = '';
        } else if (this.currentPlayer === 'iframe' && this.iframePlayer && this.isIframeReady) {
            this.iframePlayer.stopVideo();
        }
    }
    
    /**
     * Resume current video
     */
    resumeVideo() {
        if (this.currentPlayer === 'direct') {
            this.directPlayer.play();
        } else if (this.currentPlayer === 'iframe' && this.iframePlayer && this.isIframeReady) {
            this.iframePlayer.playVideo();
        }
    }
    
    /**
     * Get current playback time
     */
    getCurrentTime() {
        if (this.currentPlayer === 'direct') {
            return this.directPlayer.currentTime;
        } else if (this.currentPlayer === 'iframe' && this.iframePlayer && this.isIframeReady) {
            return this.iframePlayer.getCurrentTime();
        }
        return 0;
    }
    
    /**
     * Get video duration
     */
    getDuration() {
        if (this.currentPlayer === 'direct') {
            return this.directPlayer.duration;
        } else if (this.currentPlayer === 'iframe' && this.iframePlayer && this.isIframeReady) {
            return this.iframePlayer.getDuration();
        }
        return 0;
    }
    
    /**
     * Seek to specific time
     */
    seekTo(seconds) {
        if (this.currentPlayer === 'direct') {
            this.directPlayer.currentTime = seconds;
        } else if (this.currentPlayer === 'iframe' && this.iframePlayer && this.isIframeReady) {
            this.iframePlayer.seekTo(seconds, true);
        }
    }
    
    /**
     * Set volume (0-100)
     */
    setVolume(volume) {
        if (this.currentPlayer === 'direct') {
            this.directPlayer.volume = volume / 100;
        } else if (this.currentPlayer === 'iframe' && this.iframePlayer && this.isIframeReady) {
            this.iframePlayer.setVolume(volume);
        }
    }
    
    /**
     * Get player state
     */
    getPlayerState() {
        if (this.currentPlayer === 'direct') {
            if (this.directPlayer.paused) {
                return 2; // Paused
            } else if (this.directPlayer.ended) {
                return 0; // Ended
            } else {
                return 1; // Playing
            }
        } else if (this.currentPlayer === 'iframe' && this.iframePlayer && this.isIframeReady) {
            return this.iframePlayer.getPlayerState();
        }
        return -1; // Unstarted
    }
    
    /**
     * Check if player is ready
     */
    isPlayerReady() {
        if (this.currentPlayer === 'direct') {
            return this.directPlayer.readyState >= 3; // HAVE_FUTURE_DATA
        } else if (this.currentPlayer === 'iframe') {
            return this.isIframeReady;
        }
        return false;
    }
    
    /**
     * Show loading spinner
     */
    showLoading() {
        this.loadingSpinner.classList.remove('hidden');
    }
    
    /**
     * Hide loading spinner
     */
    hideLoading() {
        this.loadingSpinner.classList.add('hidden');
    }
    
    /**
     * Show error message
     */
    showError() {
        this.errorMessage.classList.remove('hidden');
    }
    
    /**
     * Hide error message
     */
    hideError() {
        this.errorMessage.classList.add('hidden');
    }
}

// Create global instance
const videoPlayerManager = new VideoPlayerManager();

// YouTube IFrame API ready callback
window.onYouTubeIframeAPIReady = function() {
    console.log('[VideoPlayerManager] YouTube IFrame API Ready');
};

// Export API for game.js (backward compatible interface)
window.youtubeAPI = {
    playVideo: (videoId) => videoPlayerManager.playVideo(videoId),
    pauseVideo: () => videoPlayerManager.pauseVideo(),
    stopVideo: () => videoPlayerManager.stopVideo(),
    resumeVideo: () => videoPlayerManager.resumeVideo(),
    getCurrentTime: () => videoPlayerManager.getCurrentTime(),
    getDuration: () => videoPlayerManager.getDuration(),
    seekTo: (seconds) => videoPlayerManager.seekTo(seconds),
    setVolume: (volume) => videoPlayerManager.setVolume(volume),
    getPlayerState: () => videoPlayerManager.getPlayerState(),
    isPlayerReady: () => videoPlayerManager.isPlayerReady()
};

console.log('[VideoPlayerManager] Module loaded, youtubeAPI exported');
