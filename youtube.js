// YouTube Player Integration
let youtubePlayer = null;
let isPlayerReady = false;
let currentVideoErrorHandler = null;

// This function is called by YouTube IFrame API when ready
window.onYouTubeIframeAPIReady = function() {
    console.log('YouTube IFrame API Ready');
};

// Initialize YouTube Player
function initYouTubePlayer(videoId) {
    return new Promise((resolve, reject) => {
        if (youtubePlayer) {
            youtubePlayer.loadVideoById(videoId);
            resolve(youtubePlayer);
            return;
        }

        youtubePlayer = new YT.Player('youtube-player', {
            height: '620',
            width: '1100',
            videoId: videoId,
            playerVars: {
                'autoplay': 1,
                'controls': 1,
                'disablekb': 0,
                'modestbranding': 1,
                'rel': 0,
                'showinfo': 0,
                'iv_load_policy': 3
            },
            events: {
                'onReady': (event) => {
                    isPlayerReady = true;
                    console.log('YouTube Player Ready');
                    resolve(youtubePlayer);
                },
                'onError': (error) => {
                    console.error('YouTube Player Error:', error);
                    if (currentVideoErrorHandler) {
                        currentVideoErrorHandler(error);
                    }
                },
                'onStateChange': (event) => {
                    if (event.data === YT.PlayerState.ENDED) {
                        console.log('Video ended');
                    }
                }
            }
        });
    });
}

// Play a video
async function playVideo(videoId) {
    return new Promise(async (resolve, reject) => {
        // Set up error handler for this video
        currentVideoErrorHandler = (error) => {
            currentVideoErrorHandler = null;
            reject(new Error('Video failed to load'));
        };

        // Set a timeout to detect if video loads successfully
        const successTimeout = setTimeout(() => {
            currentVideoErrorHandler = null;
            resolve();
        }, 3000); // If no error after 3 seconds, consider it successful

        try {
            if (!youtubePlayer) {
                await initYouTubePlayer(videoId);
            } else {
                youtubePlayer.loadVideoById(videoId);
            }
        } catch (error) {
            clearTimeout(successTimeout);
            currentVideoErrorHandler = null;
            console.error('Error playing video:', error);
            reject(error);
        }
    });
}

// Pause video
function pauseVideo() {
    if (youtubePlayer && isPlayerReady) {
        youtubePlayer.pauseVideo();
    }
}

// Stop video
function stopVideo() {
    if (youtubePlayer && isPlayerReady) {
        youtubePlayer.stopVideo();
    }
}

// Export functions for use in game.js
window.youtubeAPI = {
    playVideo,
    pauseVideo,
    stopVideo,
    isPlayerReady: () => isPlayerReady
};
