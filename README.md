# Hytte Hits - Music Party Game

A web-based implementation of the Hytte Hits music party game with YouTube integration. Two teams compete to guess when songs were released by placing them in chronological order on their timeline.

## Features

- Two-team gameplay
- YouTube integration for playing real music
- PostgreSQL database with 388 songs from modern (2016-2025) and classic (1952-2025) playlists
- Automatic song status tracking (working/broken)
- Interactive timeline showing guessed years in ascending order
- Guess if a song was released before, between, or after existing years
- Score tracking and winner declaration
- Responsive design
- RESTful API for song management
- **Admin panel for song management** (add, edit, delete, bulk check, find alternatives)

## Architecture

- **Frontend**: HTML5, CSS3, JavaScript (Nginx)
- **Backend**: Node.js with Express
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose

## Setup Instructions

### Prerequisites

- Docker and Docker Compose installed
- Port 8081 (web), 3000 (API), and 5432 (PostgreSQL) available

### Quick Start

1. **Clone the repository**
   ```bash
   cd hyttehits
   ```

2. **Start all services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will:
   - Start PostgreSQL database
   - Initialize the database schema
   - Start the Node.js API server
   - Start the Nginx web server

3. **Populate the database with songs**
   ```bash
   docker exec hyttehits-api node populate-db.js
   ```

4. **Create an admin user**
   ```bash
   docker exec hyttehits-api node create-admin.js <username> <password>
   ```
   
   Example:
   ```bash
   docker exec hyttehits-api node create-admin.js admin Admin123!
   ```
   
   Note: Password must be at least 8 characters long.

5. **Play the game**
   - Open your browser and go to `http://localhost:8081`
   - Enter team names
   - Select playlist (Modern or Classic)
   - Click "Start Game"
   - Enjoy!

6. **Access the admin panel**
   - Go to `http://localhost:8081/admin.html`
   - Login with your admin credentials
   - Manage songs (add, edit, delete, check availability, find alternatives)

### Development Setup

To run the API server locally for development:

```bash
cd api
npm install
DATABASE_URL=postgresql://hyttehits:hyttehits123@localhost:5432/hyttehits npm start
```

## How to Play

1. **Setup**: Two teams enter their names and select a playlist
2. **Play a Song**: The current team hears a random track from the selected playlist
3. **Make a Guess**: The team guesses where the song belongs in their timeline:
   - Before all existing years
   - Between two years
   - After all existing years
4. **Check Result**: The song's actual year is revealed
   - If correct, the song is added to the timeline and the team scores a point
   - If incorrect, the team doesn't score and loses their turn
5. **Switch Teams**: Play alternates between teams
6. **Win**: First team to correctly place 10 songs in chronological order wins!

## Database Schema

### Songs Table

| Column       | Type      | Description                           |
|--------------|-----------|---------------------------------------|
| id           | SERIAL    | Primary key                           |
| title        | VARCHAR   | Song title                            |
| artist       | VARCHAR   | Artist name                           |
| year         | INTEGER   | Release year                          |
| video_id     | VARCHAR   | YouTube video ID (unique)             |
| playlist     | VARCHAR   | Playlist type (modern/classic)        |
| status       | VARCHAR   | Song status (working/broken)          |
| last_checked | TIMESTAMP | Last time status was checked          |
| created_at   | TIMESTAMP | Record creation time                  |
| updated_at   | TIMESTAMP | Last update time                      |

### Users Table

| Column        | Type      | Description                           |
|---------------|-----------|---------------------------------------|
| id            | SERIAL    | Primary key                           |
| username      | VARCHAR   | Username (unique)                     |
| password_hash | VARCHAR   | Bcrypt hashed password                |
| role          | VARCHAR   | User role (admin)                     |
| created_at    | TIMESTAMP | Account creation time                 |
| last_login    | TIMESTAMP | Last login time                       |

### Sessions Table

| Column      | Type      | Description                           |
|-------------|-----------|---------------------------------------|
| id          | SERIAL    | Primary key                           |
| user_id     | INTEGER   | Foreign key to users table            |
| token       | VARCHAR   | Session token (UUID, unique)          |
| expires_at  | TIMESTAMP | Token expiration time                 |
| created_at  | TIMESTAMP | Session creation time                 |

## Admin Panel

### Accessing the Admin Panel

1. Navigate to `http://localhost:8081/admin.html`
2. Login with your admin credentials
3. Manage your song database with ease!

### Admin Features

#### All Songs Tab
- View all songs in the database
- Search and filter songs
- Edit song details (title, artist, category, video ID)
- Delete songs
- Check all songs for YouTube availability (bulk operation)

#### Add Song Tab
- Add new songs to the database
- Required fields: YouTube Video ID, Title, Artist, Category
- Automatic validation

#### Broken Songs Tab
- View all songs marked as "broken" (unavailable on YouTube)
- Find alternative videos on YouTube with one click
- Edit video IDs to update with working alternatives
- Delete songs that can't be fixed

#### Statistics Tab
- View database statistics in real-time
- Total songs count
- Songs by category (Modern/Classic)
- Working vs Broken songs count
- Unchecked songs count

### Admin API Authentication

The admin panel uses token-based authentication:
- Login with username/password to receive a session token
- Token expires after 24 hours
- Token is stored in browser localStorage
- All admin operations require valid authentication

### Creating Additional Admin Users

```bash
docker exec hyttehits-api node create-admin.js <username> <password>
```

Note: The script will prevent duplicate usernames and enforce minimum password length of 8 characters.

## API Endpoints

### Public Endpoints

#### Get All Songs
```
GET /api/songs?playlist={modern|classic}&status={working|broken}
```

#### Get Random Song
```
GET /api/songs/random?playlist={modern|classic}&exclude={videoId1,videoId2}
```

#### Get Song by Video ID
```
GET /api/songs/:videoId
```

#### Update Song Status
```
PATCH /api/songs/:videoId/status
Body: { "status": "working" | "broken" }
```

### Authentication Endpoints

#### Login
```
POST /api/auth/login
Body: { "username": "admin", "password": "password123" }
Response: { "token": "uuid-token", "user": { "id": 1, "username": "admin", "role": "admin" } }
```

#### Logout
```
POST /api/auth/logout
Headers: { "Authorization": "Bearer <token>" }
```

#### Verify Token
```
GET /api/auth/verify
Headers: { "Authorization": "Bearer <token>" }
```

### Protected Admin Endpoints

All admin endpoints require `Authorization: Bearer <token>` header.

#### Add New Song
```
POST /api/admin/songs
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "title": "Song Title",
  "artist": "Artist Name",
  "year": 2024,
  "video_id": "YouTube_Video_ID",
  "category": "Modern"
}
```

#### Update Song
```
PUT /api/admin/songs/:videoId
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "video_id": "new_video_id",
  "title": "Updated Title",
  "artist": "Updated Artist",
  "category": "Classic"
}
```

#### Delete Song
```
DELETE /api/admin/songs/:videoId
Headers: { "Authorization": "Bearer <token>" }
```

#### Check All Songs
```
POST /api/admin/songs/check-all
Headers: { "Authorization": "Bearer <token>" }
```
Checks all songs for YouTube embeddability (runs in background).

#### Get Broken Songs
```
GET /api/admin/songs/broken
Headers: { "Authorization": "Bearer <token>" }
```

#### Get Database Statistics
```
GET /api/admin/stats
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "total": 388,
  "modern": 136,
  "classic": 252,
  "working": 350,
  "broken": 10,
  "unchecked": 28
}
```

## Automatic Song Status Management

The application automatically tracks song availability:
- When a YouTube video fails to load, the song is marked as "broken" in the database
- Only "working" songs are returned in random song queries
- This ensures a smooth gameplay experience without broken videos

## Playlists

### Modern Playlist (2016-2025)
150+ popular songs from recent years including hits from:
- The Weeknd, Taylor Swift, Drake, Olivia Rodrigo, Harry Styles, and many more!

### Classic Playlist (1950s-2015)
Iconic songs spanning 60+ years of music history including:
- The Beatles, Queen, Michael Jackson, Madonna, and more!

## File Structure

```
hyttehits/
├── api/
│   ├── package.json       # API dependencies (express, pg, bcrypt, uuid, axios)
│   ├── server.js          # Express API server with auth & admin endpoints
│   ├── populate-db.js     # Database population script
│   └── create-admin.js    # Admin user creation script
├── docker-compose.yml     # Docker services configuration
├── Dockerfile             # Web server container
├── Dockerfile.api         # API server container
├── init-db.sql           # Database schema (songs, users, sessions tables)
├── songs-data.sql        # Song data (388 songs)
├── index.html            # Main game HTML structure
├── styles.css            # Game styling and layout
├── game.js               # Game logic and API integration
├── youtube.js            # YouTube API integration
├── admin.html            # Admin panel HTML structure
├── admin.css             # Admin panel styling
├── admin.js              # Admin panel logic and API integration
├── nginx.conf            # Nginx configuration with API proxy
└── README.md             # This file
```

## Troubleshooting

### Videos won't play
- Check that the API server is running: `docker ps`
- The application will automatically mark broken videos and skip to the next song

### Database connection errors
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check database logs: `docker logs hyttehits-db`

### API not responding
- Check API logs: `docker logs hyttehits-api`
- Verify API is accessible: `curl http://localhost:3000/health`

### Rebuild containers
```bash
docker-compose down
docker-compose up -d --build
```

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
  - **Recommended: [Brave Browser](https://brave.com/)** - Blocks YouTube ads for uninterrupted gameplay
- Internet connection (for YouTube videos)
- Docker and Docker Compose

## License

This is a custom implementation of a music party game.

## Credits

- Web implementation created for entertainment purposes
- Music provided by YouTube

