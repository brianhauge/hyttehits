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

// Song Database - Popular songs from 2016-2025
// Format: { title, artist, year, videoId }
const songDatabase = [
    // 2016
    { title: "Closer", artist: "The Chainsmokers ft. Halsey", year: 2016, videoId: "PT2_F-1esPk" },
    { title: "One Dance", artist: "Drake ft. WizKid & Kyla", year: 2016, videoId: "eRTWCG0IlF0" },
    { title: "Cheap Thrills", artist: "Sia", year: 2016, videoId: "nYh-n7EOtma" },
    { title: "Don't Let Me Down", artist: "The Chainsmokers", year: 2016, videoId: "Io0fBr1XBUA" },
    { title: "Cold Water", artist: "Major Lazer ft. Justin Bieber", year: 2016, videoId: "a59gmGkq_pw" },
    { title: "Work", artist: "Rihanna ft. Drake", year: 2016, videoId: "HL1UzIK-flA" },
    { title: "Stressed Out", artist: "Twenty One Pilots", year: 2016, videoId: "pXRviuL6vMY" },
    { title: "This Is What You Came For", artist: "Calvin Harris ft. Rihanna", year: 2016, videoId: "kOkQ4T-7XTs" },
    
    // 2017
    { title: "Shape of You", artist: "Ed Sheeran", year: 2017, videoId: "JGwWNGJdvx8" },
    { title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", year: 2017, videoId: "kJQP7kiw5Fk" },
    { title: "Something Just Like This", artist: "The Chainsmokers & Coldplay", year: 2017, videoId: "FM7MFYoylVs" },
    { title: "Humble", artist: "Kendrick Lamar", year: 2017, videoId: "tvTRZJ-4EyI" },
    { title: "That's What I Like", artist: "Bruno Mars", year: 2017, videoId: "PMivT7MJ41M" },
    { title: "Believer", artist: "Imagine Dragons", year: 2017, videoId: "7wtfhZwyrcc" },
    { title: "Rockstar", artist: "Post Malone ft. 21 Savage", year: 2017, videoId: "UceaB4D0jpo" },
    { title: "Stay", artist: "Zedd & Alessia Cara", year: 2017, videoId: "h--P8HzYZ74" },
    
    // 2018
    { title: "God's Plan", artist: "Drake", year: 2018, videoId: "xpVfcZ0ZcFM" },
    { title: "Perfect", artist: "Ed Sheeran", year: 2018, videoId: "2Vv-BfVoq4g" },
    { title: "Havana", artist: "Camila Cabello", year: 2018, videoId: "HCjNJDNzw8Y" },
    { title: "In My Feelings", artist: "Drake", year: 2018, videoId: "DRS_PpOrUZ4" },
    { title: "Girls Like You", artist: "Maroon 5 ft. Cardi B", year: 2018, videoId: "aJOTlE1K90k" },
    { title: "Psycho", artist: "Post Malone ft. Ty Dolla Sign", year: 2018, videoId: "au2n7VVGv_c" },
    { title: "Better Now", artist: "Post Malone", year: 2018, videoId: "UYwF-jdcVjY" },
    { title: "This Is America", artist: "Childish Gambino", year: 2018, videoId: "VYOjWnS4cMY" },
    
    // 2019
    { title: "Old Town Road", artist: "Lil Nas X ft. Billy Ray Cyrus", year: 2019, videoId: "r7qovpFAGrQ" },
    { title: "Sunflower", artist: "Post Malone & Swae Lee", year: 2019, videoId: "ApXoWvfEYVU" },
    { title: "Bad Guy", artist: "Billie Eilish", year: 2019, videoId: "DyDfgMOUjCI" },
    { title: "Señorita", artist: "Shawn Mendes & Camila Cabello", year: 2019, videoId: "Pkh8UtuejGw" },
    { title: "Truth Hurts", artist: "Lizzo", year: 2019, videoId: "P00HMxdsVZI" },
    { title: "Someone You Loved", artist: "Lewis Capaldi", year: 2019, videoId: "zABLecsR5UE" },
    { title: "Sucker", artist: "Jonas Brothers", year: 2019, videoId: "CnAmeh0-E-U" },
    { title: "7 Rings", artist: "Ariana Grande", year: 2019, videoId: "QYh6mYIJG2Y" },
    
    // 2020
    { title: "Blinding Lights", artist: "The Weeknd", year: 2020, videoId: "4NRXx6U8ABQ" },
    { title: "Watermelon Sugar", artist: "Harry Styles", year: 2020, videoId: "E07s5ZYygMg" },
    { title: "Savage Love", artist: "Jawsh 685 & Jason Derulo", year: 2020, videoId: "QLBu2PUkaYM" },
    { title: "Rockstar", artist: "DaBaby ft. Roddy Ricch", year: 2020, videoId: "mxFstYW6-sg" },
    { title: "Dance Monkey", artist: "Tones and I", year: 2020, videoId: "q0hyYWKXF0Q" },
    { title: "Say So", artist: "Doja Cat", year: 2020, videoId: "pok8H_KF1FA" },
    { title: "Don't Start Now", artist: "Dua Lipa", year: 2020, videoId: "oygrmJFKYZY" },
    { title: "Circles", artist: "Post Malone", year: 2020, videoId: "wXhTHyIgQ_U" },
    
    // 2021
    { title: "Levitating", artist: "Dua Lipa", year: 2021, videoId: "TUVcZfQe-Kw" },
    { title: "Good 4 U", artist: "Olivia Rodrigo", year: 2021, videoId: "gNi_6U5Pm_o" },
    { title: "Montero (Call Me By Your Name)", artist: "Lil Nas X", year: 2021, videoId: "6swmTBVI83k" },
    { title: "Stay", artist: "The Kid LAROI & Justin Bieber", year: 2021, videoId: "kTJczUoc26U" },
    { title: "Peaches", artist: "Justin Bieber ft. Daniel Caesar & Giveon", year: 2021, videoId: "tQ0yjYUFKAE" },
    { title: "Save Your Tears", artist: "The Weeknd", year: 2021, videoId: "XXYlFuWEuKI" },
    { title: "Kiss Me More", artist: "Doja Cat ft. SZA", year: 2021, videoId: "0EVVKs6DQLo" },
    { title: "Drivers License", artist: "Olivia Rodrigo", year: 2021, videoId: "ZmDBbnmKpqQ" },
    
    // 2022
    { title: "Heat Waves", artist: "Glass Animals", year: 2022, videoId: "mRD0-GxqHVo" },
    { title: "As It Was", artist: "Harry Styles", year: 2022, videoId: "H5v3kku4y6Q" },
    { title: "STAY", artist: "The Kid LAROI & Justin Bieber", year: 2022, videoId: "kTJczUoc26U" },
    { title: "Anti-Hero", artist: "Taylor Swift", year: 2022, videoId: "b1kbLwvqugk" },
    { title: "Unholy", artist: "Sam Smith & Kim Petras", year: 2022, videoId: "Uq9gPaIzbe8" },
    { title: "I'm Good (Blue)", artist: "David Guetta & Bebe Rexha", year: 2022, videoId: "90RLzVUuXe4" },
    { title: "Running Up That Hill", artist: "Kate Bush", year: 2022, videoId: "wp43OdtAAkM" },
    { title: "About Damn Time", artist: "Lizzo", year: 2022, videoId: "SLjnq2BiGbE" },
    
    // 2023
    { title: "Flowers", artist: "Miley Cyrus", year: 2023, videoId: "G7KNmW9a75Y" },
    { title: "Kill Bill", artist: "SZA", year: 2023, videoId: "aLZ8xWEGh3g" },
    { title: "Vampire", artist: "Olivia Rodrigo", year: 2023, videoId: "RlPNh_PBZb4" },
    { title: "Paint The Town Red", artist: "Doja Cat", year: 2023, videoId: "UxESd61h8uI" },
    { title: "Cruel Summer", artist: "Taylor Swift", year: 2023, videoId: "ic8j13piAhQ" },
    { title: "What Was I Made For?", artist: "Billie Eilish", year: 2023, videoId: "j5FweitwAQ8" },
    { title: "Dance The Night", artist: "Dua Lipa", year: 2023, videoId: "RuRLz0pXcKU" },
    { title: "Blinding Lights", artist: "The Weeknd", year: 2023, videoId: "4NRXx6U8ABQ" },
    
    // 2024
    { title: "Espresso", artist: "Sabrina Carpenter", year: 2024, videoId: "eVli-tstM5E" },
    { title: "Please Please Please", artist: "Sabrina Carpenter", year: 2024, videoId: "cF1Na4AIecM" },
    { title: "Beautiful Things", artist: "Benson Boone", year: 2024, videoId: "Oa_RSwwpPaA" },
    { title: "Fortnight", artist: "Taylor Swift ft. Post Malone", year: 2024, videoId: "q3zkkD89qFk" },
    { title: "Not Like Us", artist: "Kendrick Lamar", year: 2024, videoId: "mJCW3blrHsw" },
    { title: "Birds of a Feather", artist: "Billie Eilish", year: 2024, videoId: "a6FdJz4oBPg" },
    { title: "Good Luck, Babe!", artist: "Chappell Roan", year: 2024, videoId: "xYk3RHWxVkE" },
    { title: "Too Sweet", artist: "Hozier", year: 2024, videoId: "EUb0LyKTaQE" },
    
    // 2025 (recent releases)
    { title: "Die With A Smile", artist: "Lady Gaga & Bruno Mars", year: 2025, videoId: "kPa7bsKwL-c" },
    { title: "APT.", artist: "ROSÉ & Bruno Mars", year: 2025, videoId: "ekr2nIex040" },
    { title: "Lose Control", artist: "Teddy Swims", year: 2025, videoId: "cS3pHKuroIw" },
    { title: "Noid", artist: "Tyler, The Creator", year: 2025, videoId: "oid1Ybi8vy8" },
];

// Export functions for use in game.js
window.youtubeAPI = {
    playVideo,
    pauseVideo,
    stopVideo,
    songDatabase,
    isPlayerReady: () => isPlayerReady
};
