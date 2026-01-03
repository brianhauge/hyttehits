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
    } else if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'audit') {
        loadAuditLogs();
    } else if (tabName === 'game') {
        loadGameLogs();
        loadGameStats();
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
        allSongs = data;
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
        document.getElementById('userModal').classList.add('hidden');
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
                const checkedSongs = data.filter(s => s.last_checked);
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
        displayBrokenSongs(data);
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

// ============================================
// USER ADMINISTRATION
// ============================================

let allUsers = [];

async function loadUsers() {
    try {
        const data = await apiRequest('/admin/users');
        allUsers = data;
        displayUsers(allUsers);
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTableBody').innerHTML = 
            `<tr><td colspan="6" class="loading">Error loading users: ${error.message}</td></tr>`;
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.role)}</td>
            <td>${new Date(user.created_at).toLocaleString()}</td>
            <td>${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
            <td class="action-btns">
                <button class="btn btn-secondary" onclick="editUser(${user.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteUser(${user.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Add User Button
document.getElementById('addUserBtn').addEventListener('click', () => {
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('userId').value = '';
    document.getElementById('userUsername').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('passwordOptional').classList.add('hidden');
    document.getElementById('userRole').value = 'admin';
    document.getElementById('userModal').classList.remove('hidden');
});

// Edit User
function editUser(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    
    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = user.id;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('passwordOptional').classList.remove('hidden');
    document.getElementById('userRole').value = user.role;
    document.getElementById('userModal').classList.remove('hidden');
}

// Delete User
async function deleteUser(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
        return;
    }
    
    try {
        await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
        alert('User deleted successfully!');
        loadUsers();
    } catch (error) {
        alert(`Error deleting user: ${error.message}`);
    }
}

// User Form Submit
document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const formData = {
        username: document.getElementById('userUsername').value,
        password: document.getElementById('userPassword').value,
        role: document.getElementById('userRole').value
    };
    
    // Remove password if empty (for edit)
    if (!formData.password && userId) {
        delete formData.password;
    }
    
    try {
        if (userId) {
            // Update
            await apiRequest(`/admin/users/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            showMessage('userMessage', 'User updated successfully!', 'success');
        } else {
            // Create
            await apiRequest('/admin/users', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            showMessage('userMessage', 'User created successfully!', 'success');
        }
        
        setTimeout(() => {
            document.getElementById('userModal').classList.add('hidden');
            loadUsers();
        }, 1500);
    } catch (error) {
        showMessage('userMessage', error.message, 'error');
    }
});

// ============================================
// AUDIT LOGS
// ============================================

let auditPage = 0;
const auditLimit = 50;

async function loadAuditLogs() {
    try {
        const action = document.getElementById('auditActionFilter').value;
        const resourceType = document.getElementById('auditResourceFilter').value;
        
        let url = `/admin/audit-logs?limit=${auditLimit}&offset=${auditPage * auditLimit}`;
        if (action) url += `&action=${action}`;
        if (resourceType) url += `&resource_type=${resourceType}`;
        
        const data = await apiRequest(url);
        displayAuditLogs(data);
    } catch (error) {
        console.error('Error loading audit logs:', error);
        document.getElementById('auditLogsTableBody').innerHTML = 
            `<tr><td colspan="7" class="loading">Error loading audit logs: ${error.message}</td></tr>`;
    }
}

function displayAuditLogs(data) {
    const tbody = document.getElementById('auditLogsTableBody');
    
    if (data.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No audit logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.logs.map(log => {
        let details = '';
        try {
            const detailsObj = JSON.parse(log.details);
            details = JSON.stringify(detailsObj, null, 2);
        } catch (e) {
            details = log.details || '';
        }
        
        return `
            <tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${escapeHtml(log.username)}</td>
                <td>${escapeHtml(log.action)}</td>
                <td>${escapeHtml(log.resource_type)}</td>
                <td>${escapeHtml(log.resource_id || '')}</td>
                <td>${escapeHtml(log.ip_address || '')}</td>
                <td><pre style="margin: 0; font-size: 11px; max-width: 200px; overflow: auto;">${escapeHtml(details)}</pre></td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('auditPageInfo').textContent = `Page ${auditPage + 1} (${data.logs.length} of ${data.total})`;
    document.getElementById('auditPrevBtn').disabled = auditPage === 0;
    document.getElementById('auditNextBtn').disabled = (auditPage + 1) * auditLimit >= data.total;
}

document.getElementById('refreshAuditBtn').addEventListener('click', () => {
    auditPage = 0;
    loadAuditLogs();
});

document.getElementById('auditActionFilter').addEventListener('change', () => {
    auditPage = 0;
    loadAuditLogs();
});

document.getElementById('auditResourceFilter').addEventListener('change', () => {
    auditPage = 0;
    loadAuditLogs();
});

document.getElementById('auditPrevBtn').addEventListener('click', () => {
    if (auditPage > 0) {
        auditPage--;
        loadAuditLogs();
    }
});

document.getElementById('auditNextBtn').addEventListener('click', () => {
    auditPage++;
    loadAuditLogs();
});

// ============================================
// GAME LOGS
// ============================================

let gamePage = 0;
const gameLimit = 50;

async function loadGameLogs() {
    try {
        const playlist = document.getElementById('gamePlaylistFilter').value;
        
        let url = `/admin/game-logs?limit=${gameLimit}&offset=${gamePage * gameLimit}`;
        if (playlist) url += `&playlist=${playlist}`;
        
        const data = await apiRequest(url);
        displayGameLogs(data);
    } catch (error) {
        console.error('Error loading game logs:', error);
        document.getElementById('gameLogsTableBody').innerHTML = 
            `<tr><td colspan="6" class="loading">Error loading game logs: ${error.message}</td></tr>`;
    }
}

async function loadGameStats() {
    try {
        const stats = await apiRequest('/admin/game-stats');
        
        document.getElementById('gameTotalPlays').textContent = stats.totalPlays || 0;
        document.getElementById('gameModernPlays').textContent = stats.byPlaylist?.modern || 0;
        document.getElementById('gameClassicPlays').textContent = stats.byPlaylist?.classic || 0;
        document.getElementById('gameSuccessRate').textContent = stats.successRate ? 
            `${stats.successRate.percentage}%` : '0%';
        
        // Display most played songs
        if (stats.mostPlayed && stats.mostPlayed.length > 0) {
            const tbody = document.getElementById('mostPlayedTableBody');
            tbody.innerHTML = stats.mostPlayed.map(song => `
                <tr>
                    <td>${escapeHtml(song.title)}</td>
                    <td>${escapeHtml(song.artist)}</td>
                    <td>${song.year}</td>
                    <td>${song.play_count}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading game stats:', error);
    }
}

function displayGameLogs(data) {
    const tbody = document.getElementById('gameLogsTableBody');
    
    if (data.logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No game logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.logs.map(log => `
        <tr>
            <td>${new Date(log.created_at).toLocaleString()}</td>
            <td>${escapeHtml(log.title)}</td>
            <td>${escapeHtml(log.artist)}</td>
            <td>${escapeHtml(log.team_name || 'N/A')}</td>
            <td>${escapeHtml(log.playlist)}</td>
            <td>${log.guessed_correctly === null ? 'N/A' : (log.guessed_correctly ? '✓' : '✗')}</td>
        </tr>
    `).join('');
    
    document.getElementById('gamePageInfo').textContent = `Page ${gamePage + 1} (${data.logs.length} of ${data.total})`;
    document.getElementById('gamePrevBtn').disabled = gamePage === 0;
    document.getElementById('gameNextBtn').disabled = (gamePage + 1) * gameLimit >= data.total;
}

document.getElementById('refreshGameBtn').addEventListener('click', () => {
    gamePage = 0;
    loadGameLogs();
    loadGameStats();
});

document.getElementById('gamePlaylistFilter').addEventListener('change', () => {
    gamePage = 0;
    loadGameLogs();
});

document.getElementById('gamePrevBtn').addEventListener('click', () => {
    if (gamePage > 0) {
        gamePage--;
        loadGameLogs();
    }
});

document.getElementById('gameNextBtn').addEventListener('click', () => {
    gamePage++;
    loadGameLogs();
});

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
