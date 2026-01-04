// Game State
const gameState = {
    currentTeam: 1,
    teams: {
        1: { name: 'Hold 1', score: 0, timeline: [] },
        2: { name: 'Hold 2', score: 0, timeline: [] }
    },
    currentSong: null,
    usedSongIds: new Set(),
    selectedPlaylist: 'Modern', // Playlist name (Modern, Classic, etc.)
    sessionId: null // Session ID for tracking game plays
};

// Generate or retrieve session ID
function getSessionId() {
    let sessionId = localStorage.getItem('hyttehits_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('hyttehits_session_id', sessionId);
    }
    return sessionId;
}

// API Configuration
const API_URL = '/api';

// Song cache
let songCache = {
    playlists: {} // Will store songs by playlist name
};

// Available playlists
let availablePlaylists = [];

// Initialize game
async function initGame() {
    console.log('Initializing game...');
    
    // Initialize session ID
    gameState.sessionId = getSessionId();
    console.log('Session ID:', gameState.sessionId);
    
    // Load playlists first
    try {
        console.log('Loading playlists from API...');
        await loadPlaylists();
        console.log(`Loaded ${availablePlaylists.length} playlists`);
    } catch (error) {
        console.error('Error loading playlists from API:', error);
        alert('Failed to load playlists. Please make sure the API server is running.');
        return;
    }
    
    // Load songs from API
    try {
        console.log('Loading songs from API...');
        await loadSongs();
        const playlistCounts = Object.keys(songCache.playlists).map(cat => 
            `${cat}: ${songCache.playlists[cat].length}`
        ).join(', ');
        console.log(`Loaded songs from database - ${playlistCounts}`);
    } catch (error) {
        console.error('Error loading songs from API:', error);
        alert('Failed to load songs. Please make sure the API server is running.');
        return;
    }

    // Setup event listeners
    console.log('Setting up event listeners...');
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('continue-game').addEventListener('click', continueGame);
    document.getElementById('play-again').addEventListener('click', resetGame);
    console.log('Game initialized successfully!');
}

// Load playlists from API and populate selector
async function loadPlaylists() {
    try {
        const response = await fetch(`${API_URL}/playlists`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch playlists from API');
        }
        
        availablePlaylists = await response.json();
        
        // Populate playlist selector
        const playlistSelect = document.getElementById('playlist-select');
        playlistSelect.innerHTML = '';
        
        availablePlaylists.forEach(playlist => {
            const option = document.createElement('option');
            option.value = playlist.name;
            option.textContent = `${playlist.name}${playlist.description ? ' - ' + playlist.description : ''} (${playlist.song_count} sange)`;
            playlistSelect.appendChild(option);
        });
        
        // Set first playlist as default
        if (availablePlaylists.length > 0) {
            gameState.selectedPlaylist = availablePlaylists[0].name;
        }
        
        console.log('Playlists loaded:', availablePlaylists.map(c => `${c.name} (${c.song_count} songs)`).join(', '));
        
    } catch (error) {
        console.error('Error loading playlists:', error);
        throw error;
    }
}

// Load songs from API
async function loadSongs() {
    try {
        // Get all playlists first
        const playlistsResponse = await fetch(`${API_URL}/songs?status=working`);
        
        if (!playlistsResponse.ok) {
            throw new Error('Failed to fetch songs from API');
        }
        
        const allSongs = await playlistsResponse.json();
        
        // Organize songs by playlist
        songCache.playlists = {};
        
        allSongs.forEach(song => {
            if (song.playlists && Array.isArray(song.playlists)) {
                song.playlists.forEach(playlist => {
                    if (!songCache.playlists[playlist.name]) {
                        songCache.playlists[playlist.name] = [];
                    }
                    // Only add if not already in this playlist
                    if (!songCache.playlists[playlist.name].find(s => s.video_id === song.video_id)) {
                        songCache.playlists[playlist.name].push(song);
                    }
                });
            }
        });
        
        console.log('Loaded songs by playlist:', Object.keys(songCache.playlists).map(cat => 
            `${cat}: ${songCache.playlists[cat].length} songs`
        ).join(', '));
        
    } catch (error) {
        console.error('Error loading songs:', error);
        throw error;
    }
}

// Start the game
function startGame() {
    try {
        const team1Name = document.getElementById('team1-name').value || 'Hold 1';
        const team2Name = document.getElementById('team2-name').value || 'Hold 2';
        const playlistSelect = document.getElementById('playlist-select').value;
        
        console.log('Starting game with:', { team1Name, team2Name, playlistSelect });
        
        gameState.teams[1].name = team1Name;
        gameState.teams[2].name = team2Name;
        gameState.selectedPlaylist = playlistSelect;
        
        // Check if songs are loaded for this playlist
        const selectedDatabase = songCache.playlists[playlistSelect] || [];
        console.log(`Selected playlist: ${playlistSelect}, Available songs: ${selectedDatabase.length}`);
        
        if (selectedDatabase.length === 0) {
            alert('Ingen sange tilgængelige for den valgte playliste. Prøv at genindlæse siden.');
            return;
        }
        
        // Update UI
        document.getElementById('modal-team1-name').textContent = team1Name;
        document.getElementById('modal-team2-name').textContent = team2Name;
        
        // Switch to game screen
        document.getElementById('setup-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        
        console.log('Switched to game screen, starting first song...');
        
        // Automatically start the first song
        playNextSong();
    } catch (error) {
        console.error('Error in startGame:', error);
        alert('Der opstod en fejl ved start af spillet: ' + error.message);
    }
}

// Get a random song that hasn't been used
function getRandomSong() {
    // Select the appropriate database based on user's choice
    const database = songCache.playlists[gameState.selectedPlaylist] || [];
    
    const availableSongs = database.filter(song => !gameState.usedSongIds.has(song.video_id));
    if (availableSongs.length === 0) {
        alert('Ingen flere sange tilgængelige! Spillet nulstiller sangpuljen.');
        gameState.usedSongIds.clear();
        return getRandomSong();
    }
    return availableSongs[Math.floor(Math.random() * availableSongs.length)];
}

// Play next song
async function playNextSong() {
    try {
        console.log('playNextSong called');
        const song = getRandomSong();
        console.log('Selected song:', song);
        
        gameState.currentSong = song;
        gameState.usedSongIds.add(song.video_id);
        
        // Update team indicator
        const currentTeam = gameState.currentTeam;
        const teamName = gameState.teams[currentTeam].name;
        const teamIndicator = document.getElementById('current-team-indicator');
        const modalTeamName = document.getElementById('modal-team-name');
        
        modalTeamName.textContent = teamName;
        teamIndicator.className = 'current-team-indicator team' + currentTeam;
        
        // Show guess options BEFORE loading video
        console.log('Showing guess options...');
        showGuessOptions();
        
        // Play on YouTube
        console.log('Attempting to play video:', song.video_id);
        try {
            await window.youtubeAPI.playVideo(song.video_id);
            console.log('Video playing successfully');
        } catch (error) {
            console.error('Error playing video:', error);
            // Mark song as broken in database
            await markSongAsBroken(song.video_id);
            // Try next song silently
            console.log('Video could not be played. Trying next song...');
            playNextSong();
            return;
        }
    } catch (error) {
        console.error('Error in playNextSong:', error);
        alert('Der opstod en fejl: ' + error.message);
    }
}

// Mark a song as broken in the database
async function markSongAsBroken(videoId) {
    try {
        await fetch(`${API_URL}/songs/${videoId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'broken' })
        });
    } catch (error) {
        console.error('Error marking song as broken:', error);
    }
}

// Log game play to database
async function logGamePlay(videoId, teamName, playlist, guessedCorrectly) {
    try {
        await fetch(`${API_URL}/game-logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                video_id: videoId,
                team_name: teamName,
                playlist: playlist,
                guessed_correctly: guessedCorrectly,
                session_id: gameState.sessionId
            })
        });
    } catch (error) {
        console.error('Error logging game play:', error);
    }
}

// Show guess options based on current timeline
function showGuessOptions() {
    const currentTeam = gameState.currentTeam;
    const timeline = gameState.teams[currentTeam].timeline;
    const guessOptions = document.getElementById('guess-options');
    
    guessOptions.innerHTML = '';
    
    if (timeline.length === 0) {
        // First card - no guess needed, just add it
        const btn = document.createElement('button');
        btn.className = 'guess-btn';
        btn.textContent = 'Placer Første Kort';
        btn.onclick = () => makeGuess(0);
        guessOptions.appendChild(btn);
    } else {
        // Create guess options with year cards interspersed
        for (let i = 0; i <= timeline.length; i++) {
            // Check if we should show button for this position
            let shouldShowButton = true;
            
            if (i > 0 && i < timeline.length) {
                // Between two cards - don't show button if years are the same
                if (timeline[i - 1].year === timeline[i].year) {
                    shouldShowButton = false;
                }
            }
            
            // Add button for position (if appropriate)
            if (shouldShowButton) {
                const btn = document.createElement('button');
                btn.className = 'guess-btn';
                
                if (i === 0) {
                    btn.textContent = `≤ ${timeline[0].year}`;
                } else if (i === timeline.length) {
                    btn.textContent = `≥ ${timeline[timeline.length - 1].year}`;
                } else {
                    btn.textContent = `${timeline[i - 1].year} - ${timeline[i].year}`;
                }
                
                btn.onclick = () => makeGuess(i);
                guessOptions.appendChild(btn);
            }
            
            // Add year card after button (except after last button)
            if (i < timeline.length) {
                const yearCard = document.createElement('div');
                yearCard.className = 'guess-year-card';
                yearCard.innerHTML = `
                    <div class="year">${timeline[i].year}</div>
                    <div class="song-title">${timeline[i].title}</div>
                    <div class="song-artist">${timeline[i].artist}</div>
                `;
                guessOptions.appendChild(yearCard);
            }
        }
    }
    
    // Scroll to center of the options after elements are added
    setTimeout(() => {
        const scrollWidth = guessOptions.scrollWidth;
        const clientWidth = guessOptions.clientWidth;
        guessOptions.scrollLeft = (scrollWidth - clientWidth) / 2;
    }, 0);
}

// Make a guess
function makeGuess(position) {
    const currentTeam = gameState.currentTeam;
    const timeline = gameState.teams[currentTeam].timeline;
    const song = gameState.currentSong;
    
    let isCorrect = false;
    
    if (timeline.length === 0) {
        // First card is always correct
        isCorrect = true;
    } else if (position === 0) {
        // Before all cards
        isCorrect = song.year <= timeline[0].year;
    } else if (position === timeline.length) {
        // After all cards
        isCorrect = song.year >= timeline[timeline.length - 1].year;
    } else {
        // Between two cards
        isCorrect = song.year >= timeline[position - 1].year && song.year <= timeline[position].year;
    }
    
    // Stop playback (keep modal visible for result)
    window.youtubeAPI.stopVideo();
    
    // Log the game play
    const teamName = gameState.teams[currentTeam].name;
    logGamePlay(song.video_id, teamName, gameState.selectedPlaylist, isCorrect);
    
    // Show result
    showResult(isCorrect, position);
}

// Show result of guess
function showResult(isCorrect, position) {
    const song = gameState.currentSong;
    const resultSection = document.getElementById('result-section');
    const resultTitle = document.getElementById('result-title');
    
    resultTitle.textContent = isCorrect ? 'Rigtigt!' : 'Forkert!';
    resultTitle.className = isCorrect ? 'correct' : 'incorrect';
    
    document.getElementById('reveal-song-title').textContent = song.title;
    document.getElementById('reveal-artist').textContent = song.artist;
    document.getElementById('reveal-year').textContent = song.year;
    
    resultSection.classList.remove('hidden');
    
    // Play success sound and confetti if correct
    if (isCorrect) {
        playSuccessSound();
        launchConfetti();
        
        const currentTeam = gameState.currentTeam;
        gameState.teams[currentTeam].timeline.splice(position, 0, song);
        gameState.teams[currentTeam].score++;
        
        // Check for winner
        if (gameState.teams[currentTeam].score >= 10) {
            setTimeout(() => showWinner(currentTeam), 2000);
            return;
        }
    }
    
    updateScores();
}

// Play success sound
function playSuccessSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    
    // Create clapping sounds with noise bursts
    function createClap(startTime) {
        // Create white noise for clap sound
        const bufferSize = audioContext.sampleRate * 0.05; // 50ms of noise
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fill with white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.5, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioContext.destination);
        
        noise.start(startTime);
        noise.stop(startTime + 0.05);
    }
    
    // Create multiple claps for applause
    for (let i = 0; i < 8; i++) {
        createClap(now + i * 0.08);
    }
    
    // Add some celebratory tones
    function playTone(frequency, startTime, duration) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.15, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
    
    // Add cheerful chime after claps
    playTone(880, now + 0.7, 0.3);   // A5
    playTone(1046.5, now + 0.9, 0.4); // C6
}

// Launch confetti animation
function launchConfetti() {
    // Set confetti canvas z-index to be above modals
    const confettiCanvas = document.querySelector('canvas');
    if (confettiCanvas) {
        confettiCanvas.style.position = 'fixed';
        confettiCanvas.style.top = '0';
        confettiCanvas.style.left = '0';
        confettiCanvas.style.width = '100%';
        confettiCanvas.style.height = '100%';
        confettiCanvas.style.pointerEvents = 'none';
        confettiCanvas.style.zIndex = '9999';
    }
    
    // Launch confetti from multiple angles
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        zIndex: 9999,
        colors: ['#198754', '#7209b7', '#fb8500', '#FFD700', '#FF69B4', '#00FFFF']
    };
    
    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        
        if (timeLeft <= 0) {
            return clearInterval(interval);
        }
        
        const particleCount = 50 * (timeLeft / duration);
        
        // Launch from left
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));
        
        // Launch from right
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
    }, 250);
}

// Continue to next turn
function continueGame() {
    document.getElementById('result-section').classList.add('hidden');
    
    // Switch teams
    gameState.currentTeam = gameState.currentTeam === 1 ? 2 : 1;
    
    // Automatically play next song for the next team
    playNextSong();
}

// Update scores
function updateScores() {
    // Update modal scores
    document.getElementById('modal-team1-points').textContent = gameState.teams[1].score;
    document.getElementById('modal-team2-points').textContent = gameState.teams[2].score;
}

// Show winner screen
function showWinner(teamNum) {
    window.youtubeAPI.stopVideo();
    document.getElementById('result-section').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('winner-screen').classList.add('active');
    
    const winnerName = gameState.teams[teamNum].name;
    document.getElementById('winner-name').textContent = winnerName;
    
    document.getElementById('final-team1-name').textContent = gameState.teams[1].name;
    document.getElementById('final-team1-score').textContent = gameState.teams[1].score;
    document.getElementById('final-team2-name').textContent = gameState.teams[2].name;
    document.getElementById('final-team2-score').textContent = gameState.teams[2].score;
}

// Reset game
function resetGame() {
    gameState.currentTeam = 1;
    gameState.teams[1].score = 0;
    gameState.teams[1].timeline = [];
    gameState.teams[2].score = 0;
    gameState.teams[2].timeline = [];
    gameState.currentSong = null;
    gameState.usedSongIds.clear();
    
    window.youtubeAPI.stopVideo();
    
    document.getElementById('winner-screen').classList.remove('active');
    document.getElementById('setup-screen').classList.add('active');
    
    updateScores();
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initGame);
