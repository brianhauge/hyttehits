# Hytte Hits - Music Party Game

A web-based implementation of the Hytte Hits music party game with YouTube integration. Two teams compete to guess when songs were released by placing them in chronological order on their timeline.

## Features

- Two-team gameplay
- YouTube integration for playing real music
- PostgreSQL database with 150+ songs from modern (2016-2025) and classic (1950s-2015) playlists
- Automatic song status tracking (working/broken)
- Interactive timeline showing guessed years in ascending order
- Guess if a song was released before, between, or after existing years
- Score tracking and winner declaration
- Responsive design
- RESTful API for song management

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
   docker exec -it hyttehits-api node populate-db.js
   ```

4. **Play the game**
   - Open your browser and go to `http://localhost:8081`
   - Enter team names
   - Select playlist (Modern or Classic)
   - Click "Start Game"
   - Enjoy!

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

## API Endpoints

### Get All Songs
```
GET /api/songs?playlist={modern|classic}&status={working|broken}
```

### Get Random Song
```
GET /api/songs/random?playlist={modern|classic}&exclude={videoId1,videoId2}
```

### Get Song by Video ID
```
GET /api/songs/:videoId
```

### Update Song Status
```
PATCH /api/songs/:videoId/status
Body: { "status": "working" | "broken" }
```

### Add New Song
```
POST /api/songs
Body: {
  "title": "Song Title",
  "artist": "Artist Name",
  "year": 2024,
  "video_id": "YouTube_Video_ID",
  "playlist": "modern",
  "status": "working"
}
```

### Delete Song
```
DELETE /api/songs/:videoId
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
│   ├── package.json       # API dependencies
│   ├── server.js          # Express API server
│   └── populate-db.js     # Database population script
├── docker-compose.yml     # Docker services configuration
├── Dockerfile             # Web server container
├── Dockerfile.api         # API server container
├── init-db.sql           # Database schema
├── index.html            # Main HTML structure
├── styles.css            # Styling and layout
├── game.js               # Game logic and API integration
├── youtube.js            # YouTube API integration
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

