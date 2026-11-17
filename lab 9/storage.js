// ==========================================
// EXPERIMENT 9
// localStorage and sessionStorage
// Theme Preference Manager
// ==========================================

console.log("Web Storage Experiment Loaded Successfully");

// ==========================================
// DOM ELEMENTS
// ==========================================

const themeSelect = document.getElementById("theme");
const saveButton = document.getElementById("saveTheme");
const clearButton = document.getElementById("clearTheme");
const statusMessage = document.getElementById("status");

// ==========================================
// APPLY THEME
// ==========================================

function applyTheme(theme) {
  document.body.classList.remove("light-theme", "dark-theme");

  if (theme === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.add("light-theme");
  }
}

// ==========================================
// SAVE THEME USING localStorage
// ==========================================

function saveTheme() {
  const selectedTheme = themeSelect.value;

  // Save theme permanently
  localStorage.setItem("preferredTheme", selectedTheme);

  // Apply theme immediately
  applyTheme(selectedTheme);

  statusMessage.textContent = `Theme "${selectedTheme}" saved successfully.`;

  console.log("Theme saved using localStorage:", selectedTheme);
}

// ==========================================
// LOAD SAVED THEME
// ==========================================

function loadTheme() {
  const savedTheme = localStorage.getItem("preferredTheme");

  if (savedTheme) {
    themeSelect.value = savedTheme;

    applyTheme(savedTheme);

    statusMessage.textContent = `Saved theme "${savedTheme}" has been loaded.`;

    console.log("Theme loaded from localStorage:", savedTheme);
  } else {
    applyTheme("light");

    console.log("No saved theme found. Default theme applied.");
  }
}

// ==========================================
// SESSION STORAGE
// ==========================================

function startSession() {
  let visitCount = sessionStorage.getItem("visitCount");

  if (visitCount === null) {
    visitCount = 1;
  } else {
    visitCount = Number(visitCount) + 1;
  }

  sessionStorage.setItem("visitCount", visitCount);

  document.getElementById("sessionInfo").textContent =
    `Current browser session visits: ${visitCount}`;

  console.log("Session visit count:", visitCount);
}

// ==========================================
// CLEAR SAVED THEME
// ==========================================

function clearTheme() {
  localStorage.removeItem("preferredTheme");

  themeSelect.value = "light";

  applyTheme("light");

  statusMessage.textContent = "Saved theme preference has been removed.";

  console.log("Theme preference removed from localStorage.");
}

// ==========================================
// EVENT LISTENERS
// ==========================================

saveButton.addEventListener("click", saveTheme);

clearButton.addEventListener("click", clearTheme);

// ==========================================
// INITIALIZATION
// ==========================================

loadTheme();

startSession();
