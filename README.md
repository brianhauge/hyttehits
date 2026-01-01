# Hytte Hits - Music Party Game

A web-based implementation of the Hytte Hits music party game with YouTube integration. Two teams compete to guess when songs were released by placing them in chronological order on their timeline.

## Features

- Two-team gameplay
- YouTube integration for playing real music from 2016-2025
- Pre-loaded database of 80+ popular songs
- Interactive timeline showing guessed years in ascending order
- Guess if a song was released before, between, or after existing years
- Score tracking and winner declaration
- Responsive design
- **No API keys required!**

## Setup Instructions

### Quick Start

1. **Download/Clone the project**
   - Download all files to a folder

2. **Run a local web server**
   
   Choose one of these methods:

   #### Option A: Python (if installed)
   ```bash
   # Python 3
   python -m http.server 8080

   # Python 2
   python -m SimpleHTTPServer 8080
   ```

   #### Option B: Node.js (if installed)
   ```bash
   # Install http-server globally
   npm install -g http-server

   # Run the server
   http-server -p 8080
   ```

   #### Option C: VS Code Live Server
   1. Install the "Live Server" extension in VS Code
   2. Right-click `index.html`
   3. Select "Open with Live Server"

3. **Play the game**
   - Open your browser and go to `http://localhost:8080`
   - Enter team names
   - Click "Start Game"
   - Enjoy!

## How to Play

1. **Setup**: Two teams enter their names
2. **Play a Song**: The current team clicks "Play Song" to hear a random track from 2016-2025
3. **Make a Guess**: The team guesses where the song belongs in their timeline:
   - Before all existing years
   - Between two years
   - After all existing years
4. **Check Result**: The song's actual year is revealed
   - If correct, the song is added to the timeline and the team scores a point
   - If incorrect, the team doesn't score and loses their turn
5. **Switch Teams**: Play alternates between teams
6. **Win**: First team to correctly place 10 songs in chronological order wins!

## Game Rules

- Songs are from 2016-2025 only
- Teams must place songs in the correct chronological position
- The timeline shows all correctly guessed songs in ascending order
- First team to reach 10 points becomes the Hytte Hits champion!

## Song Database

The game includes 80+ popular songs from each year between 2016-2025, including hits from:
- The Weeknd (Blinding Lights, Save Your Tears)
- Taylor Swift (Anti-Hero, Cruel Summer)
- Drake (God's Plan, One Dance)
- Olivia Rodrigo (Drivers License, Good 4 U)
- Harry Styles (As It Was, Watermelon Sugar)
- And many more!

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for YouTube videos)
- Local web server (see setup instructions)

## Why YouTube Instead of Spotify?

YouTube integration doesn't require:
- API credentials
- OAuth authentication
- Premium subscription
- App approval from Spotify

This makes the game much easier to set up and play!

## Troubleshooting

### Videos won't play
- Check your internet connection
- Make sure you're running a local web server (not just opening the HTML file)
- Some videos may be region-restricted

### Game not loading
- Verify you're accessing via `http://localhost:8080` (or your server's port)
- Check browser console for errors (F12 → Console tab)
- Make sure all files are in the same directory

### YouTube player not appearing
- The player is hidden by default (set to 0x0 size)
- You'll hear the music playing even if you don't see the video
- This is intentional to keep the focus on the game

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **API**: YouTube IFrame Player API
- **No backend required**
- **No build process needed**

## File Structure

```
hitster-sjov/
├── index.html      # Main HTML structure
├── styles.css      # Styling and layout
├── game.js         # Game logic and state management
├── youtube.js      # YouTube API integration & song database
└── README.md       # This file
```

## Adding More Songs

To add more songs to the database, edit `youtube.js` and add entries to the `songDatabase` array:

```javascript
{ 
    title: "Song Title", 
    artist: "Artist Name", 
    year: 2024, 
    videoId: "YouTube_Video_ID" 
}
```

To find a YouTube video ID:
1. Go to the video on YouTube
2. Look at the URL: `https://www.youtube.com/watch?v=VIDEO_ID_HERE`
3. Copy the part after `v=`

## License

This is a custom implementation of a music party game.

## Credits

- Web implementation created for entertainment purposes
- Music provided by YouTube
