import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initHeaderAuth } from './header.js';

// Call this after your page loads
initHeaderAuth();
const playersGrid = document.getElementById("playersGrid");
const playerSearch = document.getElementById("playerSearch");
const sortPlayers = document.getElementById("sortPlayers");
const playerCount = document.getElementById("playerCount");
const resultsCount = document.getElementById("resultsCount");

let players = [];

// ===========================
// LOAD DATABASE
// ===========================

async function loadPlayers() {
  try {
    const querySnapshot = await getDocs(collection(db, "players"));
    players = []; // Reset global array
    
    querySnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });

    console.log("Loaded players from Firestore:", players);
    
    // Update global total count UI if element exists
    if (playerCount) {
      playerCount.textContent = players.length;
    }

    // Render players in the grid
    filterPlayers();
  } catch (error) {
    console.error("Error fetching players from Firestore:", error);
  }
}

// Call the function on load
loadPlayers();

// ===========================
// DISPLAY CARDS
// ===========================

function displayPlayers(playersArray) {
  if (!playersGrid) return;
  playersGrid.innerHTML = "";

  playersArray.forEach((player) => {
    const card = document.createElement("div");
    card.className = "player-card";

    const playerName = player.name || "Unknown Player";
    const initials = playerName
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const image = player.image
      ? `<img src="${player.image}" 
            alt="${playerName}"
            onerror="this.style.display='none'; this.parentElement.innerHTML='${initials}'">`
      : initials;

    card.innerHTML = `
        <div class="player-avatar">
            ${image}
        </div>
        <h2>
            ${playerName}
        </h2>
        <p class="nation">
            🌍 ${player.nationality || "Unknown"}
        </p>

        <hr>

        <p>
            🏟 ${player.team || "Unknown Club"}
        </p>

        <p>
            ⚽ ${player.position || "Unknown Position"}
        </p>

        <div class="view-profile">
            View Profile →
        </div>
        `;

    card.addEventListener("click", () => {
      window.location.href = `explorer.html?player=${encodeURIComponent(playerName)}`;
    });

    playersGrid.appendChild(card);
  });
}

// ===========================
// SEARCH & SORT EVENT LISTENERS
// ===========================

if (playerSearch) playerSearch.addEventListener("input", filterPlayers);
if (sortPlayers) sortPlayers.addEventListener("change", filterPlayers);

// ===========================
// FILTER + SORT
// ===========================

function filterPlayers() {
  let filtered = [...players];

  const query = playerSearch ? playerSearch.value.trim().toLowerCase() : "";

  if (query !== "") {
    filtered = filtered.filter((player) =>
      (player.name || "").toLowerCase().includes(query)
    );
  }

  if (sortPlayers && sortPlayers.value === "az") {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (sortPlayers) {
    filtered.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
  }

  displayPlayers(filtered);

  if (resultsCount) {
    resultsCount.textContent = `${filtered.length} Players`;
  }
}