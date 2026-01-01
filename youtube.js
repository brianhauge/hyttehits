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
    { title: "Can't Stop the Feeling!", artist: "Justin Timberlake", year: 2016, videoId: "ru0K8uYEZWw" },
    { title: "Ride", artist: "Twenty One Pilots", year: 2016, videoId: "Pw-0pbY9JeU" },
    { title: "Vesterbro", artist: "Lukas Graham", year: 2016, videoId: "iGjQPZa4KyE" },
    { title: "Natteravn", artist: "Suspekt", year: 2016, videoId: "r_4fJmRJGtg" },
    
    // 2017
    { title: "Shape of You", artist: "Ed Sheeran", year: 2017, videoId: "JGwWNGJdvx8" },
    { title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", year: 2017, videoId: "kJQP7kiw5Fk" },
    { title: "Something Just Like This", artist: "The Chainsmokers & Coldplay", year: 2017, videoId: "FM7MFYoylVs" },
    { title: "Humble", artist: "Kendrick Lamar", year: 2017, videoId: "tvTRZJ-4EyI" },
    { title: "That's What I Like", artist: "Bruno Mars", year: 2017, videoId: "PMivT7MJ41M" },
    { title: "Believer", artist: "Imagine Dragons", year: 2017, videoId: "7wtfhZwyrcc" },
    { title: "Rockstar", artist: "Post Malone ft. 21 Savage", year: 2017, videoId: "UceaB4D0jpo" },
    { title: "Stay", artist: "Zedd & Alessia Cara", year: 2017, videoId: "h--P8HzYZ74" },
    { title: "Look What You Made Me Do", artist: "Taylor Swift", year: 2017, videoId: "3tmd-ClpJxA" },
    { title: "Havana", artist: "Camila Cabello", year: 2017, videoId: "HCjNJDNzw8Y" },
    { title: "Thunder", artist: "Imagine Dragons", year: 2017, videoId: "fKopy74weus" },
    { title: "New Rules", artist: "Dua Lipa", year: 2017, videoId: "k2qgadSvNyU" },
    { title: "Langt Ude", artist: "Kesi", year: 2017, videoId: "cXMT57f8e1w" },
    { title: "Higher", artist: "MØ", year: 2017, videoId: "p_IIpOnuJVc" },
    
    // 2018
    { title: "God's Plan", artist: "Drake", year: 2018, videoId: "xpVfcZ0ZcFM" },
    { title: "Perfect", artist: "Ed Sheeran", year: 2018, videoId: "2Vv-BfVoq4g" },
    { title: "Havana", artist: "Camila Cabello", year: 2018, videoId: "HCjNJDNzw8Y" },
    { title: "In My Feelings", artist: "Drake", year: 2018, videoId: "DRS_PpOrUZ4" },
    { title: "Girls Like You", artist: "Maroon 5 ft. Cardi B", year: 2018, videoId: "aJOTlE1K90k" },
    { title: "Psycho", artist: "Post Malone ft. Ty Dolla Sign", year: 2018, videoId: "au2n7VVGv_c" },
    { title: "Better Now", artist: "Post Malone", year: 2018, videoId: "UYwF-jdcVjY" },
    { title: "This Is America", artist: "Childish Gambino", year: 2018, videoId: "VYOjWnS4cMY" },
    { title: "Delicate", artist: "Taylor Swift", year: 2018, videoId: "tCXGJQYZ9JA" },
    { title: "Without Me", artist: "Halsey", year: 2018, videoId: "ZAfAud_M_mg" },
    { title: "High Hopes", artist: "Panic! At The Disco", year: 2018, videoId: "IPXIgEAGe4U" },
    { title: "Shallow", artist: "Lady Gaga & Bradley Cooper", year: 2018, videoId: "bo_efYhYU2A" },
    { title: "Tir", artist: "Gilli", year: 2018, videoId: "2iD23M1xVqU" },
    { title: "Champagne", artist: "Scarlett Pleasure", year: 2018, videoId: "1AqcRJ1MbNk" },
    
    // 2019
    { title: "Old Town Road", artist: "Lil Nas X ft. Billy Ray Cyrus", year: 2019, videoId: "r7qovpFAGrQ" },
    { title: "Sunflower", artist: "Post Malone & Swae Lee", year: 2019, videoId: "ApXoWvfEYVU" },
    { title: "Bad Guy", artist: "Billie Eilish", year: 2019, videoId: "DyDfgMOUjCI" },
    { title: "Señorita", artist: "Shawn Mendes & Camila Cabello", year: 2019, videoId: "Pkh8UtuejGw" },
    { title: "Truth Hurts", artist: "Lizzo", year: 2019, videoId: "P00HMxdsVZI" },
    { title: "Someone You Loved", artist: "Lewis Capaldi", year: 2019, videoId: "zABLecsR5UE" },
    { title: "Sucker", artist: "Jonas Brothers", year: 2019, videoId: "CnAmeh0-E-U" },
    { title: "7 Rings", artist: "Ariana Grande", year: 2019, videoId: "QYh6mYIJG2Y" },
    { title: "ME!", artist: "Taylor Swift ft. Brendon Urie", year: 2019, videoId: "FuXNumBwDOM" },
    { title: "You Need to Calm Down", artist: "Taylor Swift", year: 2019, videoId: "Dkk9gvTmCXY" },
    { title: "Lover", artist: "Taylor Swift", year: 2019, videoId: "e-ORhEE9VVg" },
    { title: "Before You Go", artist: "Lewis Capaldi", year: 2019, videoId: "Jhhnmx4rM0o" },
    { title: "Bruises", artist: "Lewis Capaldi", year: 2019, videoId: "Oe_FsKJVOv4" },
    { title: "Memories", artist: "Maroon 5", year: 2019, videoId: "SlPhMPnQ58k" },
    { title: "Beautiful People", artist: "Ed Sheeran ft. Khalid", year: 2019, videoId: "mj0XInqZMHY" },
    { title: "Læg Ikke Mærke Til Mig", artist: "Soleima", year: 2019, videoId: "a7PmC1p1_7w" },
    
    // 2020
    { title: "Blinding Lights", artist: "The Weeknd", year: 2020, videoId: "4NRXx6U8ABQ" },
    { title: "Watermelon Sugar", artist: "Harry Styles", year: 2020, videoId: "E07s5ZYygMg" },
    { title: "Savage Love", artist: "Jawsh 685 & Jason Derulo", year: 2020, videoId: "QLBu2PUkaYM" },
    { title: "Rockstar", artist: "DaBaby ft. Roddy Ricch", year: 2020, videoId: "mxFstYW6-sg" },
    { title: "Dance Monkey", artist: "Tones and I", year: 2020, videoId: "q0hyYWKXF0Q" },
    { title: "Say So", artist: "Doja Cat", year: 2020, videoId: "pok8H_KF1FA" },
    { title: "Don't Start Now", artist: "Dua Lipa", year: 2020, videoId: "oygrmJFKYZY" },
    { title: "Circles", artist: "Post Malone", year: 2020, videoId: "wXhTHyIgQ_U" },
    { title: "Cardigan", artist: "Taylor Swift", year: 2020, videoId: "K-a8s8OLBSE" },
    { title: "Willow", artist: "Taylor Swift", year: 2020, videoId: "RsEZmictANA" },
    { title: "Break My Heart", artist: "Dua Lipa", year: 2020, videoId: "Nj2U6rhnucI" },
    { title: "The Box", artist: "Roddy Ricch", year: 2020, videoId: "uLHqpjW3aDs" },
    { title: "Rain On Me", artist: "Lady Gaga & Ariana Grande", year: 2020, videoId: "AoAm4om0wTs" },
    { title: "Physical", artist: "Dua Lipa", year: 2020, videoId: "9HDEHj2yzew" },
    { title: "Guld og Grønne Skove", artist: "Erika de Casier", year: 2020, videoId: "7fKFR8WqjsQ" },
    
    // 2021
    { title: "Levitating", artist: "Dua Lipa", year: 2021, videoId: "TUVcZfQe-Kw" },
    { title: "Good 4 U", artist: "Olivia Rodrigo", year: 2021, videoId: "gNi_6U5Pm_o" },
    { title: "Montero (Call Me By Your Name)", artist: "Lil Nas X", year: 2021, videoId: "6swmTBVI83k" },
    { title: "Stay", artist: "The Kid LAROI & Justin Bieber", year: 2021, videoId: "kTJczUoc26U" },
    { title: "Peaches", artist: "Justin Bieber ft. Daniel Caesar & Giveon", year: 2021, videoId: "tQ0yjYUFKAE" },
    { title: "Save Your Tears", artist: "The Weeknd", year: 2021, videoId: "XXYlFuWEuKI" },
    { title: "Kiss Me More", artist: "Doja Cat ft. SZA", year: 2021, videoId: "0EVVKs6DQLo" },
    { title: "Drivers License", artist: "Olivia Rodrigo", year: 2021, videoId: "ZmDBbnmKpqQ" },
    { title: "All Too Well (10 Minute Version)", artist: "Taylor Swift", year: 2021, videoId: "tollGa3S0o8" },
    { title: "Traitor", artist: "Olivia Rodrigo", year: 2021, videoId: "KphB3WaqFWY" },
    { title: "Deja Vu", artist: "Olivia Rodrigo", year: 2021, videoId: "qMH0Xze0XJA" },
    { title: "Happier Than Ever", artist: "Billie Eilish", year: 2021, videoId: "5GJWxDKyk3A" },
    { title: "Industry Baby", artist: "Lil Nas X ft. Jack Harlow", year: 2021, videoId: "UTHLKHL_whs" },
    { title: "Shivers", artist: "Ed Sheeran", year: 2021, videoId: "Il0S8BoucSA" },
    { title: "Heat Waves", artist: "Glass Animals", year: 2021, videoId: "mRD0-GxqHVo" },
    { title: "Alt Det Jeg Ville Have Sagt", artist: "Sanne Salomonsen", year: 2021, videoId: "YsCxHF3gX-s" },
    
    // 2022
    { title: "Heat Waves", artist: "Glass Animals", year: 2022, videoId: "mRD0-GxqHVo" },
    { title: "As It Was", artist: "Harry Styles", year: 2022, videoId: "H5v3kku4y6Q" },
    { title: "Anti-Hero", artist: "Taylor Swift", year: 2022, videoId: "b1kbLwvqugk" },
    { title: "Unholy", artist: "Sam Smith & Kim Petras", year: 2022, videoId: "Uq9gPaIzbe8" },
    { title: "I'm Good (Blue)", artist: "David Guetta & Bebe Rexha", year: 2022, videoId: "90RLzVUuXe4" },
    { title: "Running Up That Hill", artist: "Kate Bush", year: 2022, videoId: "wp43OdtAAkM" },
    { title: "About Damn Time", artist: "Lizzo", year: 2022, videoId: "SLjnq2BiGbE" },
    { title: "Lavender Haze", artist: "Taylor Swift", year: 2022, videoId: "jBwWy-YciUQ" },
    { title: "Bad Habit", artist: "Steve Lacy", year: 2022, videoId: "VF-FGf_ZZiI" },
    { title: "Super Freaky Girl", artist: "Nicki Minaj", year: 2022, videoId: "3aPqFCJ2jW4" },
    { title: "Cold Heart", artist: "Elton John & Dua Lipa", year: 2022, videoId: "qod03PVTLqk" },
    { title: "Until I Found You", artist: "Stephen Sanchez", year: 2022, videoId: "jVQMEIjKfD4" },
    { title: "Tabita", artist: "Natasja", year: 2022, videoId: "K6lXaJqMzFw" },
    
    // 2023
    { title: "Flowers", artist: "Miley Cyrus", year: 2023, videoId: "G7KNmW9a75Y" },
    { title: "Kill Bill", artist: "SZA", year: 2023, videoId: "aLZ8xWEGh3g" },
    { title: "Vampire", artist: "Olivia Rodrigo", year: 2023, videoId: "RlPNh_PBZb4" },
    { title: "Paint The Town Red", artist: "Doja Cat", year: 2023, videoId: "UxESd61h8uI" },
    { title: "Cruel Summer", artist: "Taylor Swift", year: 2023, videoId: "ic8j13piAhQ" },
    { title: "What Was I Made For?", artist: "Billie Eilish", year: 2023, videoId: "j5FweitwAQ8" },
    { title: "Dance The Night", artist: "Dua Lipa", year: 2023, videoId: "RuRLz0pXcKU" },
    { title: "Karma", artist: "Taylor Swift", year: 2023, videoId: "JmnjJ12s4Z8" },
    { title: "Get Lucky", artist: "Olivia Rodrigo", year: 2023, videoId: "uV_mEK5MXck" },
    { title: "Greedy", artist: "Tate McRae", year: 2023, videoId: "I_KftYFoyGs" },
    { title: "Snooze", artist: "SZA", year: 2023, videoId: "6ZUIwj3FgUY" },
    { title: "Strangers", artist: "Kenya Grace", year: 2023, videoId: "eU3vQEYct_0" },
    { title: "Water", artist: "Tyla", year: 2023, videoId: "7aKVdLZtUMQ" },
    { title: "Størst Af Alt", artist: "Burhan G ft. Medina", year: 2023, videoId: "o3pWzxlI_p8" },
    { title: "Det Modsatte", artist: "Mumle", year: 2023, videoId: "mjUGJPkumhQ" },
    
    // 2024
    { title: "Espresso", artist: "Sabrina Carpenter", year: 2024, videoId: "eVli-tstM5E" },
    { title: "Please Please Please", artist: "Sabrina Carpenter", year: 2024, videoId: "cF1Na4AIecM" },
    { title: "Beautiful Things", artist: "Benson Boone", year: 2024, videoId: "Oa_RSwwpPaA" },
    { title: "Fortnight", artist: "Taylor Swift ft. Post Malone", year: 2024, videoId: "q3zkkD89qFk" },
    { title: "Not Like Us", artist: "Kendrick Lamar", year: 2024, videoId: "mJCW3blrHsw" },
    { title: "Birds of a Feather", artist: "Billie Eilish", year: 2024, videoId: "a6FdJz4oBPg" },
    { title: "Good Luck, Babe!", artist: "Chappell Roan", year: 2024, videoId: "xYk3RHWxVkE" },
    { title: "Too Sweet", artist: "Hozier", year: 2024, videoId: "EUb0LyKTaQE" },
    { title: "I Can Do It With a Broken Heart", artist: "Taylor Swift", year: 2024, videoId: "4M46TThCu5c" },
    { title: "Stargazing", artist: "Myles Smith", year: 2024, videoId: "YVvQHzbJ5So" },
    { title: "Taste", artist: "Sabrina Carpenter", year: 2024, videoId: "I-haJoDkWTA" },
    { title: "Obsessed", artist: "Olivia Rodrigo", year: 2024, videoId: "XrMxSFAxSYM" },
    { title: "Nosedive", artist: "Post Malone ft. Lainey Wilson", year: 2024, videoId: "Ry08sXMj1C8" },
    { title: "Sailor Song", artist: "Gigi Perez", year: 2024, videoId: "vPDlFECPqzE" },
    { title: "Du Er Min", artist: "Hej Matematik ft. Soleima", year: 2024, videoId: "m0qXr6RI3KY" },
    { title: "Hvor Solen Ik' Skinner", artist: "Mumle", year: 2024, videoId: "af-tBLYiqko" },
    
    // 2025 (recent releases)
    { title: "Die With A Smile", artist: "Lady Gaga & Bruno Mars", year: 2025, videoId: "kPa7bsKwL-c" },
    { title: "APT.", artist: "ROSÉ & Bruno Mars", year: 2025, videoId: "ekr2nIex040" },
    { title: "Lose Control", artist: "Teddy Swims", year: 2025, videoId: "cS3pHKuroIw" },
    { title: "Noid", artist: "Tyler, The Creator", year: 2025, videoId: "oid1Ybi8vy8" },
    { title: "Guilty as Sin?", artist: "Taylor Swift", year: 2025, videoId: "0zAcB-pxLNU" },
    { title: "Aften", artist: "Soleima", year: 2025, videoId: "8gFLZx0X6xE" },
    { title: "Fire Uger", artist: "Mumle", year: 2025, videoId: "p6Q1xQ_Z_Jw" },
];

// Classic song database (1925-2025, focus on 1970-2005)
const classicSongDatabase = [
    // 1950s
    { title: "Singin' in the Rain", artist: "Gene Kelly", year: 1952, videoId: "D1ZYhVpdXbQ" },
    { title: "Rock Around the Clock", artist: "Bill Haley & His Comets", year: 1954, videoId: "ZgdufzXvjqw" },
    { title: "Johnny B. Goode", artist: "Chuck Berry", year: 1958, videoId: "ZFo8-JqzSCM" },
    { title: "Great Balls of Fire", artist: "Jerry Lee Lewis", year: 1957, videoId: "7IjgZGhHrYY" },
    { title: "La Bamba", artist: "Ritchie Valens", year: 1958, videoId: "Jp6j5HJ-Cok" },
    { title: "Jailhouse Rock", artist: "Elvis Presley", year: 1957, videoId: "gj0Rz-uP4Mk" },
    { title: "Hound Dog", artist: "Elvis Presley", year: 1956, videoId: "MMmfjSZ_h1s" },
    { title: "All Shook Up", artist: "Elvis Presley", year: 1957, videoId: "217dCdpZ9lM" },
    
    // 1960s
    { title: "Stand by Me", artist: "Ben E. King", year: 1961, videoId: "hwZNL7QVJjE" },
    { title: "The Twist", artist: "Chubby Checker", year: 1960, videoId: "im9XuJJXylw" },
    { title: "Can't Help Falling in Love", artist: "Elvis Presley", year: 1961, videoId: "vGJTaP6anOU" },
    { title: "I Want to Hold Your Hand", artist: "The Beatles", year: 1963, videoId: "jenWdylTtzs" },
    { title: "She Loves You", artist: "The Beatles", year: 1963, videoId: "pRdRg_vwcF8" },
    { title: "Fly Me to the Moon", artist: "Frank Sinatra", year: 1964, videoId: "ZEcqHA7dbwM" },
    { title: "My Girl", artist: "The Temptations", year: 1964, videoId: "6IUG-9jZxHQ" },
    { title: "I Got You (I Feel Good)", artist: "James Brown", year: 1965, videoId: "U5TqIdff_DQ" },
    { title: "Good Vibrations", artist: "The Beach Boys", year: 1966, videoId: "Eab_beh07HU" },
    { title: "What a Wonderful World", artist: "Louis Armstrong", year: 1967, videoId: "VqhCQZaH4Vs" },
    { title: "Respect", artist: "Aretha Franklin", year: 1967, videoId: "6FOUqQt3Kg0" },
    { title: "Light My Fire", artist: "The Doors", year: 1967, videoId: "deB_u-to-IE" },
    { title: "Hey Jude", artist: "The Beatles", year: 1968, videoId: "A_MjCqQoLLA" },
    { title: "I Heard It Through the Grapevine", artist: "Marvin Gaye", year: 1968, videoId: "hajBdDM2qdg" },
    { title: "Let It Be", artist: "The Beatles", year: 1970, videoId: "QDYfEBY9NM4" },
    { title: "Here Comes the Sun", artist: "The Beatles", year: 1969, videoId: "KQetemT1sWc" },
    { title: "Come Together", artist: "The Beatles", year: 1969, videoId: "_HONxwhwmgU" },
    
    // 1970s
    { title: "Imagine", artist: "John Lennon", year: 1971, videoId: "YkgkThdzX-8" },
    { title: "Stairway to Heaven", artist: "Led Zeppelin", year: 1971, videoId: "QkF3oxziUI4" },
    { title: "American Pie", artist: "Don McLean", year: 1971, videoId: "uAsV5-Hv-7U" },
    { title: "Superstition", artist: "Stevie Wonder", year: 1972, videoId: "0CFuCYNx-1g" },
    { title: "Hotel California", artist: "Eagles", year: 1976, videoId: "EqPtz5qN7HM" },
    { title: "Bohemian Rhapsody", artist: "Queen", year: 1975, videoId: "fJ9rUzIMcZQ" },
    { title: "Wish You Were Here", artist: "Pink Floyd", year: 1975, videoId: "IXdNnw99-Ic" },
    { title: "Dancing Queen", artist: "ABBA", year: 1976, videoId: "xFrGuyw1V8s" },
    { title: "Stayin' Alive", artist: "Bee Gees", year: 1977, videoId: "fNFzfwLM72c" },
    { title: "Le Freak", artist: "Chic", year: 1978, videoId: "h1qQ1SKNlgY" },
    { title: "YMCA", artist: "Village People", year: 1978, videoId: "CS9OO0S5w2k" },
    { title: "Don't Stop Me Now", artist: "Queen", year: 1979, videoId: "HgzGwKwLmgM" },
    { title: "I Will Survive", artist: "Gloria Gaynor", year: 1979, videoId: "gYkACVDFmeg" },
    { title: "We Will Rock You", artist: "Queen", year: 1977, videoId: "-tJYN-eG1zk" },
    { title: "September", artist: "Earth, Wind & Fire", year: 1978, videoId: "Gs069dndIYk" },
    { title: "Heart of Glass", artist: "Blondie", year: 1979, videoId: "WGU_4-5RaxU" },
    { title: "You're the One That I Want", artist: "John Travolta & Olivia Newton-John", year: 1978, videoId: "7oKPYe53h78" },
    { title: "December, 1963", artist: "Frankie Valli & The Four Seasons", year: 1975, videoId: "liyiT_DGREA" },
    { title: "More Than a Feeling", artist: "Boston", year: 1976, videoId: "SSR6ZzjDZ94" },
    { title: "Go Your Own Way", artist: "Fleetwood Mac", year: 1977, videoId: "6ul-cZyuYq4" },
    
    // 1980s
    { title: "Another One Bites the Dust", artist: "Queen", year: 1980, videoId: "rY0WxgSXdEE" },
    { title: "Call Me", artist: "Blondie", year: 1980, videoId: "StKVS0eI85I" },
    { title: "Celebration", artist: "Kool & The Gang", year: 1980, videoId: "3GwjfUFyY6M" },
    { title: "Don't You Want Me", artist: "The Human League", year: 1981, videoId: "uPudE8nDog0" },
    { title: "Don't Stop Believin'", artist: "Journey", year: 1981, videoId: "1k8craCGpgs" },
    { title: "Physical", artist: "Olivia Newton-John", year: 1981, videoId: "vWz9VN40nCA" },
    { title: "Eye of the Tiger", artist: "Survivor", year: 1982, videoId: "btPJPFnesV4" },
    { title: "Billie Jean", artist: "Michael Jackson", year: 1982, videoId: "Zi_XLOBDo_Y" },
    { title: "Thriller", artist: "Michael Jackson", year: 1982, videoId: "sOnqjkJTMaA" },
    { title: "Beat It", artist: "Michael Jackson", year: 1982, videoId: "oRdxUFDoQe0" },
    { title: "Africa", artist: "Toto", year: 1982, videoId: "FTQbiNvZqaY" },
    { title: "Hungry Like the Wolf", artist: "Duran Duran", year: 1982, videoId: "oJL-lCzEXgI" },
    { title: "Don't You (Forget About Me)", artist: "Simple Minds", year: 1985, videoId: "CdqoNKCCt7A" },
    { title: "Sweet Dreams", artist: "Eurythmics", year: 1983, videoId: "qeMFqkcPYcg" },
    { title: "Karma Chameleon", artist: "Culture Club", year: 1983, videoId: "JmcA9LIIXWw" },
    { title: "Every Breath You Take", artist: "The Police", year: 1983, videoId: "OMOGaugKpzs" },
    { title: "Girls Just Want to Have Fun", artist: "Cyndi Lauper", year: 1983, videoId: "PIb6AZdTr-A" },
    { title: "Total Eclipse of the Heart", artist: "Bonnie Tyler", year: 1983, videoId: "lcOxhH8N3Bo" },
    { title: "Like a Virgin", artist: "Madonna", year: 1984, videoId: "s__rX_WL100" },
    { title: "Purple Rain", artist: "Prince", year: 1984, videoId: "TvnYmWpD_T8" },
    { title: "When Doves Cry", artist: "Prince", year: 1984, videoId: "UG3VcCAlUgE" },
    { title: "Footloose", artist: "Kenny Loggins", year: 1984, videoId: "wFWDGTVYqE8" },
    { title: "What's Love Got to Do with It", artist: "Tina Turner", year: 1984, videoId: "oGpFcHTxjZs" },
    { title: "Take On Me", artist: "a-ha", year: 1985, videoId: "djV11Xbc914" },
    { title: "Careless Whisper", artist: "Wham!", year: 1984, videoId: "izGwDsrQ1eQ" },
    { title: "We Built This City", artist: "Starship", year: 1985, videoId: "K1b8AhIsSYQ" },
    { title: "Livin' on a Prayer", artist: "Bon Jovi", year: 1986, videoId: "lDK9QqIzhwk" },
    { title: "The Final Countdown", artist: "Europe", year: 1986, videoId: "9jK-NcRmVcw" },
    { title: "Walk Like an Egyptian", artist: "The Bangles", year: 1986, videoId: "Cv6tuzHUuuk" },
    { title: "You Give Love a Bad Name", artist: "Bon Jovi", year: 1986, videoId: "KrZHPOeOxQQ" },
    { title: "Sweet Child O' Mine", artist: "Guns N' Roses", year: 1987, videoId: "1w7OgIMMRc4" },
    { title: "Never Gonna Give You Up", artist: "Rick Astley", year: 1987, videoId: "dQw4w9WgXcQ" },
    { title: "I Wanna Dance with Somebody", artist: "Whitney Houston", year: 1987, videoId: "eH3giaIzONA" },
    { title: "With or Without You", artist: "U2", year: 1987, videoId: "XmSdTa9kaiQ" },
    { title: "Faith", artist: "George Michael", year: 1987, videoId: "lu3VTngm1F0" },
    { title: "Man in the Mirror", artist: "Michael Jackson", year: 1988, videoId: "PivWY9wn5ps" },
    { title: "Sweet Dreams (Are Made of This)", artist: "La Bouche", year: 1988, videoId: "E-R9THV1gjw" },
    { title: "Don't Worry, Be Happy", artist: "Bobby McFerrin", year: 1988, videoId: "d-diB65scQU" },
    { title: "Paradise City", artist: "Guns N' Roses", year: 1988, videoId: "Rbm6GXllBiw" },
    { title: "Desire", artist: "U2", year: 1988, videoId: "CFr6RCiJ8rA" },
    { title: "Like a Prayer", artist: "Madonna", year: 1989, videoId: "79fzeNUqQbQ" },
    { title: "Eternal Flame", artist: "The Bangles", year: 1989, videoId: "PSoOFn3wQV4" },
    { title: "Straight Up", artist: "Paula Abdul", year: 1989, videoId: "El1kgCqD7Xk" },
    { title: "She Drives Me Crazy", artist: "Fine Young Cannibals", year: 1989, videoId: "UtvmTu4zAMg" },
    { title: "Pump Up the Jam", artist: "Technotronic", year: 1989, videoId: "9EcjWd-O4jI" },
    { title: "Love Shack", artist: "The B-52's", year: 1989, videoId: "9SOryJvTAGs" },
    { title: "Wind of Change", artist: "Scorpions", year: 1990, videoId: "n4RjJKxsamQ" },
    { title: "Rhythm Is a Dancer", artist: "Snap!", year: 1992, videoId: "u5CIqrRQl0s" },
    { title: "What Is Love", artist: "Haddaway", year: 1993, videoId: "HEXWRTEbj1I" },
    { title: "Mr. Vain", artist: "Culture Beat", year: 1993, videoId: "mfWifbRdDCg" },
    { title: "The Sign", artist: "Ace of Base", year: 1993, videoId: "iqu132vTl5Y" },
    { title: "Cotton Eye Joe", artist: "Rednex", year: 1994, videoId: "mOYZaiDZ7BM" },
    { title: "Basket Case", artist: "Green Day", year: 1994, videoId: "NUTGr5t3MoY" },
    { title: "Creep", artist: "TLC", year: 1994, videoId: "LlZydtG3xqI" },
    { title: "I'll Be There for You", artist: "The Rembrandts", year: 1995, videoId: "q-9kPks0IfE" },
    { title: "Breakfast at Tiffany's", artist: "Deep Blue Something", year: 1995, videoId: "1ClCpfeIELw" },
    { title: "1979", artist: "The Smashing Pumpkins", year: 1996, videoId: "4aeETEoNfOg" },
    { title: "Killing Me Softly", artist: "Fugees", year: 1996, videoId: "8ppz-cwLeqo" },
    { title: "Return of the Mack", artist: "Mark Morrison", year: 1996, videoId: "uB1D9wWxd2w" },
    { title: "Barbie Girl", artist: "Aqua", year: 1997, videoId: "ZyhrYis509A" },
    { title: "The Freshmen", artist: "The Verve Pipe", year: 1997, videoId: "1umEXpGHc0E" },
    { title: "Tubthumping", artist: "Chumbawamba", year: 1997, videoId: "2H5uWRjFsGc" },
    { title: "The Boy Is Mine", artist: "Brandy & Monica", year: 1998, videoId: "Va1Y6う5-s" },
    { title: "Gettin' Jiggy wit It", artist: "Will Smith", year: 1998, videoId: "3JcmQONgXJM" },
    { title: "All Star", artist: "Smash Mouth", year: 1999, videoId: "L_jWHffIx5E" },
    
    // 1990s
    { title: "Vogue", artist: "Madonna", year: 1990, videoId: "GuJQSAiODqI" },
    { title: "Nothing Compares 2 U", artist: "Sinéad O'Connor", year: 1990, videoId: "0-EF60neguk" },
    { title: "Ice Ice Baby", artist: "Vanilla Ice", year: 1990, videoId: "rog8ou-ZepE" },
    { title: "U Can't Touch This", artist: "MC Hammer", year: 1990, videoId: "otCpCn0l4Wo" },
    { title: "Smells Like Teen Spirit", artist: "Nirvana", year: 1991, videoId: "hTWKbfoikeg" },
    { title: "Losing My Religion", artist: "R.E.M.", year: 1991, videoId: "xwtdhWltSIg" },
    { title: "Enter Sandman", artist: "Metallica", year: 1991, videoId: "CD-E-LDc384" },
    { title: "I Will Always Love You", artist: "Whitney Houston", year: 1992, videoId: "3JWTaaS7LdU" },
    { title: "Creep", artist: "Radiohead", year: 1992, videoId: "XFkzRNyygfk" },
    { title: "Under the Bridge", artist: "Red Hot Chili Peppers", year: 1992, videoId: "GLvohMXgcBo" },
    { title: "Tears in Heaven", artist: "Eric Clapton", year: 1992, videoId: "JxPj3GAYYZ0" },
    { title: "Dreams", artist: "The Cranberries", year: 1993, videoId: "Yam5uK6e-bQ" },
    { title: "What's Up?", artist: "4 Non Blondes", year: 1993, videoId: "6NXnxTNIWkc" },
    { title: "Zombie", artist: "The Cranberries", year: 1994, videoId: "6Ejga4kJUts" },
    { title: "Black Hole Sun", artist: "Soundgarden", year: 1994, videoId: "3mbBbFH9fAg" },
    { title: "All I Wanna Do", artist: "Sheryl Crow", year: 1994, videoId: "6mEfYew1bE0" },
    { title: "Stay (I Missed You)", artist: "Lisa Loeb", year: 1994, videoId: "i9HGwRWMtyQ" },
    { title: "Gangsta's Paradise", artist: "Coolio", year: 1995, videoId: "fPO76Jlnz6c" },
    { title: "Wonderwall", artist: "Oasis", year: 1995, videoId: "bx1Bh8ZvH84" },
    { title: "Waterfalls", artist: "TLC", year: 1995, videoId: "8WEtxJ4-sh4" },
    { title: "Kiss from a Rose", artist: "Seal", year: 1995, videoId: "AMD2TwRvuoU" },
    { title: "Wannabe", artist: "Spice Girls", year: 1996, videoId: "gJLIiF15wjQ" },
    { title: "Macarena", artist: "Los Del Rio", year: 1996, videoId: "zWaymcVmJ-A" },
    { title: "Don't Speak", artist: "No Doubt", year: 1996, videoId: "TR3Vdo5etCQ" },
    { title: "My Heart Will Go On", artist: "Celine Dion", year: 1997, videoId: "WNIPqafd4As" },
    { title: "Bitter Sweet Symphony", artist: "The Verve", year: 1997, videoId: "1lyu1KKwC74" },
    { title: "Torn", artist: "Natalie Imbruglia", year: 1997, videoId: "VV1XWJN3nJo" },
    { title: "MMMBop", artist: "Hanson", year: 1997, videoId: "NHozn0YXAeE" },
    { title: "...Baby One More Time", artist: "Britney Spears", year: 1998, videoId: "C-u5WLJ9Yk4" },
    { title: "Believe", artist: "Cher", year: 1998, videoId: "nZXRV4MezEw" },
    { title: "Iris", artist: "Goo Goo Dolls", year: 1998, videoId: "NdYWuo9OFAw" },
    { title: "Doo Wop (That Thing)", artist: "Lauryn Hill", year: 1998, videoId: "T6QKqFPRZSA" },
    { title: "Livin' la Vida Loca", artist: "Ricky Martin", year: 1999, videoId: "p47fEXGabaY" },
    { title: "No Scrubs", artist: "TLC", year: 1999, videoId: "FrLequ6dUdM" },
    { title: "I Want It That Way", artist: "Backstreet Boys", year: 1999, videoId: "4fndeDfaWCg" },
    { title: "Smooth", artist: "Santana ft. Rob Thomas", year: 1999, videoId: "6Whgn_iE5uc" },
    { title: "Genie in a Bottle", artist: "Christina Aguilera", year: 1999, videoId: "kIDWgqDBNXA" },
    
    // 2000s
    { title: "Oops!... I Did It Again", artist: "Britney Spears", year: 2000, videoId: "CduA0TULnow" },
    { title: "It Wasn't Me", artist: "Shaggy", year: 2000, videoId: "T_x6QmuJdms" },
    { title: "Beautiful Day", artist: "U2", year: 2000, videoId: "co6WMzDOh1o" },
    { title: "Bye Bye Bye", artist: "*NSYNC", year: 2000, videoId: "Eo-KmOd3i7s" },
    { title: "Say My Name", artist: "Destiny's Child", year: 2000, videoId: "sQgd6MccwZc" },
    { title: "Independent Women", artist: "Destiny's Child", year: 2000, videoId: "0lPQZni7I18" },
    { title: "Lady Marmalade", artist: "Christina Aguilera, Lil' Kim, Mýa, Pink", year: 2001, videoId: "RQa7SvVCdZk" },
    { title: "In the End", artist: "Linkin Park", year: 2001, videoId: "eVTXPUF4Oz4" },
    { title: "Fallin'", artist: "Alicia Keys", year: 2001, videoId: "Urdlvw0SSEc" },
    { title: "Get Ur Freak On", artist: "Missy Elliott", year: 2001, videoId: "FPoKiGQzbSQ" },
    { title: "U Remind Me", artist: "Usher", year: 2001, videoId: "YfNH1EqJiCk" },
    { title: "Complicated", artist: "Avril Lavigne", year: 2002, videoId: "5NPBIwQyPWE" },
    { title: "Without Me", artist: "Eminem", year: 2002, videoId: "YVkUvmDQ3HY" },
    { title: "Hot in Herre", artist: "Nelly", year: 2002, videoId: "GeZZr_p6vB8" },
    { title: "A Thousand Miles", artist: "Vanessa Carlton", year: 2002, videoId: "Cwkej79U3ek" },
    { title: "Lose Yourself", artist: "Eminem", year: 2002, videoId: "_Yhyp-_hX2s" },
    { title: "Sk8er Boi", artist: "Avril Lavigne", year: 2002, videoId: "TIy3n2b7V9k" },
    { title: "Crazy in Love", artist: "Beyoncé ft. Jay-Z", year: 2003, videoId: "ViwtNLUqkMY" },
    { title: "Hey Ya!", artist: "OutKast", year: 2003, videoId: "PWgvGjAhvIw" },
    { title: "In Da Club", artist: "50 Cent", year: 2003, videoId: "5qm8PH4xAss" },
    { title: "Beautiful", artist: "Christina Aguilera", year: 2003, videoId: "eAfyFTzZDMM" },
    { title: "Where Is the Love?", artist: "Black Eyed Peas", year: 2003, videoId: "WpYeekQkAdc" },
    { title: "Toxic", artist: "Britney Spears", year: 2004, videoId: "LOZuxwVk7TU" },
    { title: "Yeah!", artist: "Usher ft. Lil Jon & Ludacris", year: 2004, videoId: "GxBSyx85Kp8" },
    { title: "Boulevard of Broken Dreams", artist: "Green Day", year: 2004, videoId: "Soa3gO7tL-c" },
    { title: "Since U Been Gone", artist: "Kelly Clarkson", year: 2004, videoId: "R7UrFYvl5TE" },
    { title: "Mr. Brightside", artist: "The Killers", year: 2004, videoId: "gGdGFtwCNBE" },
    { title: "Drop It Like It's Hot", artist: "Snoop Dogg ft. Pharrell", year: 2004, videoId: "RaCodgL9cvk" },
    { title: "Gold Digger", artist: "Kanye West ft. Jamie Foxx", year: 2005, videoId: "6vwNcNOTVzY" },
    { title: "Hollaback Girl", artist: "Gwen Stefani", year: 2005, videoId: "Kgjkth6BRRY" },
    { title: "Candy Shop", artist: "50 Cent", year: 2005, videoId: "SRcnnId15BA" },
    { title: "Boulevard of Broken Dreams", artist: "Green Day", year: 2005, videoId: "Soa3gO7tL-c" },
    { title: "Feel Good Inc.", artist: "Gorillaz", year: 2005, videoId: "HyHNuVaZJ-k" },
    { title: "Hips Don't Lie", artist: "Shakira ft. Wyclef Jean", year: 2006, videoId: "DUT5rEU6pqM" },
    { title: "SexyBack", artist: "Justin Timberlake", year: 2006, videoId: "3gOHvDP_vCs" },
    { title: "Promiscuous", artist: "Nelly Furtado ft. Timbaland", year: 2006, videoId: "0J3vgcE5i2o" },
    { title: "Irreplaceable", artist: "Beyoncé", year: 2006, videoId: "2EwViQxSJJQ" },
    { title: "Buttons", artist: "The Pussycat Dolls", year: 2006, videoId: "VCLxJd1d84s" },
    { title: "SOS", artist: "Rihanna", year: 2006, videoId: "GkHAWf0sR_4" },
    
    // 2006-2010
    { title: "Crazy", artist: "Gnarls Barkley", year: 2006, videoId: "bd2B6SjMh_w" },
    { title: "Umbrella", artist: "Rihanna ft. Jay-Z", year: 2007, videoId: "CvBfHwUxHIk" },
    { title: "Rehab", artist: "Amy Winehouse", year: 2007, videoId: "KUmZp8pR1uc" },
    { title: "Apologize", artist: "Timbaland ft. OneRepublic", year: 2007, videoId: "ZSM3w1v-A_Y" },
    { title: "No One", artist: "Alicia Keys", year: 2007, videoId: "rywUS-ohqeE" },
    { title: "Big Girls Don't Cry", artist: "Fergie", year: 2007, videoId: "agrXgrAgQ0U" },
    { title: "The Sweet Escape", artist: "Gwen Stefani ft. Akon", year: 2007, videoId: "O0lf_fE3HwA" },
    { title: "Single Ladies", artist: "Beyoncé", year: 2008, videoId: "4m1EFMoRFvY" },
    { title: "Poker Face", artist: "Lady Gaga", year: 2008, videoId: "bESGLojNYSo" },
    { title: "Viva la Vida", artist: "Coldplay", year: 2008, videoId: "dvgZkm1xWPE" },
    { title: "Love Story", artist: "Taylor Swift", year: 2008, videoId: "8xg3vE8Ie_E" },
    { title: "Just Dance", artist: "Lady Gaga", year: 2008, videoId: "2Abk1jAONjw" },
    { title: "Disturbia", artist: "Rihanna", year: 2008, videoId: "E1mU6h4Xdxc" },
    { title: "Forever", artist: "Chris Brown", year: 2008, videoId: "5sMKX22BHeE" },
    { title: "You Belong with Me", artist: "Taylor Swift", year: 2009, videoId: "VuNIsY6JdUw" },
    { title: "Tik Tok", artist: "Ke$ha", year: 2009, videoId: "iP6XpLQM2Cs" },
    { title: "I Gotta Feeling", artist: "Black Eyed Peas", year: 2009, videoId: "uSD4vsh1zDA" },
    { title: "Use Somebody", artist: "Kings of Leon", year: 2008, videoId: "gnhXHvRoUd0" },
    { title: "Bad Romance", artist: "Lady Gaga", year: 2009, videoId: "qrO4YZeyl0I" },
    { title: "Empire State of Mind", artist: "Jay-Z ft. Alicia Keys", year: 2009, videoId: "0UjsXo9l6I8" },
    { title: "Poker Face", artist: "Lady Gaga", year: 2009, videoId: "bESGLojNYSo" },
    { title: "Down", artist: "Jay Sean ft. Lil Wayne", year: 2009, videoId: "oUbpGmR1-QM" },
    { title: "Fireflies", artist: "Owl City", year: 2009, videoId: "psuRGfAaju4" },
    { title: "Rolling in the Deep", artist: "Adele", year: 2010, videoId: "rYEDA3JcQqw" },
    { title: "Firework", artist: "Katy Perry", year: 2010, videoId: "QGJuMBdaqIw" },
    { title: "California Gurls", artist: "Katy Perry ft. Snoop Dogg", year: 2010, videoId: "F57P9C4SAW4" },
    { title: "Love the Way You Lie", artist: "Eminem ft. Rihanna", year: 2010, videoId: "uelHwf8o7_U" },
    { title: "Dynamite", artist: "Taio Cruz", year: 2010, videoId: "Vysgv7qVYTo" },
    { title: "Only Girl (In the World)", artist: "Rihanna", year: 2010, videoId: "pa14VNsdSYM" },
    { title: "Teenage Dream", artist: "Katy Perry", year: 2010, videoId: "98WtmW-lfeE" },
    { title: "Just the Way You Are", artist: "Bruno Mars", year: 2010, videoId: "LjhCEhWiKXk" },
    { title: "We R Who We R", artist: "Ke$ha", year: 2010, videoId: "mXvmSaE0JXA" },
    { title: "We Are Never Getting Back Together", artist: "Taylor Swift", year: 2012, videoId: "WA4iX5D9Z64" },
    { title: "I Knew You Were Trouble", artist: "Taylor Swift", year: 2012, videoId: "vNoKguSdy4Y" },
    { title: "Party Rock Anthem", artist: "LMFAO", year: 2011, videoId: "KQ6zr6kCPj8" },
    { title: "Someone Like You", artist: "Adele", year: 2011, videoId: "hLQl3WQQoQ0" },
    { title: "We Are Young", artist: "fun. ft. Janelle Monáe", year: 2011, videoId: "Sv6dMFF_yts" },
    { title: "Call Me Maybe", artist: "Carly Rae Jepsen", year: 2012, videoId: "fWNaR-rxAic" },
    { title: "Somebody That I Used to Know", artist: "Gotye ft. Kimbra", year: 2011, videoId: "8UVNT4wvIGY" },
    { title: "Thrift Shop", artist: "Macklemore & Ryan Lewis", year: 2012, videoId: "QK8mJJJvaes" },
    { title: "Get Lucky", artist: "Daft Punk ft. Pharrell Williams", year: 2013, videoId: "5NV6Rdv1a3I" },
    { title: "Happy", artist: "Pharrell Williams", year: 2013, videoId: "ZbZSe6N_BXs" },
    { title: "Royals", artist: "Lorde", year: 2013, videoId: "nlcIKh6sBtc" },
    { title: "Counting Stars", artist: "OneRepublic", year: 2013, videoId: "hT_nvWreIhg" },
    { title: "Shake It Off", artist: "Taylor Swift", year: 2014, videoId: "nfWlot6h_JM" },
    { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", year: 2014, videoId: "OPf0YbXqDm0" },
    { title: "Blank Space", artist: "Taylor Swift", year: 2014, videoId: "e-ORhEE9VVg" },
    { title: "Bad Blood", artist: "Taylor Swift", year: 2015, videoId: "QcIy9NiNbmo" },
    { title: "See You Again", artist: "Wiz Khalifa ft. Charlie Puth", year: 2015, videoId: "RgKAFK5djSk" },
    { title: "Hello", artist: "Adele", year: 2015, videoId: "YQHsXMglC9A" },
    { title: "Can't Feel My Face", artist: "The Weeknd", year: 2015, videoId: "KEI4qSrkPAs" },
    { title: "Cheerleader", artist: "OMI", year: 2015, videoId: "jGflUbPQfW8" },
    { title: "Hotline Bling", artist: "Drake", year: 2015, videoId: "uxpDa-c-4Mc" },
    
    // 2016-2025
    { title: "Closer", artist: "The Chainsmokers ft. Halsey", year: 2016, videoId: "PT2_F-1esPk" },
    { title: "Shape of You", artist: "Ed Sheeran", year: 2017, videoId: "JGwWNGJdvx8" },
    { title: "God's Plan", artist: "Drake", year: 2018, videoId: "xpVfcZ0ZcFM" },
    { title: "Old Town Road", artist: "Lil Nas X ft. Billy Ray Cyrus", year: 2019, videoId: "r7qovpFAGrQ" },
    { title: "Blinding Lights", artist: "The Weeknd", year: 2020, videoId: "4NRXx6U8ABQ" },
    { title: "Levitating", artist: "Dua Lipa", year: 2021, videoId: "TUVcZfQe-Kw" },
    { title: "Heat Waves", artist: "Glass Animals", year: 2022, videoId: "mRD0-GxqHVo" },
    { title: "Flowers", artist: "Miley Cyrus", year: 2023, videoId: "G7KNmW9a75Y" },
    { title: "Espresso", artist: "Sabrina Carpenter", year: 2024, videoId: "eVli-tstM5E" },
    { title: "Die With A Smile", artist: "Lady Gaga & Bruno Mars", year: 2025, videoId: "kPa7bsKwL-c" },
];

// Export functions for use in game.js
window.youtubeAPI = {
    playVideo,
    pauseVideo,
    stopVideo,
    songDatabase,
    classicSongDatabase,
    isPlayerReady: () => isPlayerReady
};
