-- Create songs table
CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    video_id VARCHAR(50) NOT NULL UNIQUE,
    playlist VARCHAR(50) NOT NULL DEFAULT 'modern', -- 'modern' or 'classic'
    status VARCHAR(20) NOT NULL DEFAULT 'working', -- 'working' or 'broken'
    last_checked TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_songs_playlist ON songs(playlist);
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
