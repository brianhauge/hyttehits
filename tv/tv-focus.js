// Focus Management System for TV Navigation
// Manages which element currently has focus and provides visual feedback

class FocusManager {
    constructor() {
        this.currentFocusedElement = null;
        this.focusHistory = [];
        this.focusableSelector = '.focusable:not([disabled]):not(.hidden)';
        this.init();
    }

    init() {
        console.log('FocusManager initialized');
        
        // Set up focus event listeners
        document.addEventListener('focus', (e) => {
            if (e.target.classList.contains('focusable')) {
                this.setFocus(e.target);
            }
        }, true);
    }

    // Get all currently focusable elements in the active screen
    getFocusableElements() {
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen) return [];
        
        const elements = Array.from(activeScreen.querySelectorAll(this.focusableSelector));
        
        // Filter out elements that are in hidden modals or containers
        return elements.filter(el => {
            let parent = el.parentElement;
            while (parent) {
                if (parent.classList && parent.classList.contains('hidden')) {
                    return false;
                }
                parent = parent.parentElement;
            }
            return true;
        });
    }

    // Set focus to a specific element
    setFocus(element) {
        if (!element) return;
        
        // Prevent infinite loop - if already focused, do nothing
        if (this.currentFocusedElement === element) return;

        // Remove focus from previous element
        if (this.currentFocusedElement) {
            this.currentFocusedElement.classList.remove('focused');
            this.currentFocusedElement.blur();
        }

        // Store in history
        this.focusHistory.push(this.currentFocusedElement);
        if (this.focusHistory.length > 10) {
            this.focusHistory.shift();
        }

        // Add focus class to new element
        this.currentFocusedElement = element;
        element.classList.add('focused');
        element.focus();

        // Scroll into view if needed
        this.scrollToElement(element);
    }

    // Focus the first focusable element in current screen
    focusFirst() {
        const elements = this.getFocusableElements();
        if (elements.length > 0) {
            this.setFocus(elements[0]);
        }
    }

    // Focus next element in tab order
    focusNext() {
        const elements = this.getFocusableElements();
        if (elements.length === 0) return;

        const currentIndex = elements.indexOf(this.currentFocusedElement);
        const nextIndex = (currentIndex + 1) % elements.length;
        this.setFocus(elements[nextIndex]);
    }

    // Focus previous element in tab order
    focusPrevious() {
        const elements = this.getFocusableElements();
        if (elements.length === 0) return;

        const currentIndex = elements.indexOf(this.currentFocusedElement);
        const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1;
        this.setFocus(elements[prevIndex]);
    }

    // Find element in a specific direction (for spatial navigation)
    findElementInDirection(direction) {
        if (!this.currentFocusedElement) {
            this.focusFirst();
            return;
        }

        const elements = this.getFocusableElements();
        if (elements.length === 0) return null;

        const currentRect = this.currentFocusedElement.getBoundingClientRect();
        const currentCenter = {
            x: currentRect.left + currentRect.width / 2,
            y: currentRect.top + currentRect.height / 2
        };

        let bestElement = null;
        let bestScore = Infinity;

        elements.forEach(element => {
            if (element === this.currentFocusedElement) return;

            const rect = element.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            // Calculate if element is in the right direction
            let isInDirection = false;
            let distance = 0;
            let alignment = 0;

            switch(direction) {
                case 'up':
                    isInDirection = center.y < currentCenter.y;
                    distance = currentCenter.y - center.y;
                    alignment = Math.abs(currentCenter.x - center.x);
                    break;
                case 'down':
                    isInDirection = center.y > currentCenter.y;
                    distance = center.y - currentCenter.y;
                    alignment = Math.abs(currentCenter.x - center.x);
                    break;
                case 'left':
                    isInDirection = center.x < currentCenter.x;
                    distance = currentCenter.x - center.x;
                    alignment = Math.abs(currentCenter.y - center.y);
                    break;
                case 'right':
                    isInDirection = center.x > currentCenter.x;
                    distance = center.x - currentCenter.x;
                    alignment = Math.abs(currentCenter.y - center.y);
                    break;
            }

            if (isInDirection && distance > 0) {
                // Score based on distance and alignment (lower is better)
                const score = distance + alignment * 0.5;
                if (score < bestScore) {
                    bestScore = score;
                    bestElement = element;
                }
            }
        });

        return bestElement;
    }

    // Navigate in a direction
    navigate(direction) {
        const targetElement = this.findElementInDirection(direction);
        
        if (targetElement) {
            this.setFocus(targetElement);
        } else {
            // If no element found in direction, try wrapping around
            if (direction === 'left' || direction === 'up') {
                this.focusPrevious();
            } else if (direction === 'right' || direction === 'down') {
                this.focusNext();
            }
        }
    }

    // Scroll element into view smoothly
    scrollToElement(element) {
        const container = element.closest('.guess-options');
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            if (elementRect.left < containerRect.left || elementRect.right > containerRect.right) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }

    // Activate currently focused element (simulate click)
    activateFocused() {
        if (this.currentFocusedElement) {
            // Trigger click event
            this.currentFocusedElement.click();
            
            // Trigger enter key event
            const event = new KeyboardEvent('keydown', {
                key: 'Enter',
                keyCode: 13,
                bubbles: true
            });
            this.currentFocusedElement.dispatchEvent(event);
        }
    }

    // Go back to previous focused element
    goBack() {
        if (this.focusHistory.length > 0) {
            const previousElement = this.focusHistory.pop();
            if (previousElement && this.getFocusableElements().includes(previousElement)) {
                this.currentFocusedElement = null; // Don't add to history
                this.setFocus(previousElement);
            }
        }
    }

    // Reset focus (useful when changing screens)
    reset() {
        if (this.currentFocusedElement) {
            this.currentFocusedElement.classList.remove('focused');
            this.currentFocusedElement = null;
        }
        this.focusHistory = [];
    }

    // Update focusable elements when DOM changes
    refresh() {
        // If current focused element is no longer focusable, focus first available
        const elements = this.getFocusableElements();
        if (this.currentFocusedElement && !elements.includes(this.currentFocusedElement)) {
            this.focusFirst();
        } else if (!this.currentFocusedElement && elements.length > 0) {
            this.focusFirst();
        }
    }
}

// Create global instance
window.focusManager = new FocusManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FocusManager;
}
