import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initHeaderAuth } from './header.js';

// Call this after your page loads
initHeaderAuth();
const form = document.getElementById("searchForm");
const input = document.getElementById("playerInput");
const suggestions = document.getElementById("suggestions");
let playersDatabase = [];
const loading = document.getElementById("loading");
const randomBtn = document.getElementById("randomBtn");
let currentPlayerIndex = -1;
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const playerCount = document.getElementById("playerCount");
const searchHistory = document.getElementById("searchHistory");

// Profile Card
const playerImage = document.getElementById("playerImage");
const playerName = document.getElementById("playerName");
const playerTeam = document.getElementById("playerTeam");
const playerNationality = document.getElementById("playerNationality");
const playerPosition = document.getElementById("playerPosition");
const playerBirth = document.getElementById("playerBirth");
const playerGender = document.getElementById("playerGender");

// Overview
const playerHeight = document.getElementById("playerHeight");
const playerWeight = document.getElementById("playerWeight");
const playerAge = document.getElementById("playerAge");
const playerClubApi = document.getElementById("playerClubApi");

// Career Stats
const playerGoals = document.getElementById("playerGoals");
const playerAssists = document.getElementById("playerAssists");

// Details
const detailTeam = document.getElementById("detailTeam");
const detailNationality = document.getElementById("detailNationality");
const detailPosition = document.getElementById("detailPosition");
const detailBirth = document.getElementById("detailBirth");
const detailGender = document.getElementById("detailGender");

// Biography
const playerDescription = document.getElementById("playerDescription");

// ==========================
// TABS
// ==========================

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((tab) => tab.classList.remove("active"));

    button.classList.add("active");
    const target = document.getElementById(button.dataset.target);
    if (target) target.classList.add("active");
  });
});

// ==========================
// LOAD DATABASE FROM FIRESTORE
// ==========================

async function loadDatabase() {
  if (loading) loading.style.display = "block";
  try {
    const querySnapshot = await getDocs(collection(db, "players"));
    playersDatabase = [];
    
    querySnapshot.forEach((doc) => {
      playersDatabase.push({ id: doc.id, ...doc.data() });
    });

    if (playerCount) playerCount.textContent = playersDatabase.length;

    // Check if player query parameter exists in URL
    const params = new URLSearchParams(window.location.search);
    const selectedPlayer = params.get("player");

    if (selectedPlayer) {
      input.value = selectedPlayer;
      searchPlayerLocal();
    }
  } catch (error) {
    console.error("Error loading players from Firestore:", error);
  } finally {
    if (loading) loading.style.display = "none";
  }
}

// Initial database fetch
loadDatabase();

// ==========================
// SEARCH LOGIC
// ==========================

form.addEventListener("submit", (e) => {
  e.preventDefault();
  searchPlayerLocal();
});

function searchPlayerLocal() {
  if (loading) loading.style.display = "block";
  const query = input.value.trim().toLowerCase();
  if (query === "") {
    if (loading) loading.style.display = "none";
    return;
  }

  // 1. Search in memory array retrieved from Firestore
  const playerData = playersDatabase.find(player =>
    player.name && player.name.toLowerCase().includes(query)
  );

  if (!playerData) {
    if (loading) loading.style.display = "none";
    displayError();
    return;
  }

  // 2. Optional image enrichment via external API
  fetch(`https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=${encodeURIComponent(playerData.name)}`)
    .then((res) => res.json())
    .then((apiData) => {
      const mergedPlayer = { ...playerData };
      if (apiData.player && apiData.player[0] && apiData.player[0].strThumb) {
        mergedPlayer.image = apiData.player[0].strThumb;
      }
      if (loading) loading.style.display = "none";
      displayPlayer(mergedPlayer);
    })
    .catch((apiError) => {
      console.warn("Image API fetch failed, falling back to document asset:", apiError);
      if (loading) loading.style.display = "none";
      displayPlayer(playerData);
    });
}

// ==========================
// DISPLAY PLAYER
// ==========================

function displayPlayer(player) {
  const displayGrid = document.querySelector(".display-grid");
  if (displayGrid) {
    displayGrid.classList.remove("fade-in");
    void displayGrid.offsetWidth;
    displayGrid.classList.add("fade-in");
  }

  currentPlayerIndex = playersDatabase.findIndex(p => p.name === player.name);

  if (playerImage) playerImage.src = player.image || "https://placehold.co/300x300?text=No+Image";
  if (playerName) playerName.textContent = player.name || "Unknown";
  if (playerTeam) playerTeam.textContent = player.team || "Unknown";
  if (playerNationality) playerNationality.textContent = player.nationality || "Unknown";
  if (playerPosition) playerPosition.textContent = player.position || "Unknown";
  if (playerBirth) playerBirth.textContent = player.birth || "Unknown";
  if (playerGender) playerGender.textContent = player.gender || "Unknown";
  if (playerHeight) playerHeight.textContent = player.height || "Unknown";
  if (playerWeight) playerWeight.textContent = player.weight || "Unknown";
  if (playerAge) playerAge.textContent = player.age || "-";
  if (playerClubApi) playerClubApi.textContent = player.clubApi || "-";

  if (playerGoals) playerGoals.textContent = player.careerGoals !== undefined ? player.careerGoals : "-";
  if (playerAssists) playerAssists.textContent = player.careerAssists !== undefined ? player.careerAssists : "-";

  if (detailTeam) detailTeam.textContent = player.team || "Unknown";
  if (detailNationality) detailNationality.textContent = player.nationality || "Unknown";
  if (detailPosition) detailPosition.textContent = player.position || "Unknown";
  if (detailBirth) detailBirth.textContent = player.birth || "Unknown";
  if (detailGender) detailGender.textContent = player.gender || "Unknown";

  if (playerDescription) playerDescription.textContent = player.description || "No biography available.";

  saveSearch(player.name);
}

// ==========================
// ERROR
// ==========================

function displayError() {
  if (playerImage) playerImage.src = "https://placehold.co/300x300?text=Not+Found";
  if (playerName) playerName.textContent = "⚽ Player Not Found";

  if (playerTeam) playerTeam.textContent = "-";
  if (playerNationality) playerNationality.textContent = "-";
  if (playerPosition) playerPosition.textContent = "-";
  if (playerBirth) playerBirth.textContent = "-";
  if (playerGender) playerGender.textContent = "-";
  if (playerHeight) playerHeight.textContent = "-";
  if (playerWeight) playerWeight.textContent = "-";
  if (playerAge) playerAge.textContent = "-";
  if (playerClubApi) playerClubApi.textContent = "-";

  if (playerGoals) playerGoals.textContent = "-";
  if (playerAssists) playerAssists.textContent = "-";

  if (detailTeam) detailTeam.textContent = "-";
  if (detailNationality) detailNationality.textContent = "-";
  if (detailPosition) detailPosition.textContent = "-";
  if (detailBirth) detailBirth.textContent = "-";
  if (detailGender) detailGender.textContent = "-";

  if (playerDescription) {
    playerDescription.textContent = "We couldn't find that player in the Football Explorer database. Try checking the spelling or choose a player from the suggestions.";
  }
}

// ==========================
// SUGGESTIONS & AUTOCOMPLETE
// ==========================

input.addEventListener("input", () => {
  const query = input.value.trim().toLowerCase();
  suggestions.innerHTML = "";

  if (query.length === 0) {
    suggestions.style.display = "none";
    return;
  }

  const matches = playersDatabase
    .filter((player) => player.name && player.name.toLowerCase().includes(query))
    .slice(0, 5);

  if (matches.length === 0) {
    suggestions.style.display = "none";
    return;
  }

  matches.forEach((player) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = player.name;

    item.addEventListener("click", () => {
      input.value = player.name;
      suggestions.innerHTML = "";
      suggestions.style.display = "none";
      searchPlayerLocal();
    });

    suggestions.appendChild(item);
  });

  suggestions.style.display = "block";
});

document.addEventListener("click", (e) => {
  if (input && suggestions && !input.contains(e.target) && !suggestions.contains(e.target)) {
    suggestions.style.display = "none";
  }
});

// ==========================
// CONTROLS & NAVIGATION
// ==========================

if (randomBtn) randomBtn.addEventListener("click", showRandomPlayer);
if (previousBtn) previousBtn.addEventListener("click", showPreviousPlayer);
if (nextBtn) nextBtn.addEventListener("click", showNextPlayer);

function showRandomPlayer() {
  if (playersDatabase.length === 0) return;
  const randomPlayer = playersDatabase[Math.floor(Math.random() * playersDatabase.length)];
  input.value = randomPlayer.name;
  searchPlayerLocal();
}

function showPreviousPlayer() {
  if (currentPlayerIndex <= 0) return;
  currentPlayerIndex--;
  input.value = playersDatabase[currentPlayerIndex].name;
  searchPlayerLocal();
}

function showNextPlayer() {
  if (currentPlayerIndex >= playersDatabase.length - 1) return;
  currentPlayerIndex++;
  input.value = playersDatabase[currentPlayerIndex].name;
  searchPlayerLocal();
}

// ==========================
// SEARCH HISTORY
// ==========================

function saveSearch(searchName) {
  if (!searchName) return;
  let history = JSON.parse(localStorage.getItem("history")) || [];
  history = history.filter(name => name !== searchName);
  history.unshift(searchName);
  history = history.slice(0, 5);
  localStorage.setItem("history", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (!searchHistory) return;
  searchHistory.innerHTML = "";
  const history = JSON.parse(localStorage.getItem("history")) || [];

  history.forEach(name => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.textContent = name;
    item.addEventListener("click", () => {
      input.value = name;
      searchPlayerLocal();
    });
    searchHistory.appendChild(item);
  });
}

renderHistory();

// Sidebar toggle logic
const sidebar = document.querySelector(".sidebar");
const content = document.querySelector(".content");
const toggleBtn = document.getElementById("toggleSidebar");

if (toggleBtn && sidebar && content) {
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    content.classList.toggle("expanded");
  });
}