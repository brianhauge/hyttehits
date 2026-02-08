# Hytte Hits TV - Setup Instructions

## Overview

The TV version of Hytte Hits has been successfully created! This TV-optimized web application works on:
- **Android TV** devices (via Android TV app wrapper)
- **Samsung Tizen TVs** (via Tizen app wrapper)
- **Any TV browser** (direct access via http://birkehaven.dyndns.dk/tv)

## What's Been Built

### TV Web Application (Phase 1 - COMPLETED ✓)

All files created in the `tv/` directory:

1. **index.html** - TV-optimized layout with:
   - Large fonts (24-72px) for 10-foot viewing
   - Simplified navigation structure
   - Virtual keyboard for team names
   - Full feature parity (playlist + year range modes)

2. **tv-styles.css** - 10-foot UI design with:
   - High contrast colors
   - Large buttons (160px+ width)
   - Clear focus indicators (gold outline + glow)
   - Optimized for 1920x1080 resolution
   - Safe area margins (5% on all edges)

3. **tv-navigation.js** - D-pad remote control support:
   - Arrow keys for navigation
   - Enter key for selection
   - Back button handling
   - Spatial navigation algorithm
   - Compatible with Android TV and Tizen keycodes

4. **tv-focus.js** - Focus management system:
   - Tracks currently focused element
   - Visual focus indicators
   - Smart spatial navigation
   - Automatic scrolling to focused elements
   - Focus history for back navigation

5. **tv-game.js** - Game logic adapted for TV:
   - Full game functionality from original web app
   - API integration with http://birkehaven.dyndns.dk/api
   - Virtual keyboard for text entry
   - Playlist selection
   - Year range selection
   - Song guessing gameplay
   - Score tracking
   - Winner screen

6. **tv-youtube.js** - YouTube player for TV:
   - Optimized for TV playback
   - Full screen support
   - Volume set to 100%
   - Error handling for broken videos

### Server Configuration (COMPLETED ✓)

- **nginx.conf** - Updated with `/tv` route
- **docker-compose.yml** - Updated with `tv/` volume mount

## How to Access

### Option 1: Direct Browser Access (Easiest)

Once your Docker containers are running, access the TV app at:
```
http://birkehaven.dyndns.dk/tv
```

**Testing on Desktop:**
1. Open browser at 1920x1080 resolution (or press F11 for fullscreen)
2. Use keyboard arrow keys to navigate (simulates TV remote)
3. Press Enter to select
4. Press Backspace/Escape for back button

### Option 2: Local Testing

```bash
# Start Docker containers
cd C:\Source\hyttehits
docker-compose up -d

# Access locally
# Open browser to: http://localhost:8081/tv
```

## Remote Control Navigation

### Keyboard Mappings (for testing)

| TV Remote Button | Keyboard Key | Function |
|-----------------|--------------|----------|
| ↑ Up | Arrow Up | Navigate up |
| ↓ Down | Arrow Down | Navigate down |
| ← Left | Arrow Left | Navigate left |
| → Right | Arrow Right | Navigate right |
| OK/Select | Enter | Activate focused element |
| Back | Backspace/Escape | Go back |

## Features Implemented

✅ **Setup Screen:**
- Mode selector (Playlist vs Year Range)
- Playlist selection with cards
- Year range adjustment (arrow key controls)
- Team name entry with virtual keyboard
- Start game button

✅ **Game Screen:**
- Team score header
- Full-screen YouTube video player
- Horizontal guess timeline with scrolling
- Guess buttons with year indicators
- Song cards showing previously guessed songs

✅ **Result Screen:**
- Correct/Incorrect feedback
- Song reveal (title, artist, year)
- Confetti animation
- Continue button

✅ **Winner Screen:**
- Winner announcement
- Final scores
- Play again button

## Next Steps

### Phase 2: Deploy to Server (READY)

The TV web app is ready to be deployed. To make it accessible at http://birkehaven.dyndns.dk/tv:

```bash
# Make sure Docker containers are running
docker-compose ps

# If not running, start them:
docker-compose up -d

# Check logs if there are issues:
docker-compose logs web
```

### Phase 3: Android TV App (Next)

To create the Android TV app wrapper:

1. **Install Android Studio** (if not already installed)
2. **Create Android TV project** using the files in future `android-tv/` directory
3. **Configure WebView** to load http://birkehaven.dyndns.dk/tv
4. **Test on Android TV emulator**
5. **Build APK and test on physical device**
6. **Submit to Google Play Store**

### Phase 4: Samsung Tizen TV App (After Android TV)

To create the Samsung Tizen app:

1. **Install Tizen Studio**
2. **Create Tizen TV project** using files in future `tizen-tv/` directory
3. **Configure iframe** to load http://birkehaven.dyndns.dk/tv
4. **Test on Tizen emulator**
5. **Test on Samsung Remote Test Lab**
6. **Submit to Samsung TV App Store**

## Testing Checklist

Before proceeding to native apps, verify TV web app works:

- [ ] Accessible at http://birkehaven.dyndns.dk/tv
- [ ] All navigation works with keyboard arrow keys
- [ ] Focus indicators clearly visible
- [ ] Mode switching (playlist/year range) works
- [ ] Playlist cards selectable
- [ ] Year range adjusts with arrow keys
- [ ] Virtual keyboard opens and works
- [ ] Team names can be entered
- [ ] Game starts successfully
- [ ] YouTube videos play
- [ ] Guess buttons navigable
- [ ] Timeline scrolls with arrow keys
- [ ] Result screen shows correctly
- [ ] Winner screen displays
- [ ] Play again returns to setup

## API Configuration

The TV app connects to:
```
API_URL = 'http://birkehaven.dyndns.dk/api'
```

All endpoints from the original web app are supported:
- `/api/playlists` - Get all playlists
- `/api/songs` - Get songs
- `/api/songs/year-range-info` - Get year range info
- `/api/songs/counts-by-year` - Get song counts
- `/api/songs/year-range` - Get songs by year range
- `/api/songs/:videoId/status` - Mark song as broken
- `/api/game-logs` - Log gameplay

## Troubleshooting

### TV app not accessible

1. Check Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Restart web container:
   ```bash
   docker-compose restart web
   ```

3. Check nginx logs:
   ```bash
   docker-compose logs web
   ```

### Navigation not working

- Make sure you're using keyboard arrow keys (not mouse)
- Check browser console for JavaScript errors
- Verify focus.js and navigation.js loaded correctly

### Videos not playing

- Check API is accessible at http://birkehaven.dyndns.dk/api
- Verify YouTube iframe API loaded
- Check browser console for errors
- Some videos may be blocked - app will auto-skip

## File Structure

```
hyttehits/
├── tv/                           # TV-optimized web app
│   ├── index.html                # TV layout
│   ├── tv-styles.css             # 10-foot UI styles
│   ├── tv-navigation.js          # D-pad control
│   ├── tv-focus.js               # Focus management
│   ├── tv-game.js                # Game logic
│   └── tv-youtube.js             # YouTube player
├── nginx.conf                    # Updated with /tv route
├── docker-compose.yml            # Updated with tv/ volume
└── (existing files unchanged)
```

## Support

For issues or questions:
- Check browser console for errors
- Review nginx logs: `docker-compose logs web`
- Review API logs: `docker-compose logs api`

## Credits

TV version built based on the original Hytte Hits web application with full feature parity and TV-optimized user experience.
