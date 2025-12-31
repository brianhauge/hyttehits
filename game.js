// Game State
const gameState = {
    currentTeam: 1,
    teams: {
        1: { name: 'Hold 1', score: 0, timeline: [] },
        2: { name: 'Hold 2', score: 0, timeline: [] }
    },
    currentSong: null,
    usedSongIds: new Set(),
    selectedPlaylist: 'modern' // 'modern' or 'classic'
};

// Initialize game
function initGame() {
    console.log(`Loaded ${window.youtubeAPI.songDatabase.length} modern songs and ${window.youtubeAPI.classicSongDatabase.length} classic songs from YouTube`);

    // Setup event listeners
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('play-song').addEventListener('click', playNextSong);
    document.getElementById('continue-game').addEventListener('click', continueGame);
    document.getElementById('play-again').addEventListener('click', resetGame);
}

// Start the game
function startGame() {
    const team1Name = document.getElementById('team1-name').value || 'Hold 1';
    const team2Name = document.getElementById('team2-name').value || 'Hold 2';
    const playlistSelect = document.getElementById('playlist-select').value;
    
    gameState.teams[1].name = team1Name;
    gameState.teams[2].name = team2Name;
    gameState.selectedPlaylist = playlistSelect;
    
    // Update UI
    document.getElementById('team1-name-display').textContent = team1Name;
    document.getElementById('team2-name-display').textContent = team2Name;
    document.getElementById('team1-timeline-header').textContent = `${team1Name} Tidslinje`;
    document.getElementById('team2-timeline-header').textContent = `${team2Name} Tidslinje`;
    
    // Switch to game screen
    document.getElementById('setup-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    updateTurnDisplay();
}

// Get a random song that hasn't been used
function getRandomSong() {
    // Select the appropriate database based on user's choice
    const database = gameState.selectedPlaylist === 'classic' 
        ? window.youtubeAPI.classicSongDatabase 
        : window.youtubeAPI.songDatabase;
    
    const availableSongs = database.filter(song => !gameState.usedSongIds.has(song.videoId));
    if (availableSongs.length === 0) {
        alert('Ingen flere sange tilgængelige! Spillet nulstiller sangpuljen.');
        gameState.usedSongIds.clear();
        return getRandomSong();
    }
    return availableSongs[Math.floor(Math.random() * availableSongs.length)];
}

// Play next song
async function playNextSong() {
    const song = getRandomSong();
    gameState.currentSong = song;
    gameState.usedSongIds.add(song.videoId);
    
    document.getElementById('play-song').disabled = true;
    
    // Show video modal
    document.getElementById('video-modal').classList.remove('hidden');
    
    // Show guess options BEFORE loading video
    showGuessOptions();
    
    // Play on YouTube
    try {
        await window.youtubeAPI.playVideo(song.videoId);
    } catch (error) {
        console.error('Error playing video:', error);
        // Hide modal and try next song
        document.getElementById('video-modal').classList.add('hidden');
        setTimeout(() => {
            playNextSong();
        }, 1000);
        return;
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
            // Add button for position
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
            
            // Add year card after button (except after last button)
            if (i < timeline.length) {
                const yearCard = document.createElement('div');
                yearCard.className = 'guess-year-card';
                yearCard.innerHTML = `
                    <div class="year">${timeline[i].year}</div>
                    <div class="song-title">${timeline[i].title}</div>
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
    
    // Stop playback and hide video modal
    window.youtubeAPI.stopVideo();
    document.getElementById('video-modal').classList.add('hidden');
    
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
    
    updateTimeline();
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
    updateTurnDisplay();
    
    // Reset for next song
    document.getElementById('play-song').disabled = false;
}

// Update timeline display
function updateTimeline() {
    for (let teamNum = 1; teamNum <= 2; teamNum++) {
        const timeline = gameState.teams[teamNum].timeline;
        const container = document.getElementById(`team${teamNum}-cards`);
        container.innerHTML = '';
        
        timeline.forEach(song => {
            const card = document.createElement('div');
            card.className = 'year-card';
            card.innerHTML = `
                <div class="year">${song.year}</div>
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            `;
            container.appendChild(card);
        });
    }
}

// Update scores
function updateScores() {
    document.getElementById('team1-points').textContent = gameState.teams[1].score;
    document.getElementById('team2-points').textContent = gameState.teams[2].score;
}

// Update turn display
function updateTurnDisplay() {
    const currentTeamName = gameState.teams[gameState.currentTeam].name;
    document.getElementById('current-team').textContent = currentTeamName;
    
    // Update play button text
    document.getElementById('play-song').innerHTML = `Afspil Sang - <span id="current-team">${currentTeamName}</span>s Tur`;
    
    // Highlight active team
    for (let i = 1; i <= 2; i++) {
        const scoreDiv = document.getElementById(`team${i}-score`);
        if (i === gameState.currentTeam) {
            scoreDiv.classList.add('active');
        } else {
            scoreDiv.classList.remove('active');
        }
    }
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
    updateTimeline();
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initGame);
