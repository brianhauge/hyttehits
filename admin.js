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
    loadCategoriesForForms();
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
    } else if (tabName === 'categories') {
        loadCategories();
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
let categoriesForForms = [];

async function loadCategoriesForForms() {
    try {
        const data = await apiRequest('/admin/categories');
        categoriesForForms = data;
        populateCategoryCheckboxes();
    } catch (error) {
        console.error('Error loading categories for forms:', error);
    }
}

function populateCategoryCheckboxes() {
    const addContainer = document.getElementById('addCategoriesCheckboxes');
    const editContainer = document.getElementById('editCategoriesCheckboxes');
    
    const checkboxHTML = categoriesForForms.map(cat => `
        <div style="margin-bottom: 8px;">
            <label style="display: flex; align-items: center; cursor: pointer;">
                <input type="checkbox" name="category" value="${cat.id}" style="margin-right: 8px;">
                <span>${escapeHtml(cat.name)}${cat.description ? ` - ${escapeHtml(cat.description)}` : ''}</span>
            </label>
        </div>
    `).join('');
    
    addContainer.innerHTML = checkboxHTML;
    editContainer.innerHTML = checkboxHTML;
}

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
    
    tbody.innerHTML = songs.map(song => {
        // Format categories
        let categoriesText = '';
        if (song.categories && Array.isArray(song.categories) && song.categories.length > 0) {
            categoriesText = song.categories.map(c => c.name).join(', ');
        } else {
            categoriesText = '-';
        }
        
        return `
        <tr>
            <td>${escapeHtml(song.video_id)}</td>
            <td>${escapeHtml(song.title)}</td>
            <td>${escapeHtml(song.artist)}</td>
            <td>${escapeHtml(categoriesText)}</td>
            <td><span class="status-badge status-${song.status || 'unknown'}">${song.status || 'unknown'}</span></td>
            <td>${song.last_checked ? new Date(song.last_checked).toLocaleString() : 'Never'}</td>
            <td class="action-btns">
                <button class="btn btn-secondary" onclick="editSong('${song.video_id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteSong('${song.video_id}')">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
}

// Edit Song
function editSong(videoId) {
    const song = allSongs.find(s => s.video_id === videoId);
    if (!song) return;
    
    document.getElementById('editOriginalVideoId').value = videoId;
    document.getElementById('editSongId').value = song.id;
    document.getElementById('editVideoId').value = song.video_id;
    document.getElementById('editTitle').value = song.title;
    document.getElementById('editArtist').value = song.artist;
    document.getElementById('editYear').value = song.year;
    
    // Uncheck all checkboxes first
    document.querySelectorAll('#editCategoriesCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Check the categories that belong to this song
    if (song.categories && Array.isArray(song.categories)) {
        song.categories.forEach(cat => {
            const checkbox = document.querySelector(`#editCategoriesCheckboxes input[value="${cat.id}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    document.getElementById('editModal').classList.remove('hidden');
}

// Edit Form Handler
document.getElementById('editSongForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalVideoId = document.getElementById('editOriginalVideoId').value;
    
    // Get selected categories
    const selectedCategories = Array.from(
        document.querySelectorAll('#editCategoriesCheckboxes input[type="checkbox"]:checked')
    ).map(cb => parseInt(cb.value));
    
    if (selectedCategories.length === 0) {
        showMessage('editSongMessage', 'Please select at least one category', 'error');
        return;
    }
    
    const formData = {
        video_id: document.getElementById('editVideoId').value,
        title: document.getElementById('editTitle').value,
        artist: document.getElementById('editArtist').value,
        year: parseInt(document.getElementById('editYear').value),
        status: 'working',
        categories: selectedCategories
    };
    
    try {
        await apiRequest(`/admin/songs/${originalVideoId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        showMessage('editSongMessage', 'Song updated successfully!', 'success');
        setTimeout(() => {
            document.getElementById('editModal').classList.add('hidden');
            
            // Refresh the appropriate tab
            const activeTab = document.querySelector('.tab.active');
            if (activeTab) {
                const tabName = activeTab.textContent.trim();
                if (tabName.includes('All Songs')) {
                    loadAllSongs();
                } else if (tabName.includes('Broken Songs')) {
                    loadBrokenSongs();
                } else {
                    // Default: reload both to be safe
                    loadAllSongs();
                    loadBrokenSongs();
                }
            } else {
                loadAllSongs();
            }
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
        document.getElementById('categoryModal').classList.add('hidden');
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
    
    // Get selected categories
    const selectedCategories = Array.from(
        document.querySelectorAll('#addCategoriesCheckboxes input[type="checkbox"]:checked')
    ).map(cb => parseInt(cb.value));
    
    if (selectedCategories.length === 0) {
        showMessage('addSongMessage', 'Please select at least one category', 'error');
        return;
    }
    
    const formData = {
        video_id: document.getElementById('addVideoId').value,
        title: document.getElementById('addTitle').value,
        artist: document.getElementById('addArtist').value,
        year: parseInt(document.getElementById('addYear').value),
        categories: selectedCategories
    };
    
    try {
        await apiRequest('/admin/songs', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showMessage('addSongMessage', 'Song added successfully!', 'success');
        document.getElementById('addSongForm').reset();
        
        // Uncheck all category checkboxes
        document.querySelectorAll('#addCategoriesCheckboxes input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
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
    
    tbody.innerHTML = songs.map(song => {
        // Format categories
        let categoriesText = '';
        if (song.categories && Array.isArray(song.categories) && song.categories.length > 0) {
            categoriesText = song.categories.map(c => c.name).join(', ');
        } else {
            categoriesText = '-';
        }
        
        return `
        <tr>
            <td>${escapeHtml(song.video_id)}</td>
            <td>${escapeHtml(song.title)}</td>
            <td>${escapeHtml(song.artist)}</td>
            <td>${escapeHtml(categoriesText)}</td>
            <td>${song.last_checked ? new Date(song.last_checked).toLocaleString() : 'Never'}</td>
            <td class="action-btns">
                <button class="btn btn-success" onclick="findAlternative('${song.video_id}')">Find Alternative</button>
                <button class="btn btn-secondary" onclick="editSong('${song.video_id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteSong('${song.video_id}')">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
}

// Find Alternative - Automated
async function findAlternative(videoId) {
    try {
        // Show loading message
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>Finding Alternatives...</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <p>Searching for alternative videos...</p>
                <div class="loading-spinner" style="text-align: center; padding: 20px;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Add CSS animation for spinner
        if (!document.getElementById('spinner-animation')) {
            const style = document.createElement('style');
            style.id = 'spinner-animation';
            style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        
        // Call API to find alternatives
        const data = await apiRequest(`/admin/songs/${videoId}/find-alternative`, { method: 'POST' });
        
        // Update modal with search variations
        modal.querySelector('.modal-content').innerHTML = `
            <div class="modal-header">
                <h2>Search for Alternative Videos</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <p><strong>Original Song:</strong> ${escapeHtml(data.song.title)} - ${escapeHtml(data.song.artist)}</p>
            <p><strong>Current Video ID:</strong> ${escapeHtml(data.song.current_video_id)}</p>
            <hr>
            <p>Click the search links below to find alternative videos on YouTube:</p>
            <div style="margin: 20px 0;">
                ${data.search_variations ? data.search_variations.map((variation, index) => `
                    <div style="margin: 10px 0;">
                        <a href="${escapeHtml(variation.url)}" target="_blank" class="btn btn-primary" style="width: 100%; text-align: left; display: block; margin-bottom: 5px;">
                            🔍 ${escapeHtml(variation.query)}
                        </a>
                    </div>
                `).join('') : `
                    <a href="${escapeHtml(data.search_url)}" target="_blank" class="btn btn-primary">
                        🔍 Search on YouTube
                    </a>
                `}
            </div>
            <hr>
            <h3>How to use:</h3>
            <ol style="text-align: left; padding-left: 20px;">
                <li>Click one of the search links above</li>
                <li>Find a video that works</li>
                <li>Copy the video ID from the URL (after "v=" or "/watch?v=")</li>
                <li>Come back here and click "Edit" on this song</li>
                <li>Paste the new video ID and save</li>
            </ol>
        `;
        
    } catch (error) {
        console.error('Error finding alternative:', error);
        alert('Failed to find alternatives: ' + error.message);
        document.querySelectorAll('.modal').forEach(m => m.remove());
    }
}

// Replace video ID with alternative
async function replaceVideoId(oldVideoId, newVideoId) {
    if (!confirm(`Replace video ID ${oldVideoId} with ${newVideoId}?`)) {
        return;
    }
    
    try {
        await apiRequest(`/admin/songs/${oldVideoId}`, {
            method: 'PUT',
            body: JSON.stringify({
                video_id: newVideoId,
                status: 'working'
            })
        });
        
        alert('Video ID updated successfully!');
        
        // Close modal and reload broken songs
        document.querySelectorAll('.modal').forEach(m => m.remove());
        loadBrokenSongs();
        
    } catch (error) {
        console.error('Error updating video ID:', error);
        alert('Failed to update video ID: ' + error.message);
    }
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
        const category = document.getElementById('gameCategoryFilter').value;
        
        let url = `/admin/game-logs?limit=${gameLimit}&offset=${gamePage * gameLimit}`;
        if (category) url += `&category=${category}`;
        
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
        document.getElementById('gameModernPlays').textContent = stats.byCategory?.Modern || 0;
        document.getElementById('gameClassicPlays').textContent = stats.byCategory?.Classic || 0;
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
            <td>${escapeHtml(log.category)}</td>
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

document.getElementById('gameCategoryFilter').addEventListener('change', () => {
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

// ============================================
// CATEGORY MANAGEMENT
// ============================================

let allCategories = [];

async function loadCategories() {
    try {
        const data = await apiRequest('/admin/categories');
        allCategories = data;
        displayCategories(allCategories);
    } catch (error) {
        console.error('Error loading categories:', error);
        document.getElementById('categoriesTableBody').innerHTML = 
            `<tr><td colspan="6" class="loading">Error loading categories: ${error.message}</td></tr>`;
    }
}

function displayCategories(categories) {
    const tbody = document.getElementById('categoriesTableBody');
    
    if (categories.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No categories found</td></tr>';
        return;
    }
    
    tbody.innerHTML = categories.map(category => `
        <tr>
            <td>${category.id}</td>
            <td>${escapeHtml(category.name)}</td>
            <td>${escapeHtml(category.description || '')}</td>
            <td>${category.song_count}</td>
            <td>${new Date(category.created_at).toLocaleString()}</td>
            <td class="action-btns">
                <button class="btn btn-secondary" onclick="editCategory(${category.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteCategory(${category.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Add Category Button
document.getElementById('addCategoryBtn').addEventListener('click', () => {
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryDescription').value = '';
    document.getElementById('categoryModal').classList.remove('hidden');
});

// Edit Category
function editCategory(id) {
    const category = allCategories.find(c => c.id === id);
    if (!category) return;
    
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryModal').classList.remove('hidden');
}

// Delete Category
async function deleteCategory(id) {
    const category = allCategories.find(c => c.id === id);
    if (!category) return;
    
    if (parseInt(category.song_count) > 0) {
        alert(`Cannot delete category "${category.name}" because it has ${category.song_count} songs associated with it. Remove songs from this category first.`);
        return;
    }
    
    if (!confirm(`Are you sure you want to delete category "${category.name}"?`)) {
        return;
    }
    
    try {
        await apiRequest(`/admin/categories/${id}`, { method: 'DELETE' });
        alert('Category deleted successfully!');
        loadCategories();
    } catch (error) {
        alert(`Error deleting category: ${error.message}`);
    }
}

// Category Form Submit
document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const categoryId = document.getElementById('categoryId').value;
    const formData = {
        name: document.getElementById('categoryName').value,
        description: document.getElementById('categoryDescription').value
    };
    
    try {
        if (categoryId) {
            // Update
            await apiRequest(`/admin/categories/${categoryId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            showMessage('categoryMessage', 'Category updated successfully!', 'success');
        } else {
            // Create
            await apiRequest('/admin/categories', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            showMessage('categoryMessage', 'Category created successfully!', 'success');
        }
        
        setTimeout(() => {
            document.getElementById('categoryModal').classList.add('hidden');
            loadCategories();
        }, 1500);
    } catch (error) {
        showMessage('categoryMessage', error.message, 'error');
    }
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
