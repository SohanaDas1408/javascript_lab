// ==========================================
// EXPERIMENT 1
// Demonstration of Inline, Internal, and External JavaScript Integration,
// Console Tracking Methods, and Dynamic User Dashboard Manipulation
// ==========================================

// ==========================================
// 1. DEMONSTRATING VARIOUS CONSOLE METHODS
// ==========================================

// Standard log for general debugging information
console.log("External JS: Script has loaded successfully.");

// Informational message
console.info("Application Status: Initializing user dashboard...");

// Warning message
console.warn("Performance Warning: Content is loading dynamically.");

// Error message (simulation)
console.error("Simulation: Failed to connect to a legacy database backend.");

// Group related logs
console.group("User Profile Matrix");
console.log("Status: Active");
console.log("Permissions: Student");
console.groupEnd();

// ==========================================
// 2. DYNAMICALLY UPDATING THE WEBPAGE
// ==========================================

// Mock user information object
const userInfo = {
    username: "Pramit24070521109",
    fullName: "Pramit Kumar Ghosh",
    email: "pramit.ghosh2407@gmail.com",
    role: "Student"
};

// Function executed after the page loads
function renderUserDashboard() {

    // Update welcome heading
    document.getElementById("welcome-heading").textContent =
        `Welcome Back, ${userInfo.fullName}!`;

    // Display user information
    document.getElementById("info-username").textContent =
        userInfo.username;

    document.getElementById("info-email").textContent =
        userInfo.email;

    document.getElementById("info-role").textContent =
        userInfo.role;

    console.log("DOM Update: User dashboard details rendered successfully.");
}