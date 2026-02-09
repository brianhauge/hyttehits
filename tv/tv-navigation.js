// TV Navigation System
// Handles remote control input (D-pad, Enter, Back buttons)

class TVNavigation {
    constructor() {
        this.isNavigating = false;
        this.keyRepeatTimeout = null;
        this.keyRepeatDelay = 150; // ms before key repeat starts
        this.init();
    }

    init() {
        console.log('TV Navigation initialized');
        
        // Listen for keyboard events in CAPTURE phase (runs before target/bubble phase)
        // This ensures we catch events before anything else can stop them
        document.addEventListener('keydown', this.handleKeyDown.bind(this), true); // true = capture phase
        document.addEventListener('keyup', this.handleKeyUp.bind(this), true); // true = capture phase
        
        // Also add logging to window to see ALL keydown events
        window.addEventListener('keydown', (e) => {
            console.log('[Window] Raw keydown:', e.key, 'Target:', e.target.tagName, 'DefaultPrevented:', e.defaultPrevented);
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
            }
        }, true); // true = capture phase
    }

    handleKeyDown(event) {
        const key = event.key;
        const keyCode = event.keyCode;
        
        console.log('[TVNavigation] Key pressed:', key, 'KeyCode:', keyCode, 'Target:', event.target.tagName);
        
        // Prevent default for navigation keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) {
            event.preventDefault();
            console.log('[TVNavigation] Prevented default for:', key);
        }
        
        // Prevent navigation lock spam
        if (this.isNavigating) {
            console.log('[TVNavigation] Navigation locked, ignoring');
            return;
        }
        this.isNavigating = true;
        
        // Handle by key name first, then return to avoid duplicate handling
        switch(key) {
            case 'ArrowUp':
                console.log('[TVNavigation] Handling ArrowUp');
                this.handleArrowKey('up');
                return;
            case 'ArrowDown':
                console.log('[TVNavigation] Handling ArrowDown');
                this.handleArrowKey('down');
                return;
            case 'ArrowLeft':
                console.log('[TVNavigation] Handling ArrowLeft');
                this.handleArrowKey('left');
                return;
            case 'ArrowRight':
                console.log('[TVNavigation] Handling ArrowRight');
                this.handleArrowKey('right');
                return;
            case 'Enter':
                console.log('[TVNavigation] Handling Enter');
                this.handleEnterKey();
                return;
            case 'Backspace':
            case 'Escape':
                console.log('[TVNavigation] Handling Back');
                this.handleBackKey();
                return;
        }

        // Handle by keyCode for compatibility (only if key name didn't match)
        if (keyCode) {
            switch(keyCode) {
                case 38: // Up
                    this.handleArrowKey('up');
                    break;
                case 40: // Down
                    this.handleArrowKey('down');
                    break;
                case 37: // Left
                    this.handleArrowKey('left');
                    break;
                case 39: // Right
                    this.handleArrowKey('right');
                    break;
                case 13: // Enter
                    this.handleEnterKey();
                    break;
                case 8: // Backspace
                case 27: // Escape
                    this.handleBackKey();
                    break;
                case 23: // KEYCODE_DPAD_CENTER (Android TV)
                    this.handleEnterKey();
                    break;
                case 4: // KEYCODE_BACK (Android TV)
                    this.handleBackKey();
                    break;
                case 10009: // Tizen back
                    this.handleBackKey();
                    break;
            }
        }
    }

        // Also handle by keyCode for compatibility
        if (keyCode) {
            switch(keyCode) {
                case 38: // Up
                    this.handleArrowKey('up');
                    break;
                case 40: // Down
                    this.handleArrowKey('down');
                    break;
                case 37: // Left
                    this.handleArrowKey('left');
                    break;
                case 39: // Right
                    this.handleArrowKey('right');
                    break;
                case 13: // Enter
                    this.handleEnterKey();
                    break;
                case 8: // Backspace
                case 27: // Escape
                    this.handleBackKey();
                    break;
                case 10009: // Tizen back
                    this.handleBackKey();
                    break;
            }
        }
    }

    handleKeyUp(event) {
        // Reset navigation lock after key is released
        setTimeout(() => {
            this.isNavigating = false;
        }, 50); // Small delay to prevent double triggers
    }

    handleArrowKey(direction) {
        // Check if we're in a special context
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen) return;

        // If an iframe has focus, blur it and focus the first focusable element
        if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
            console.log('[TVNavigation] Iframe has focus, blurring and focusing first element');
            document.activeElement.blur();
            window.focusManager.focusFirst();
            return;
        }

        // Use focus manager for spatial navigation
        window.focusManager.navigate(direction);
    }

    handleEnterKey() {
        // Activate currently focused element
        window.focusManager.activateFocused();
    }

    handleBackKey() {
        // Determine context and handle back appropriately
        const activeScreen = document.querySelector('.screen.active');
        
        // Check if keyboard modal is open
        const keyboardModal = document.getElementById('keyboard-modal');
        if (keyboardModal && !keyboardModal.classList.contains('hidden')) {
            // Close keyboard
            this.closeKeyboard();
            return;
        }

        // Check if result modal is open
        const resultModal = document.getElementById('result-modal');
        if (resultModal && !resultModal.classList.contains('hidden')) {
            // Don't allow back during result screen
            return;
        }

        // If in game screen, confirm quit
        if (activeScreen && activeScreen.id === 'game-screen') {
            if (confirm('Vil du afslutte spillet?')) {
                // Reset game and go back to setup
                if (window.gameController) {
                    window.gameController.resetGame();
                }
            }
            return;
        }

        // If in winner screen, go back to setup
        if (activeScreen && activeScreen.id === 'winner-screen') {
            if (window.gameController) {
                window.gameController.resetGame();
            }
            return;
        }

        // Default: go back in focus history
        window.focusManager.goBack();
    }

    closeKeyboard() {
        const keyboardModal = document.getElementById('keyboard-modal');
        if (keyboardModal) {
            keyboardModal.classList.add('hidden');
            window.focusManager.refresh();
        }
    }
}

// Initialize TV Navigation
window.tvNavigation = new TVNavigation();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TVNavigation;
}
