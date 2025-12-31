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
    { title: "Shake It Off", artist: "Taylor Swift", year: 2016, videoId: "nfWlot6h_JM" },
    { title: "Blank Space", artist: "Taylor Swift", year: 2016, videoId: "e-ORhEE9VVg" },
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
    { title: "...Ready For It?", artist: "Taylor Swift", year: 2017, videoId: "wIft-t-MQuE" },
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
    { title: "Alt Det Jeg Ville Have Sagt", artist: "Sanne Salomonsen", year: 2021, videoId: "YsCxHF3gX-s" },
    
    // 2022
    { title: "Heat Waves", artist: "Glass Animals", year: 2022, videoId: "mRD0-GxqHVo" },
    { title: "As It Was", artist: "Harry Styles", year: 2022, videoId: "H5v3kku4y6Q" },
    { title: "STAY", artist: "The Kid LAROI & Justin Bieber", year: 2022, videoId: "kTJczUoc26U" },
    { title: "Anti-Hero", artist: "Taylor Swift", year: 2022, videoId: "b1kbLwvqugk" },
    { title: "Unholy", artist: "Sam Smith & Kim Petras", year: 2022, videoId: "Uq9gPaIzbe8" },
    { title: "I'm Good (Blue)", artist: "David Guetta & Bebe Rexha", year: 2022, videoId: "90RLzVUuXe4" },
    { title: "Running Up That Hill", artist: "Kate Bush", year: 2022, videoId: "wp43OdtAAkM" },
    { title: "About Damn Time", artist: "Lizzo", year: 2022, videoId: "SLjnq2BiGbE" },
    { title: "Lavender Haze", artist: "Taylor Swift", year: 2022, videoId: "jBwWy-YciUQ" },
    { title: "Tabita", artist: "Natasja", year: 2022, videoId: "K6lXaJqMzFw" },
    
    // 2023
    { title: "Flowers", artist: "Miley Cyrus", year: 2023, videoId: "G7KNmW9a75Y" },
    { title: "Kill Bill", artist: "SZA", year: 2023, videoId: "aLZ8xWEGh3g" },
    { title: "Vampire", artist: "Olivia Rodrigo", year: 2023, videoId: "RlPNh_PBZb4" },
    { title: "Paint The Town Red", artist: "Doja Cat", year: 2023, videoId: "UxESd61h8uI" },
    { title: "Cruel Summer", artist: "Taylor Swift", year: 2023, videoId: "ic8j13piAhQ" },
    { title: "What Was I Made For?", artist: "Billie Eilish", year: 2023, videoId: "j5FweitwAQ8" },
    { title: "Dance The Night", artist: "Dua Lipa", year: 2023, videoId: "RuRLz0pXcKU" },
    { title: "Blinding Lights", artist: "The Weeknd", year: 2023, videoId: "4NRXx6U8ABQ" },
    { title: "Karma", artist: "Taylor Swift", year: 2023, videoId: "JmnjJ12s4Z8" },
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
    // 1925-1950s
    { title: "Singin' in the Rain", artist: "Gene Kelly", year: 1952, videoId: "D1ZYhVpdXbQ" },
    { title: "What a Wonderful World", artist: "Louis Armstrong", year: 1967, videoId: "VqhCQZaH4Vs" },
    { title: "Fly Me to the Moon", artist: "Frank Sinatra", year: 1964, videoId: "ZEcqHA7dbwM" },
    
    // 1960s
    { title: "Stand by Me", artist: "Ben E. King", year: 1961, videoId: "hwZNL7QVJjE" },
    { title: "I Want to Hold Your Hand", artist: "The Beatles", year: 1963, videoId: "jenWdylTtzs" },
    { title: "My Girl", artist: "The Temptations", year: 1964, videoId: "6IUG-9jZxHQ" },
    { title: "Respect", artist: "Aretha Franklin", year: 1967, videoId: "6FOUqQt3Kg0" },
    { title: "Hey Jude", artist: "The Beatles", year: 1968, videoId: "A_MjCqQoLLA" },
    { title: "I Heard It Through the Grapevine", artist: "Marvin Gaye", year: 1968, videoId: "hajBdDM2qdg" },
    
    // 1970s
    { title: "Imagine", artist: "John Lennon", year: 1971, videoId: "YkgkThdzX-8" },
    { title: "Superstition", artist: "Stevie Wonder", year: 1972, videoId: "0CFuCYNx-1g" },
    { title: "Bohemian Rhapsody", artist: "Queen", year: 1975, videoId: "fJ9rUzIMcZQ" },
    { title: "Dancing Queen", artist: "ABBA", year: 1976, videoId: "xFrGuyw1V8s" },
    { title: "Stayin' Alive", artist: "Bee Gees", year: 1977, videoId: "fNFzfwLM72c" },
    { title: "Le Freak", artist: "Chic", year: 1978, videoId: "h1qQ1SKNlgY" },
    { title: "YMCA", artist: "Village People", year: 1978, videoId: "CS9OO0S5w2k" },
    { title: "Don't Stop Me Now", artist: "Queen", year: 1979, videoId: "HgzGwKwLmgM" },
    { title: "I Will Survive", artist: "Gloria Gaynor", year: 1979, videoId: "gYkACVDFmeg" },
    
    // 1980s
    { title: "Another One Bites the Dust", artist: "Queen", year: 1980, videoId: "rY0WxgSXdEE" },
    { title: "Don't You Want Me", artist: "The Human League", year: 1981, videoId: "uPudE8nDog0" },
    { title: "Billie Jean", artist: "Michael Jackson", year: 1982, videoId: "Zi_XLOBDo_Y" },
    { title: "Thriller", artist: "Michael Jackson", year: 1982, videoId: "sOnqjkJTMaA" },
    { title: "Sweet Dreams", artist: "Eurythmics", year: 1983, videoId: "qeMFqkcPYcg" },
    { title: "Karma Chameleon", artist: "Culture Club", year: 1983, videoId: "JmcA9LIIXWw" },
    { title: "Like a Virgin", artist: "Madonna", year: 1984, videoId: "s__rX_WL100" },
    { title: "Purple Rain", artist: "Prince", year: 1984, videoId: "TvnYmWpD_T8" },
    { title: "Take On Me", artist: "a-ha", year: 1985, videoId: "djV11Xbc914" },
    { title: "Sweet Child O' Mine", artist: "Guns N' Roses", year: 1987, videoId: "1w7OgIMMRc4" },
    { title: "Never Gonna Give You Up", artist: "Rick Astley", year: 1987, videoId: "dQw4w9WgXcQ" },
    { title: "Every Breath You Take", artist: "The Police", year: 1983, videoId: "OMOGaugKpzs" },
    
    // 1990s
    { title: "Vogue", artist: "Madonna", year: 1990, videoId: "GuJQSAiODqI" },
    { title: "Smells Like Teen Spirit", artist: "Nirvana", year: 1991, videoId: "hTWKbfoikeg" },
    { title: "I Will Always Love You", artist: "Whitney Houston", year: 1992, videoId: "3JWTaaS7LdU" },
    { title: "Creep", artist: "Radiohead", year: 1992, videoId: "XFkzRNyygfk" },
    { title: "Dreams", artist: "The Cranberries", year: 1993, videoId: "Yam5uK6e-bQ" },
    { title: "Zombie", artist: "The Cranberries", year: 1994, videoId: "6Ejga4kJUts" },
    { title: "Gangsta's Paradise", artist: "Coolio", year: 1995, videoId: "fPO76Jlnz6c" },
    { title: "Wonderwall", artist: "Oasis", year: 1995, videoId: "bx1Bh8ZvH84" },
    { title: "Wannabe", artist: "Spice Girls", year: 1996, videoId: "gJLIiF15wjQ" },
    { title: "My Heart Will Go On", artist: "Celine Dion", year: 1997, videoId: "WNIPqafd4As" },
    { title: "Bitter Sweet Symphony", artist: "The Verve", year: 1997, videoId: "1lyu1KKwC74" },
    { title: "Torn", artist: "Natalie Imbruglia", year: 1997, videoId: "VV1XWJN3nJo" },
    { title: "...Baby One More Time", artist: "Britney Spears", year: 1998, videoId: "C-u5WLJ9Yk4" },
    { title: "Believe", artist: "Cher", year: 1998, videoId: "nZXRV4MezEw" },
    { title: "Livin' la Vida Loca", artist: "Ricky Martin", year: 1999, videoId: "p47fEXGabaY" },
    
    // 2000s
    { title: "Oops!... I Did It Again", artist: "Britney Spears", year: 2000, videoId: "CduA0TULnow" },
    { title: "It Wasn't Me", artist: "Shaggy", year: 2000, videoId: "T_x6QmuJdms" },
    { title: "Lady Marmalade", artist: "Christina Aguilera, Lil' Kim, Mýa, Pink", year: 2001, videoId: "RQa7SvVCdZk" },
    { title: "In the End", artist: "Linkin Park", year: 2001, videoId: "eVTXPUF4Oz4" },
    { title: "Complicated", artist: "Avril Lavigne", year: 2002, videoId: "5NPBIwQyPWE" },
    { title: "Without Me", artist: "Eminem", year: 2002, videoId: "YVkUvmDQ3HY" },
    { title: "Crazy in Love", artist: "Beyoncé ft. Jay-Z", year: 2003, videoId: "ViwtNLUqkMY" },
    { title: "Hey Ya!", artist: "OutKast", year: 2003, videoId: "PWgvGjAhvIw" },
    { title: "Yeah!", artist: "Usher ft. Lil Jon & Ludacris", year: 2004, videoId: "GxBSyx85Kp8" },
    { title: "Boulevard of Broken Dreams", artist: "Green Day", year: 2004, videoId: "Soa3gO7tL-c" },
    { title: "Gold Digger", artist: "Kanye West ft. Jamie Foxx", year: 2005, videoId: "6vwNcNOTVzY" },
    { title: "Since U Been Gone", artist: "Kelly Clarkson", year: 2004, videoId: "R7UrFYvl5TE" },
    { title: "Hollaback Girl", artist: "Gwen Stefani", year: 2005, videoId: "Kgjkth6BRRY" },
    
    // 2006-2015
    { title: "Crazy", artist: "Gnarls Barkley", year: 2006, videoId: "bd2B6SjMh_w" },
    { title: "Umbrella", artist: "Rihanna ft. Jay-Z", year: 2007, videoId: "CvBfHwUxHIk" },
    { title: "Single Ladies", artist: "Beyoncé", year: 2008, videoId: "4m1EFMoRFvY" },
    { title: "Poker Face", artist: "Lady Gaga", year: 2008, videoId: "bESGLojNYSo" },
    { title: "Tik Tok", artist: "Ke$ha", year: 2009, videoId: "iP6XpLQM2Cs" },
    { title: "Rolling in the Deep", artist: "Adele", year: 2010, videoId: "rYEDA3JcQqw" },
    { title: "Party Rock Anthem", artist: "LMFAO", year: 2011, videoId: "KQ6zr6kCPj8" },
    { title: "Call Me Maybe", artist: "Carly Rae Jepsen", year: 2012, videoId: "fWNaR-rxAic" },
    { title: "Get Lucky", artist: "Daft Punk ft. Pharrell Williams", year: 2013, videoId: "5NV6Rdv1a3I" },
    { title: "Happy", artist: "Pharrell Williams", year: 2013, videoId: "ZbZSe6N_BXs" },
    { title: "Shake It Off", artist: "Taylor Swift", year: 2014, videoId: "nfWlot6h_JM" },
    { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", year: 2014, videoId: "OPf0YbXqDm0" },
    
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
