# Hytte Hits - Music Party Game

A web-based implementation of the Hytte Hits music party game with YouTube integration. Two teams compete to guess when songs were released by placing them in chronological order on their timeline.

## Features

- Two-team gameplay
- YouTube integration for playing real music
- PostgreSQL database with 388 songs from Modern (2016-2025) and Classic (1952-2025) playlists
- **Dynamic playlist system** - playlists are loaded from the database and can be managed through the admin panel
- Automatic song status tracking (working/broken)
- Interactive timeline showing guessed years in ascending order
- Guess if a song was released before, between, or after existing years
- Score tracking and winner declaration
- Responsive design
- RESTful API for song management
- **Admin panel with:**
  - Playlist management (create, edit, delete playlists)
  - User administration (create, edit, delete admin users)
  - Song management (add, edit, delete, bulk check, find alternatives)
  - Audit logging (track all admin actions)
  - Game analytics (track song plays, success rates, most played songs)

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
   - Select a playlist from the dropdown (dynamically loaded from database)
   - Click "Start Game"
   - Enjoy!

6. **Access the admin panel**
   - Go to `http://localhost:8081/admin`
   - Login with your admin credentials
   - Manage songs (add, edit, delete, check availability, find alternatives)
   - Manage playlists (create, edit, delete)
   - Playlists you create will automatically appear in the game selector

### Development Setup

To run the API server locally for development:

```bash
cd api
npm install
DATABASE_URL=postgresql://hyttehits:hyttehits123@localhost:5432/hyttehits npm start
```

## How to Play

1. **Setup**: Two teams enter their names and select a playlist (dynamically loaded from the database)
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

## Playlist System

Hytte Hits uses a flexible playlist system that allows you to organize songs in any way you want:

- **Dynamic Playlists**: Playlists are loaded from the database, not hardcoded
- **Create Custom Playlists**: Use the admin panel to create playlists like "80s Hits", "Danish Songs", "Rock Classics", etc.
- **Multiple Playlists per Song**: Songs can belong to multiple playlists simultaneously
- **Automatic Game Integration**: Any playlist you create will automatically appear in the game's playlist selector
- **Default Playlists**: The system comes with two default playlists:
  - **Modern** (2016-2025): 136 contemporary songs
  - **Classic** (1952-2025): 252 timeless classics

### Creating New Playlists

1. Go to the admin panel at `http://localhost:8081/admin`
2. Click the "Playlists" tab
3. Click "Create New Playlist"
4. Enter a name and optional description
5. The playlist will immediately appear in the game selector
6. Add songs to your new playlist through the "Add Song" or "All Songs" tabs

## Database Schema

### Songs Table

| Column       | Type      | Description                           |
|--------------|-----------|---------------------------------------|
| id           | SERIAL    | Primary key                           |
| title        | VARCHAR   | Song title                            |
| artist       | VARCHAR   | Artist name                           |
| year         | INTEGER   | Release year                          |
| video_id     | VARCHAR   | YouTube video ID (unique)             |
| playlist     | VARCHAR   | Playlist name (e.g., Modern, Classic)        |
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

### Audit Logs Table

| Column        | Type      | Description                           |
|---------------|-----------|---------------------------------------|
| id            | SERIAL    | Primary key                           |
| user_id       | INTEGER   | Foreign key to users table            |
| action        | VARCHAR   | Action type (create, update, delete, etc.) |
| resource_type | VARCHAR   | Resource type (song, user, auth, etc.) |
| resource_id   | VARCHAR   | ID of affected resource               |
| details       | TEXT      | JSON string with additional details   |
| ip_address    | VARCHAR   | Client IP address (IPv4/IPv6)         |
| created_at    | TIMESTAMP | Action timestamp                      |

### Game Logs Table

| Column            | Type      | Description                           |
|-------------------|-----------|---------------------------------------|
| id                | SERIAL    | Primary key                           |
| video_id          | VARCHAR   | Foreign key to songs table            |
| team_name         | VARCHAR   | Team that played the song             |
| playlist          | VARCHAR   | Playlist name (e.g., Modern, Classic)        |
| guessed_correctly | BOOLEAN   | Whether the guess was correct         |
| session_id        | VARCHAR   | Browser session ID                    |
| ip_address        | VARCHAR   | Client IP address (IPv4/IPv6)         |
| created_at        | TIMESTAMP | Play timestamp                        |

## Admin Panel

### Accessing the Admin Panel

1. Navigate to `http://localhost:8081/admin`
2. Login with your admin credentials
3. Manage your song database with ease!

### Admin Features

#### All Songs Tab
- View all songs in the database
- Search and filter songs
- Edit song details (title, artist, playlists, video ID)
- Delete songs
- Check all songs for YouTube availability (bulk operation)

#### Playlists Tab
- View all playlists with song counts
- Create new playlists (e.g., "80s Hits", "Danish Songs")
- Edit playlist names and descriptions
- Delete playlists (protected - cannot delete playlists with songs)
- **Playlists automatically appear in the game selector**

#### Add Song Tab
- Add new songs to the database
- Required fields: YouTube Video ID, Title, Artist
- Select one or more playlists for each song
- Automatic validation

#### Broken Songs Tab
- View all songs marked as "broken" (unavailable on YouTube)
- Find alternative videos on YouTube with one click
- Edit video IDs to update with working alternatives
- Delete songs that can't be fixed

#### Users Tab
- View all admin users
- Create new admin users
- Edit user details (username, password, role)
- Delete users (cannot delete yourself)
- Track last login times

#### Audit Logs Tab
- View all admin actions (login, logout, create, update, delete)
- Filter by action type (login, logout, create, update, delete)
- Filter by resource type (song, user, auth)
- Pagination support (50 records per page)
- See who did what and when
- IP address tracking
- Detailed JSON information for each action

#### Game Logs Tab
- View game play statistics
- Total plays count
- Plays by playlist (Modern/Classic)
- Success rate (percentage of correct guesses)
- Most played songs leaderboard
- Recent game plays log
- Filter by playlist
- Pagination support (50 records per page)
- Track which team played each song
- See guess results (correct/incorrect)

#### Statistics Tab
- View database statistics in real-time
- Total songs count
- Songs by playlist (Modern/Classic)
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

#### Get All Playlists
```
GET /api/playlists
Response: [
  { "id": 1, "name": "Modern", "description": "Modern songs (2016-2025)", "song_count": "136" },
  { "id": 2, "name": "Classic", "description": "Classic songs (1952-2025)", "song_count": "252" }
]
```

#### Get All Songs
```
GET /api/songs?playlist={Modern|Classic}&status={working|broken}
```

#### Get Random Song
```
GET /api/songs/random?playlist={Modern|Classic}&exclude={videoId1,videoId2}
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
  "playlist": "Modern"
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
  "playlist": "Classic"
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
  "Modern": 136,
  "Classic": 252,
  "working": 350,
  "broken": 10,
  "unchecked": 28
}
```

#### User Administration

Get all users:
```
GET /api/admin/users
Headers: { "Authorization": "Bearer <token>" }
```

Create user:
```
POST /api/admin/users
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "username": "newadmin",
  "password": "password123",
  "role": "admin"
}
```

Update user:
```
PUT /api/admin/users/:id
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "username": "updated_username",
  "password": "new_password",  // optional
  "role": "admin"
}
```

Delete user:
```
DELETE /api/admin/users/:id
Headers: { "Authorization": "Bearer <token>" }
```

#### Audit Logs

Get audit logs:
```
GET /api/admin/audit-logs?limit=50&offset=0&action=login&resource_type=song
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "logs": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

#### Game Logs & Statistics

Log a song play (public endpoint):
```
POST /api/game-logs
Body: {
  "video_id": "dQw4w9WgXcQ",
  "team_name": "Team 1",
  "playlist": "Modern",
  "guessed_correctly": true,
  "session_id": "session_123456"
}
```

Get game logs:
```
GET /api/admin/game-logs?limit=50&offset=0&playlist=Modern
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "logs": [...],
  "total": 500,
  "limit": 50,
  "offset": 0
}
```

Get game statistics:
```
GET /api/admin/game-stats
Headers: { "Authorization": "Bearer <token>" }
Response: {
  "totalPlays": 500,
  "byPlaylist": {
    "Modern": 300,
    "Classic": 200
  },
  "mostPlayed": [...],
  "successRate": {
    "correct": 350,
    "incorrect": 150,
    "total": 500,
    "percentage": "70.00"
  }
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

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

[![CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)

### You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

### Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made
- **NonCommercial** — You may not use the material for commercial purposes
- **ShareAlike** — If you remix, transform, or build upon the material, you must distribute your contributions under the same license

See the [LICENSE](LICENSE) file for the full license text.

## Credits

- Web implementation created for entertainment purposes
- Music provided by YouTube

