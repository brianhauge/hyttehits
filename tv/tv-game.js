// TV Game Controller - Adapted from game.js with TV navigation support
// API URL is declared in tv-youtube.js

// Game State
const gameState = {
    currentTeam: 1,
    teams: {
        1: { name: 'Hold 1', score: 0, timeline: [] },
        2: { name: 'Hold 2', score: 0, timeline: [] }
    },
    currentSong: null,
    usedSongIds: new Set(),
    gameMode: 'year-range', // 'playlist' or 'year-range'
    selectedPlaylist: null,
    yearStart: 1954,
    yearEnd: 2025,
    sessionId: null
};

// Song cache
let songCache = {
    playlists: {},
    yearRange: []
};

// Available playlists
let availablePlaylists = [];

// Year range info
let yearRangeInfo = {
    min_year: 1960,
    max_year: 2025,
    total_songs: 0
};

// Song counts by year
let songCountsByYear = {};

// Virtual keyboard state
const keyboardState = {
    isOpen: false,
    currentTeam: null,
    currentText: '',
    keys: [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
        'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
        'U', 'V', 'W', 'X', 'Y', 'Z', '1', '2', '3', '4',
        '5', '6', '7', '8', '9', '0', 'Æ', 'Ø', 'Å', ' '
    ]
};

class GameController {
    constructor() {
        this.init();
    }

    async init() {
        console.log('Initializing TV Game Controller...');
        
        // Initialize session ID
        gameState.sessionId = this.getSessionId();
        console.log('Session ID:', gameState.sessionId);
        
        try {
            // Load data from API
            await this.loadPlaylists();
            await this.loadYearRangeInfo();
            await this.loadSongCountsByYear();
            await this.loadSongs();
            
            console.log('Game data loaded successfully');
        } catch (error) {
            console.error('Error loading game data:', error);
            alert('Fejl ved indlæsning af data. Kontroller internetforbindelse.');
            return;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.initializeSetupScreen();
        
        // Focus first element
        setTimeout(() => {
            window.focusManager.focusFirst();
        }, 100);
        
        console.log('Game initialized successfully!');
    }

    getSessionId() {
        let sessionId = localStorage.getItem('hyttehits_tv_session_id');
        if (!sessionId) {
            sessionId = 'tv_session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('hyttehits_tv_session_id', sessionId);
        }
        return sessionId;
    }

    async loadPlaylists() {
        const response = await fetch(`${API_URL}/playlists`);
        if (!response.ok) throw new Error('Failed to load playlists');
        
        availablePlaylists = await response.json();
        console.log(`Loaded ${availablePlaylists.length} playlists`);
    }

    async loadYearRangeInfo() {
        const response = await fetch(`${API_URL}/songs/year-range-info`);
        if (!response.ok) throw new Error('Failed to load year range info');
        
        yearRangeInfo = await response.json();
        
        // Set default year range to all years
        gameState.yearStart = yearRangeInfo.min_year;
        gameState.yearEnd = yearRangeInfo.max_year;
        
        console.log(`Year range: ${yearRangeInfo.min_year}-${yearRangeInfo.max_year}`);
    }

    async loadSongCountsByYear() {
        const response = await fetch(`${API_URL}/songs/counts-by-year`);
        if (!response.ok) throw new Error('Failed to load song counts');
        
        songCountsByYear = await response.json();
        console.log(`Loaded song counts for ${Object.keys(songCountsByYear).length} years`);
    }

    async loadSongs() {
        const response = await fetch(`${API_URL}/songs?status=working`);
        if (!response.ok) throw new Error('Failed to load songs');
        
        const allSongs = await response.json();
        
        // Organize by playlist
        songCache.playlists = {};
        allSongs.forEach(song => {
            if (song.playlists && Array.isArray(song.playlists)) {
                song.playlists.forEach(playlist => {
                    if (!songCache.playlists[playlist.name]) {
                        songCache.playlists[playlist.name] = [];
                    }
                    if (!songCache.playlists[playlist.name].find(s => s.video_id === song.video_id)) {
                        songCache.playlists[playlist.name].push(song);
                    }
                });
            }
        });
        
        console.log('Songs loaded:', Object.keys(songCache.playlists));
    }

    setupEventListeners() {
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleModeChange(btn.dataset.mode));
        });
        
        // Year adjustment buttons - handle with arrow keys
        document.querySelectorAll('.year-adjust-btn').forEach(btn => {
            btn.addEventListener('keydown', (e) => {
                const yearType = btn.dataset.yearType;
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.handleYearAdjust(`${yearType}-inc`);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.handleYearAdjust(`${yearType}-dec`);
                }
            });
        });
        
        // Team name buttons
        const team1Btn = document.getElementById('team1-btn');
        const team2Btn = document.getElementById('team2-btn');
        
        team1Btn.addEventListener('click', () => this.openKeyboard(1));
        team1Btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openKeyboard(1);
            }
        });
        
        team2Btn.addEventListener('click', () => this.openKeyboard(2));
        team2Btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openKeyboard(2);
            }
        });
        
        // Start game button
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        
        // Continue and play again buttons
        document.getElementById('continue-game').addEventListener('click', () => this.continueGame());
        document.getElementById('play-again').addEventListener('click', () => this.resetGame());
    }

    initializeSetupScreen() {
        // Populate playlists
        this.populatePlaylists();
        
        // Set initial year display
        this.updateYearDisplay();
        
        // Set mode to year-range by default
        this.handleModeChange('year-range');
    }

    populatePlaylists() {
        const container = document.getElementById('playlist-options');
        container.innerHTML = '';
        
        availablePlaylists.forEach((playlist, index) => {
            const card = document.createElement('button');
            card.className = 'playlist-card focusable';
            card.tabIndex = 0;
            card.dataset.playlistName = playlist.name;
            
            if (index === 0) {
                card.classList.add('selected');
                gameState.selectedPlaylist = playlist.name;
            }
            
            card.innerHTML = `
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-description">${playlist.description || ''}</div>
                <div class="playlist-song-count">${playlist.song_count} sange</div>
            `;
            
            card.addEventListener('click', () => this.selectPlaylist(playlist.name));
            container.appendChild(card);
        });
    }

    selectPlaylist(playlistName) {
        document.querySelectorAll('.playlist-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        const selected = document.querySelector(`[data-playlist-name="${playlistName}"]`);
        if (selected) {
            selected.classList.add('selected');
            gameState.selectedPlaylist = playlistName;
        }
    }

    handleModeChange(mode) {
        gameState.gameMode = mode;
        
        // Update button states
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Show/hide mode content
        const playlistMode = document.getElementById('playlist-mode');
        const yearRangeMode = document.getElementById('year-range-mode');
        
        if (mode === 'playlist') {
            playlistMode.classList.remove('hidden');
            yearRangeMode.classList.add('hidden');
        } else {
            playlistMode.classList.add('hidden');
            yearRangeMode.classList.remove('hidden');
        }
        
        // Refresh focusable elements
        setTimeout(() => window.focusManager.refresh(), 100);
    }

    handleYearAdjust(action) {
        const MIN_YEAR = yearRangeInfo.min_year;
        const MAX_YEAR = yearRangeInfo.max_year;
        
        switch(action) {
            case 'start-dec':
                gameState.yearStart = Math.max(MIN_YEAR, gameState.yearStart - 1);
                break;
            case 'start-inc':
                gameState.yearStart = Math.min(gameState.yearEnd, gameState.yearStart + 1);
                break;
            case 'end-dec':
                gameState.yearEnd = Math.max(gameState.yearStart, gameState.yearEnd - 1);
                break;
            case 'end-inc':
                gameState.yearEnd = Math.min(MAX_YEAR, gameState.yearEnd + 1);
                break;
        }
        
        this.updateYearDisplay();
    }

    updateYearDisplay() {
        document.getElementById('year-start-value').textContent = gameState.yearStart;
        document.getElementById('year-end-value').textContent = gameState.yearEnd;
        
        // Calculate song count
        let count = 0;
        for (let year = gameState.yearStart; year <= gameState.yearEnd; year++) {
            count += (songCountsByYear[year] || 0);
        }
        
        document.getElementById('year-song-count').textContent = `${count} ${count === 1 ? 'sang' : 'sange'}`;
    }

    openKeyboard(teamNumber) {
        const modal = document.getElementById('keyboard-modal');
        const currentText = gameState.teams[teamNumber].name;
        
        keyboardState.isOpen = true;
        keyboardState.currentTeam = teamNumber;
        keyboardState.currentText = currentText;
        
        document.getElementById('keyboard-current-text').textContent = currentText;
        
        // Populate keyboard
        this.populateKeyboard();
        
        modal.classList.remove('hidden');
        
        // Focus first key
        setTimeout(() => {
            const firstKey = modal.querySelector('.focusable');
            if (firstKey) window.focusManager.setFocus(firstKey);
        }, 100);
    }

    populateKeyboard() {
        const grid = document.getElementById('keyboard-grid');
        grid.innerHTML = '';
        
        keyboardState.keys.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'keyboard-key focusable';
            btn.textContent = key;
            btn.tabIndex = 0;
            btn.addEventListener('click', () => this.handleKeyboardKey(key));
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleKeyboardKey(key);
                }
            });
            grid.appendChild(btn);
        });
        
        // Setup action buttons
        document.querySelectorAll('.keyboard-action-btn').forEach(btn => {
            btn.onclick = () => this.handleKeyboardAction(btn.dataset.action);
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleKeyboardAction(btn.dataset.action);
                }
            });
        });
    }

    handleKeyboardKey(key) {
        if (key === ' ') {
            keyboardState.currentText += ' ';
        } else {
            keyboardState.currentText += key;
        }
        
        // Limit to 20 characters
        if (keyboardState.currentText.length > 20) {
            keyboardState.currentText = keyboardState.currentText.substring(0, 20);
        }
        
        document.getElementById('keyboard-current-text').textContent = keyboardState.currentText;
    }

    handleKeyboardAction(action) {
        switch(action) {
            case 'backspace':
                keyboardState.currentText = keyboardState.currentText.slice(0, -1);
                document.getElementById('keyboard-current-text').textContent = keyboardState.currentText || 'Hold ' + keyboardState.currentTeam;
                break;
            case 'space':
                this.handleKeyboardKey(' ');
                break;
            case 'done':
                this.closeKeyboard();
                break;
        }
    }

    closeKeyboard() {
        const teamNumber = keyboardState.currentTeam;
        const newName = keyboardState.currentText.trim() || `Hold ${teamNumber}`;
        
        gameState.teams[teamNumber].name = newName;
        document.getElementById(`team${teamNumber}-display`).textContent = newName;
        
        document.getElementById('keyboard-modal').classList.add('hidden');
        keyboardState.isOpen = false;
        
        window.focusManager.refresh();
    }

    async startGame() {
        const team1Name = gameState.teams[1].name;
        const team2Name = gameState.teams[2].name;
        
        console.log('Starting game:', gameState.gameMode);
        
        let selectedDatabase = [];
        
        if (gameState.gameMode === 'playlist') {
            if (!gameState.selectedPlaylist) {
                alert('Vælg venligst en playliste');
                return;
            }
            selectedDatabase = songCache.playlists[gameState.selectedPlaylist] || [];
        } else {
            // Fetch songs for year range
            try {
                const response = await fetch(
                    `${API_URL}/songs/year-range?start=${gameState.yearStart}&end=${gameState.yearEnd}&status=working`
                );
                if (!response.ok) throw new Error('Failed to fetch songs');
                selectedDatabase = await response.json();
                songCache.yearRange = selectedDatabase;
            } catch (error) {
                console.error('Error fetching songs:', error);
                alert('Kunne ikke hente sange. Prøv igen.');
                return;
            }
        }
        
        if (selectedDatabase.length === 0) {
            alert('Ingen sange tilgængelige for valgt interval.');
            return;
        }
        
        console.log(`Starting game with ${selectedDatabase.length} songs`);
        
        // Update UI
        document.getElementById('header-team1-name').textContent = team1Name;
        document.getElementById('header-team2-name').textContent = team2Name;
        
        // Switch screens
        this.switchScreen('game-screen');
        
        // Start first song
        setTimeout(() => this.playNextSong(), 500);
    }

    getRandomSong() {
        let database = [];
        
        if (gameState.gameMode === 'playlist') {
            database = songCache.playlists[gameState.selectedPlaylist] || [];
        } else {
            database = songCache.yearRange || [];
        }
        
        const availableSongs = database.filter(song => !gameState.usedSongIds.has(song.video_id));
        
        if (availableSongs.length === 0) {
            gameState.usedSongIds.clear();
            return this.getRandomSong();
        }
        
        return availableSongs[Math.floor(Math.random() * availableSongs.length)];
    }

    async playNextSong() {
        try {
            const song = this.getRandomSong();
            console.log('Playing song:', song.title);
            
            gameState.currentSong = song;
            gameState.usedSongIds.add(song.video_id);
            
            // Update team indicator
            const currentTeam = gameState.currentTeam;
            const teamName = gameState.teams[currentTeam].name;
            const indicator = document.getElementById('current-team-indicator');
            
            document.getElementById('current-turn-text').textContent = teamName;
            indicator.className = `current-team-indicator team${currentTeam}`;
            
            // Show guess options
            this.showGuessOptions();
            
            // Play video
            try {
                await window.youtubeAPI.playVideo(song.video_id);
            } catch (error) {
                console.error('Video playback error:', error);
                await this.markSongAsBroken(song.video_id);
                this.playNextSong();
            }
        } catch (error) {
            console.error('Error in playNextSong:', error);
            alert('Fejl ved afspilning af sang');
        }
    }

    showGuessOptions() {
        const currentTeam = gameState.currentTeam;
        const timeline = gameState.teams[currentTeam].timeline;
        const container = document.getElementById('guess-options');
        
        container.innerHTML = '';
        
        if (timeline.length === 0) {
            // First card
            const btn = document.createElement('button');
            btn.className = 'guess-btn focusable';
            btn.textContent = 'Placer Første Kort';
            btn.tabIndex = 0;
            btn.addEventListener('click', () => this.makeGuess(0));
            container.appendChild(btn);
        } else {
            // Create buttons and cards
            for (let i = 0; i <= timeline.length; i++) {
                let shouldShowButton = true;
                
                if (i > 0 && i < timeline.length) {
                    if (timeline[i - 1].year === timeline[i].year) {
                        shouldShowButton = false;
                    }
                }
                
                if (shouldShowButton) {
                    const btn = document.createElement('button');
                    btn.className = 'guess-btn focusable';
                    btn.tabIndex = 0;
                    
                    if (i === 0) {
                        btn.textContent = `≤ ${timeline[0].year}`;
                    } else if (i === timeline.length) {
                        btn.textContent = `≥ ${timeline[timeline.length - 1].year}`;
                    } else {
                        btn.textContent = `${timeline[i - 1].year} - ${timeline[i].year}`;
                    }
                    
                    btn.addEventListener('click', () => this.makeGuess(i));
                    container.appendChild(btn);
                }
                
                if (i < timeline.length) {
                    const card = document.createElement('div');
                    card.className = 'guess-year-card';
                    card.innerHTML = `
                        <div class="year">${timeline[i].year}</div>
                        <div class="song-title">${timeline[i].title}</div>
                        <div class="song-artist">${timeline[i].artist}</div>
                    `;
                    container.appendChild(card);
                }
            }
        }
        
        // Focus first button
        setTimeout(() => {
            const firstBtn = container.querySelector('.guess-btn');
            if (firstBtn) window.focusManager.setFocus(firstBtn);
        }, 100);
    }

    makeGuess(position) {
        const currentTeam = gameState.currentTeam;
        const timeline = gameState.teams[currentTeam].timeline;
        const song = gameState.currentSong;
        
        let isCorrect = false;
        
        if (timeline.length === 0) {
            isCorrect = true;
        } else if (position === 0) {
            isCorrect = song.year <= timeline[0].year;
        } else if (position === timeline.length) {
            isCorrect = song.year >= timeline[timeline.length - 1].year;
        } else {
            isCorrect = song.year >= timeline[position - 1].year && song.year <= timeline[position].year;
        }
        
        // Stop video
        window.youtubeAPI.stopVideo();
        
        // Log gameplay
        const teamName = gameState.teams[currentTeam].name;
        const playlistOrYearRange = gameState.gameMode === 'playlist' 
            ? gameState.selectedPlaylist 
            : `${gameState.yearStart}-${gameState.yearEnd}`;
        this.logGamePlay(song.video_id, teamName, playlistOrYearRange, isCorrect);
        
        // Show result
        this.showResult(isCorrect, position);
    }

    showResult(isCorrect, position) {
        const song = gameState.currentSong;
        const modal = document.getElementById('result-modal');
        const title = document.getElementById('result-title');
        
        title.textContent = isCorrect ? 'RIGTIGT! 🎉' : 'FORKERT! ❌';
        title.className = `result-title ${isCorrect ? 'correct' : 'incorrect'}`;
        
        document.getElementById('reveal-song-title').textContent = song.title;
        document.getElementById('reveal-artist').textContent = song.artist;
        document.getElementById('reveal-year').textContent = song.year;
        
        modal.classList.remove('hidden');
        
        if (isCorrect) {
            this.playSuccessSound();
            this.launchConfetti();
            
            const currentTeam = gameState.currentTeam;
            gameState.teams[currentTeam].timeline.splice(position, 0, song);
            gameState.teams[currentTeam].score++;
            
            this.updateScores();
            
            // Check for winner
            if (gameState.teams[currentTeam].score >= 10) {
                setTimeout(() => this.showWinner(currentTeam), 2500);
                return;
            }
        }
        
        // Focus continue button
        setTimeout(() => {
            const continueBtn = document.getElementById('continue-game');
            window.focusManager.setFocus(continueBtn);
        }, 100);
    }

    continueGame() {
        document.getElementById('result-modal').classList.add('hidden');
        
        // Switch teams
        gameState.currentTeam = gameState.currentTeam === 1 ? 2 : 1;
        
        // Play next song
        setTimeout(() => this.playNextSong(), 300);
    }

    updateScores() {
        document.getElementById('header-team1-score').textContent = gameState.teams[1].score;
        document.getElementById('header-team2-score').textContent = gameState.teams[2].score;
    }

    showWinner(teamNum) {
        window.youtubeAPI.stopVideo();
        document.getElementById('result-modal').classList.add('hidden');
        
        const winnerName = gameState.teams[teamNum].name;
        document.getElementById('winner-name').textContent = winnerName;
        
        document.getElementById('final-team1-name').textContent = gameState.teams[1].name;
        document.getElementById('final-team1-score').textContent = gameState.teams[1].score;
        document.getElementById('final-team2-name').textContent = gameState.teams[2].name;
        document.getElementById('final-team2-score').textContent = gameState.teams[2].score;
        
        this.switchScreen('winner-screen');
        
        // Launch confetti for winner
        this.launchConfetti();
        
        setTimeout(() => {
            const playAgainBtn = document.getElementById('play-again');
            window.focusManager.setFocus(playAgainBtn);
        }, 100);
    }

    resetGame() {
        gameState.currentTeam = 1;
        gameState.teams[1].score = 0;
        gameState.teams[1].timeline = [];
        gameState.teams[2].score = 0;
        gameState.teams[2].timeline = [];
        gameState.currentSong = null;
        gameState.usedSongIds.clear();
        
        window.youtubeAPI.stopVideo();
        
        this.updateScores();
        this.switchScreen('setup-screen');
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        document.getElementById(screenId).classList.add('active');
        
        window.focusManager.reset();
        setTimeout(() => window.focusManager.focusFirst(), 200);
    }

    async markSongAsBroken(videoId) {
        try {
            await fetch(`${API_URL}/songs/${videoId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'broken' })
            });
        } catch (error) {
            console.error('Error marking song as broken:', error);
        }
    }

    async logGamePlay(videoId, teamName, playlist, guessedCorrectly) {
        try {
            await fetch(`${API_URL}/game-logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    playSuccessSound() {
        // Simple success sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 880;
            oscillator.type = 'triangle';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Audio error:', error);
        }
    }

    launchConfetti() {
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            
            setTimeout(() => {
                confetti({
                    particleCount: 50,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 }
                });
            }, 150);
            
            setTimeout(() => {
                confetti({
                    particleCount: 50,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 }
                });
            }, 300);
        }
    }
}

// Initialize game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.gameController = new GameController();
});
