// frontend/src/auth/sessionTimeout.js

let inactivityTimer;

/**
 * Logs the user out by redirecting to the logout route.
 */
function logoutUser() {
    // Clear the timer to prevent any potential loops
    clearTimeout(inactivityTimer);
    console.log("Session timed out due to inactivity. Logging out...");
    // Redirect to the logout endpoint
    window.location.href = '/logout?message=You have been logged out due to inactivity.';
}

/**
 * Resets the inactivity timer. This function is called whenever user activity is detected.
 */
function resetTimer() {
    // Clear the previous timer
    clearTimeout(inactivityTimer);
    
    // Set a new timer. 10 minutes = 600,000 milliseconds.
    // For testing, you can use a shorter duration, like 5000 (5 seconds).
    const timeoutDuration = 600000; // 10 minutes in milliseconds
    
    inactivityTimer = setTimeout(logoutUser, timeoutDuration);
}

/**
 * Initializes the session timeout functionality by adding event listeners
 * to detect user activity.
 */
export function initializeSessionTimeout() {
    // List of events that count as user activity
    const activityEvents = [
        'mousemove', 
        'mousedown', 
        'click', 
        'scroll', 
        'keypress', 
        'touchstart'
    ];

    // Add a listener for each activity event that resets the timer.
    // The { once: true } option for the initial setup ensures the timer
    // starts only after the first user interaction.
    activityEvents.forEach(event => {
        window.addEventListener(event, resetTimer, { once: true });
    });

    // Add permanent listeners that will keep resetting the timer
    activityEvents.forEach(event => {
        window.addEventListener(event, resetTimer);
    });

    // Start the timer for the first time
    resetTimer();
    console.log("Session inactivity timer started.");
}