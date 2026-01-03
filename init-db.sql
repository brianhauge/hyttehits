-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    video_id VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'working', -- 'working' or 'broken'
    last_checked TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_video_id ON songs(video_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create users table for admin authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT NULL
);

-- Create index on username for faster lookups
CREATE INDEX idx_users_username ON users(username);

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on token for faster lookups
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Create audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'song', 'user', 'auth', etc.
    resource_id VARCHAR(255), -- ID of the affected resource
    details TEXT, -- JSON string with additional details
    ip_address VARCHAR(45), -- IPv4 or IPv6
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create game_logs table for tracking song plays
CREATE TABLE IF NOT EXISTS game_logs (
    id SERIAL PRIMARY KEY,
    video_id VARCHAR(50) NOT NULL REFERENCES songs(video_id) ON DELETE CASCADE,
    team_name VARCHAR(100), -- Team that played the song
    category VARCHAR(50) NOT NULL, -- Category name (e.g., 'Modern', 'Classic')
    guessed_correctly BOOLEAN, -- Whether the guess was correct
    session_id VARCHAR(255), -- Browser session ID
    ip_address VARCHAR(45), -- IPv4 or IPv6
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for game logs
CREATE INDEX idx_game_logs_video_id ON game_logs(video_id);
CREATE INDEX idx_game_logs_category ON game_logs(category);
CREATE INDEX idx_game_logs_created_at ON game_logs(created_at);
CREATE INDEX idx_game_logs_session_id ON game_logs(session_id);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create song_categories junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS song_categories (
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (song_id, category_id)
);

-- Create indexes for song_categories
CREATE INDEX idx_song_categories_song_id ON song_categories(song_id);
CREATE INDEX idx_song_categories_category_id ON song_categories(category_id);

-- Insert default categories (migrating from playlist field)
INSERT INTO categories (name, description) VALUES
    ('Modern', 'Modern songs (2016-2025)'),
    ('Classic', 'Classic songs (1952-2025)')
ON CONFLICT (name) DO NOTHING;
