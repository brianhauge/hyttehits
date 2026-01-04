// Game State
const gameState = {
    currentTeam: 1,
    teams: {
        1: { name: 'Hold 1', score: 0, timeline: [] },
        2: { name: 'Hold 2', score: 0, timeline: [] }
    },
    currentSong: null,
    usedSongIds: new Set(),
    gameMode: 'playlist', // 'playlist' or 'year-range'
    selectedPlaylist: 'Modern', // Playlist name (Modern, Classic, etc.)
    yearStart: 2000,
    yearEnd: 2025,
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
    playlists: {}, // Will store songs by playlist name
    yearRange: [] // Will store songs for year range mode
};

// Available playlists
let availablePlaylists = [];

// Year range info from database
let yearRangeInfo = {
    min_year: 1960,
    max_year: 2025,
    total_songs: 0
};

// Song counts by year (for performance)
let songCountsByYear = {};

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
    
    // Load year range info
    try {
        console.log('Loading year range info from API...');
        await loadYearRangeInfo();
        console.log(`Year range: ${yearRangeInfo.min_year}-${yearRangeInfo.max_year} (${yearRangeInfo.total_songs} songs)`);
    } catch (error) {
        console.error('Error loading year range info from API:', error);
        // Continue with default values
    }
    
    // Load song counts by year
    try {
        console.log('Loading song counts by year from API...');
        await loadSongCountsByYear();
        console.log(`Loaded song counts for ${Object.keys(songCountsByYear).length} years`);
    } catch (error) {
        console.error('Error loading song counts by year from API:', error);
        // Continue without song counts
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
    
    // Setup mode selector listeners
    const modeRadios = document.querySelectorAll('input[name="game-mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', handleModeChange);
    });
    
    // Setup year slider
    initYearSlider();
    
    console.log('Game initialized successfully!');
}

// Handle mode change between playlist and year-range
function handleModeChange(event) {
    const mode = event.target.value;
    gameState.gameMode = mode;
    
    const playlistMode = document.getElementById('playlist-mode');
    const yearRangeMode = document.getElementById('year-range-mode');
    
    if (mode === 'playlist') {
        playlistMode.classList.remove('hidden');
        yearRangeMode.classList.add('hidden');
    } else {
        playlistMode.classList.add('hidden');
        yearRangeMode.classList.remove('hidden');
    }
}

// Initialize year range slider with drag functionality
function initYearSlider() {
    const MIN_YEAR = yearRangeInfo.min_year;
    const MAX_YEAR = yearRangeInfo.max_year;
    
    const track = document.getElementById('year-slider-track');
    const range = document.getElementById('year-slider-range');
    const handleMin = document.getElementById('year-handle-min');
    const handleMax = document.getElementById('year-handle-max');
    const labelMin = document.getElementById('year-start-label');
    const labelMax = document.getElementById('year-end-label');
    
    // Set initial values from game state
    handleMin.setAttribute('data-year', gameState.yearStart);
    handleMax.setAttribute('data-year', gameState.yearEnd);
    
    let activeHandle = null;
    let trackRect = null;
    
    // Update slider visual state
    function updateSlider() {
        const minYear = parseInt(handleMin.getAttribute('data-year'));
        const maxYear = parseInt(handleMax.getAttribute('data-year'));
        
        // Calculate positions
        const minPercent = ((minYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
        const maxPercent = ((maxYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
        
        // Update handle positions
        handleMin.style.left = minPercent + '%';
        handleMax.style.left = maxPercent + '%';
        
        // Update range bar
        range.style.left = minPercent + '%';
        range.style.width = (maxPercent - minPercent) + '%';
        
        // Calculate song count for the selected range
        let songCount = 0;
        for (let year = minYear; year <= maxYear; year++) {
            songCount += (songCountsByYear[year] || 0);
        }
        
        // Update labels
        labelMin.textContent = minYear;
        labelMax.textContent = maxYear;
        handleMin.querySelector('.year-handle-tooltip').textContent = minYear;
        handleMax.querySelector('.year-handle-tooltip').textContent = maxYear;
        
        // Update song count label
        const songCountLabel = document.getElementById('year-song-count');
        songCountLabel.textContent = `${songCount} ${songCount === 1 ? 'sang' : 'sange'}`;
        
        // Update game state
        gameState.yearStart = minYear;
        gameState.yearEnd = maxYear;
    }
    
    // Convert mouse position to year
    function positionToYear(clientX) {
        if (!trackRect) trackRect = track.getBoundingClientRect();
        const position = (clientX - trackRect.left) / trackRect.width;
        const year = Math.round(MIN_YEAR + position * (MAX_YEAR - MIN_YEAR));
        return Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));
    }
    
    // Handle mouse/touch move
    function handleMove(clientX) {
        if (!activeHandle) return;
        
        const year = positionToYear(clientX);
        const minYear = parseInt(handleMin.getAttribute('data-year'));
        const maxYear = parseInt(handleMax.getAttribute('data-year'));
        
        if (activeHandle === handleMin) {
            // Don't allow min to exceed max
            if (year <= maxYear) {
                handleMin.setAttribute('data-year', year);
            }
        } else {
            // Don't allow max to go below min
            if (year >= minYear) {
                handleMax.setAttribute('data-year', year);
            }
        }
        
        updateSlider();
    }
    
    // Mouse down on handles
    function handleMouseDown(e, handle) {
        e.preventDefault();
        activeHandle = handle;
        trackRect = track.getBoundingClientRect();
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    function onMouseMove(e) {
        handleMove(e.clientX);
    }
    
    function onMouseUp() {
        activeHandle = null;
        trackRect = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
    
    // Touch events for mobile
    function handleTouchStart(e, handle) {
        e.preventDefault();
        activeHandle = handle;
        trackRect = track.getBoundingClientRect();
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }
    
    function onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            handleMove(e.touches[0].clientX);
        }
    }
    
    function onTouchEnd() {
        activeHandle = null;
        trackRect = null;
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    }
    
    // Click on track to move nearest handle
    track.addEventListener('click', (e) => {
        if (e.target === handleMin || e.target === handleMax || 
            e.target.classList.contains('year-handle-tooltip')) {
            return;
        }
        
        const year = positionToYear(e.clientX);
        const minYear = parseInt(handleMin.getAttribute('data-year'));
        const maxYear = parseInt(handleMax.getAttribute('data-year'));
        
        // Move the nearest handle
        const distToMin = Math.abs(year - minYear);
        const distToMax = Math.abs(year - maxYear);
        
        if (distToMin < distToMax) {
            if (year <= maxYear) {
                handleMin.setAttribute('data-year', year);
            }
        } else {
            if (year >= minYear) {
                handleMax.setAttribute('data-year', year);
            }
        }
        
        updateSlider();
    });
    
    // Attach event listeners to handles
    handleMin.addEventListener('mousedown', (e) => handleMouseDown(e, handleMin));
    handleMax.addEventListener('mousedown', (e) => handleMouseDown(e, handleMax));
    handleMin.addEventListener('touchstart', (e) => handleTouchStart(e, handleMin));
    handleMax.addEventListener('touchstart', (e) => handleTouchStart(e, handleMax));
    
    // Initial update
    updateSlider();
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

// Load year range info from API
async function loadYearRangeInfo() {
    try {
        const response = await fetch(`${API_URL}/songs/year-range-info`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch year range info from API');
        }
        
        yearRangeInfo = await response.json();
        
        // Update default year range in game state to use the latest 25 years
        const defaultStart = Math.max(yearRangeInfo.min_year, yearRangeInfo.max_year - 25);
        gameState.yearStart = defaultStart;
        gameState.yearEnd = yearRangeInfo.max_year;
        
        console.log('Year range info loaded:', yearRangeInfo);
        
    } catch (error) {
        console.error('Error loading year range info:', error);
        throw error;
    }
}

// Load song counts by year from API
async function loadSongCountsByYear() {
    try {
        const response = await fetch(`${API_URL}/songs/counts-by-year`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch song counts by year from API');
        }
        
        songCountsByYear = await response.json();
        
        console.log('Song counts by year loaded:', Object.keys(songCountsByYear).length, 'years');
        
    } catch (error) {
        console.error('Error loading song counts by year:', error);
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
async function startGame() {
    try {
        const team1Name = document.getElementById('team1-name').value || 'Hold 1';
        const team2Name = document.getElementById('team2-name').value || 'Hold 2';
        const gameMode = gameState.gameMode;
        
        console.log('Starting game with mode:', gameMode);
        
        gameState.teams[1].name = team1Name;
        gameState.teams[2].name = team2Name;
        
        let selectedDatabase = [];
        
        if (gameMode === 'playlist') {
            const playlistSelect = document.getElementById('playlist-select').value;
            gameState.selectedPlaylist = playlistSelect;
            selectedDatabase = songCache.playlists[playlistSelect] || [];
            console.log(`Selected playlist: ${playlistSelect}, Available songs: ${selectedDatabase.length}`);
        } else {
            // Year range mode - fetch songs from API
            console.log(`Fetching songs for year range: ${gameState.yearStart}-${gameState.yearEnd}`);
            try {
                const response = await fetch(`${API_URL}/songs/year-range?start=${gameState.yearStart}&end=${gameState.yearEnd}&status=working`);
                if (!response.ok) {
                    throw new Error('Failed to fetch songs by year range');
                }
                selectedDatabase = await response.json();
                songCache.yearRange = selectedDatabase;
                console.log(`Loaded ${selectedDatabase.length} songs for year range ${gameState.yearStart}-${gameState.yearEnd}`);
            } catch (error) {
                console.error('Error fetching songs by year range:', error);
                alert('Kunne ikke hente sange for det valgte årsinterval. Prøv at genindlæse siden.');
                return;
            }
        }
        
        if (selectedDatabase.length === 0) {
            alert('Ingen sange tilgængelige for det valgte interval. Vælg venligst et andet interval.');
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
    let database = [];
    
    // Select the appropriate database based on game mode
    if (gameState.gameMode === 'playlist') {
        database = songCache.playlists[gameState.selectedPlaylist] || [];
    } else {
        database = songCache.yearRange || [];
    }
    
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
    const playlistOrYearRange = gameState.gameMode === 'playlist' 
        ? gameState.selectedPlaylist 
        : `${gameState.yearStart}-${gameState.yearEnd}`;
    logGamePlay(song.video_id, teamName, playlistOrYearRange, isCorrect);
    
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
