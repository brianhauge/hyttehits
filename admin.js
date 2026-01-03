// API Base URL
const API_BASE = '/api';

// Authentication
const Auth = {
    getToken() {
        return localStorage.getItem('adminToken');
    },
    
    setToken(token) {
        localStorage.setItem('adminToken', token);
    },
    
    removeToken() {
        localStorage.removeItem('adminToken');
    },
    
    async login(username, password) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }
        
        const data = await response.json();
        this.setToken(data.token);
        return data;
    },
    
    async logout() {
        const token = this.getToken();
        if (token) {
            try {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        this.removeToken();
    },
    
    async verify() {
        const token = this.getToken();
        if (!token) return false;
        
        try {
            const response = await fetch(`${API_BASE}/auth/verify`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
};

// API Helper
async function apiRequest(endpoint, options = {}) {
    const token = Auth.getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        Auth.removeToken();
        showLogin();
        throw new Error('Authentication required');
    }
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
}

// UI Management
function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminScreen').classList.add('hidden');
}

function showAdmin() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminScreen').classList.remove('hidden');
    loadAllSongs();
    loadStats();
}

function showMessage(elementId, message, type = 'success') {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `message ${type}`;
    setTimeout(() => {
        element.textContent = '';
        element.className = 'message';
    }, 5000);
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Load data if needed
    if (tabName === 'broken') {
        loadBrokenSongs();
    } else if (tabName === 'stats') {
        loadStats();
    }
}

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('loginError');
    
    try {
        await Auth.login(username, password);
        document.getElementById('welcomeMessage').textContent = `Welcome, ${username}`;
        showAdmin();
    } catch (error) {
        errorElement.textContent = error.message;
    }
});

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await Auth.logout();
    showLogin();
});

// Tab Buttons
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
    });
});

// Search Functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#songsTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// Load All Songs
let allSongs = [];

async function loadAllSongs() {
    try {
        const data = await apiRequest('/songs');
        allSongs = data.songs;
        displaySongs(allSongs);
    } catch (error) {
        console.error('Error loading songs:', error);
        document.getElementById('songsTableBody').innerHTML = 
            `<tr><td colspan="7" class="loading">Error loading songs: ${error.message}</td></tr>`;
    }
}

function displaySongs(songs) {
    const tbody = document.getElementById('songsTableBody');
    
    if (songs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No songs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = songs.map(song => `
        <tr>
            <td>${escapeHtml(song.video_id)}</td>
            <td>${escapeHtml(song.title)}</td>
            <td>${escapeHtml(song.artist)}</td>
            <td>${escapeHtml(song.category)}</td>
            <td><span class="status-badge status-${song.status || 'unknown'}">${song.status || 'unknown'}</span></td>
            <td>${song.last_checked ? new Date(song.last_checked).toLocaleString() : 'Never'}</td>
            <td class="action-btns">
                <button class="btn btn-secondary" onclick="editSong('${song.video_id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteSong('${song.video_id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Edit Song
function editSong(videoId) {
    const song = allSongs.find(s => s.video_id === videoId);
    if (!song) return;
    
    document.getElementById('editOriginalVideoId').value = videoId;
    document.getElementById('editVideoId').value = song.video_id;
    document.getElementById('editTitle').value = song.title;
    document.getElementById('editArtist').value = song.artist;
    document.getElementById('editCategory').value = song.category;
    
    document.getElementById('editModal').classList.remove('hidden');
}

// Edit Form Handler
document.getElementById('editSongForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalVideoId = document.getElementById('editOriginalVideoId').value;
    const formData = {
        video_id: document.getElementById('editVideoId').value,
        title: document.getElementById('editTitle').value,
        artist: document.getElementById('editArtist').value,
        category: document.getElementById('editCategory').value
    };
    
    try {
        await apiRequest(`/admin/songs/${originalVideoId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        showMessage('editSongMessage', 'Song updated successfully!', 'success');
        setTimeout(() => {
            document.getElementById('editModal').classList.add('hidden');
            loadAllSongs();
        }, 1500);
    } catch (error) {
        showMessage('editSongMessage', error.message, 'error');
    }
});

// Modal Close Handlers
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('editModal').classList.add('hidden');
    });
});

// Delete Song
async function deleteSong(videoId) {
    if (!confirm(`Are you sure you want to delete this song?\n\nVideo ID: ${videoId}`)) {
        return;
    }
    
    try {
        await apiRequest(`/admin/songs/${videoId}`, { method: 'DELETE' });
        alert('Song deleted successfully!');
        loadAllSongs();
    } catch (error) {
        alert(`Error deleting song: ${error.message}`);
    }
}

// Add Song Form Handler
document.getElementById('addSongForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        video_id: document.getElementById('addVideoId').value,
        title: document.getElementById('addTitle').value,
        artist: document.getElementById('addArtist').value,
        category: document.getElementById('addCategory').value
    };
    
    try {
        await apiRequest('/admin/songs', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showMessage('addSongMessage', 'Song added successfully!', 'success');
        document.getElementById('addSongForm').reset();
        
        // Reload songs in background
        loadAllSongs();
    } catch (error) {
        showMessage('addSongMessage', error.message, 'error');
    }
});

// Check All Songs
document.getElementById('checkAllBtn').addEventListener('click', async () => {
    if (!confirm('This will check all songs for availability. This may take several minutes. Continue?')) {
        return;
    }
    
    const progressContainer = document.getElementById('checkProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const checkBtn = document.getElementById('checkAllBtn');
    
    progressContainer.classList.remove('hidden');
    checkBtn.disabled = true;
    
    try {
        // Start the check
        await apiRequest('/admin/songs/check-all', { method: 'POST' });
        
        // Poll for progress (we'll check every 2 seconds)
        let completed = 0;
        const total = allSongs.length;
        
        const pollInterval = setInterval(async () => {
            try {
                const data = await apiRequest('/songs');
                const checkedSongs = data.songs.filter(s => s.last_checked);
                completed = checkedSongs.length;
                
                const percentage = (completed / total) * 100;
                progressBar.style.width = `${percentage}%`;
                progressText.textContent = `Checked ${completed} of ${total} songs (${percentage.toFixed(1)}%)`;
                
                if (completed >= total) {
                    clearInterval(pollInterval);
                    progressText.textContent = 'Check completed!';
                    checkBtn.disabled = false;
                    
                    setTimeout(() => {
                        progressContainer.classList.add('hidden');
                        loadAllSongs();
                        loadStats();
                    }, 2000);
                }
            } catch (error) {
                console.error('Error polling progress:', error);
            }
        }, 2000);
        
    } catch (error) {
        alert(`Error checking songs: ${error.message}`);
        progressContainer.classList.add('hidden');
        checkBtn.disabled = false;
    }
});

// Load Broken Songs
async function loadBrokenSongs() {
    try {
        const data = await apiRequest('/admin/songs/broken');
        displayBrokenSongs(data.songs);
    } catch (error) {
        console.error('Error loading broken songs:', error);
        document.getElementById('brokenSongsTableBody').innerHTML = 
            `<tr><td colspan="6" class="loading">Error loading broken songs: ${error.message}</td></tr>`;
    }
}

function displayBrokenSongs(songs) {
    const tbody = document.getElementById('brokenSongsTableBody');
    
    if (songs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No broken songs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = songs.map(song => `
        <tr>
            <td>${escapeHtml(song.video_id)}</td>
            <td>${escapeHtml(song.title)}</td>
            <td>${escapeHtml(song.artist)}</td>
            <td>${escapeHtml(song.category)}</td>
            <td>${song.last_checked ? new Date(song.last_checked).toLocaleString() : 'Never'}</td>
            <td class="action-btns">
                <button class="btn btn-success" onclick="findAlternative('${escapeHtml(song.title)}', '${escapeHtml(song.artist)}')">Find Alternative</button>
                <button class="btn btn-secondary" onclick="editSong('${song.video_id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteSong('${song.video_id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Find Alternative
function findAlternative(title, artist) {
    const query = encodeURIComponent(`${title} ${artist}`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
}

// Refresh Broken Songs
document.getElementById('refreshBrokenBtn').addEventListener('click', loadBrokenSongs);

// Load Statistics
async function loadStats() {
    try {
        const data = await apiRequest('/admin/stats');
        
        document.getElementById('statTotal').textContent = data.total;
        document.getElementById('statModern').textContent = data.modern;
        document.getElementById('statClassic').textContent = data.classic;
        document.getElementById('statWorking').textContent = data.working;
        document.getElementById('statBroken').textContent = data.broken;
        document.getElementById('statUnchecked').textContent = data.unchecked;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Refresh Stats
document.getElementById('refreshStatsBtn').addEventListener('click', loadStats);

// Helper Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize
(async function init() {
    const isAuthenticated = await Auth.verify();
    
    if (isAuthenticated) {
        showAdmin();
    } else {
        showLogin();
    }
})();
