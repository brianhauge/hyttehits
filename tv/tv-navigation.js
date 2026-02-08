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
        
        // Listen for keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Prevent default scrolling behavior
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    handleKeyDown(event) {
        const key = event.key;
        const keyCode = event.keyCode;

        // Prevent key repeat spam
        if (this.isNavigating) return;
        this.isNavigating = true;

        console.log('Key pressed:', key, 'KeyCode:', keyCode);

        // Handle different keys
        switch(key) {
            case 'ArrowUp':
                this.handleArrowKey('up');
                break;
            case 'ArrowDown':
                this.handleArrowKey('down');
                break;
            case 'ArrowLeft':
                this.handleArrowKey('left');
                break;
            case 'ArrowRight':
                this.handleArrowKey('right');
                break;
            case 'Enter':
                this.handleEnterKey();
                break;
            case 'Backspace':
            case 'Escape':
                this.handleBackKey();
                break;
            // Android TV specific key codes
            case 23: // KEYCODE_DPAD_CENTER
                this.handleEnterKey();
                break;
            case 4: // KEYCODE_BACK
                this.handleBackKey();
                break;
            // Tizen TV specific
            case 10009: // Tizen Back button
                this.handleBackKey();
                break;
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

        // Special handling for year range controls
        if (activeScreen.id === 'setup-screen') {
            const yearRangeMode = document.getElementById('year-range-mode');
            if (yearRangeMode && !yearRangeMode.classList.contains('hidden')) {
                // Check if a year adjust button is focused
                const focused = window.focusManager.currentFocusedElement;
                if (focused && focused.classList.contains('year-adjust-btn')) {
                    // Don't navigate away, let the button handle the adjustment
                    return;
                }
            }
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
