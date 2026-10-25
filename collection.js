import { db } from './firebase-config.js';
import { collection as fsCollection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initHeaderAuth } from './header.js';
import { getUserDataField, setUserDataField } from './user-state.js';

// Call this after your page loads
initHeaderAuth();

// ==============================
// COLLECTION.JS - FIRESTORE INTEGRATED
// ==============================

const TOTAL_PLAYERS = 110;

const collectionGrid = document.getElementById("collectionGrid");
const emptyCollection = document.getElementById("emptyCollection");

const collectionSearch = document.getElementById("collectionSearch");
const filterButtons = document.querySelectorAll(".filter-btn");
let favoriteOnly = false;
let favorites = [];

const totalPlayers = document.getElementById("totalPlayers");
const totalCountries = document.getElementById("totalCountries");
const totalClubs = document.getElementById("totalClubs");
const completionPercent = document.getElementById("completionPercent");
const statsBtn = document.getElementById("statsBtn");
const statsModal = document.getElementById("statsModal");
const closeStats = document.getElementById("closeStats");
const progressBar = document.getElementById("collectionProgress");
const collectionCount = document.getElementById("collectionCount");

const modal = document.getElementById("playerModal");
const closeModal = document.getElementById("closeModal");
const favoriteStar = document.getElementById("favoriteStar");
const modalImage = document.getElementById("modalImage");
const modalName = document.getElementById("modalName");
const modalNationality = document.getElementById("modalNationality");
const modalClub = document.getElementById("modalClub");
const modalPosition = document.getElementById("modalPosition");
const modalHeight = document.getElementById("modalHeight");
const modalWeight = document.getElementById("modalWeight");
const modalBirth = document.getElementById("modalBirth");
const modalDescription = document.getElementById("modalDescription");

const removeBtn = document.getElementById("removePlayer");

const sidebar = document.querySelector(".sidebar");
const content = document.querySelector(".content");
const toggleBtn = document.getElementById("toggleSidebar");

let collection = [];
let filteredCollection = [];
let allPlayers = [];
let selectedPlayer = null;
let currentFilter = "all";

// ==============================
// LOAD FIRESTORE DATABASE & USER STATE
// ==============================

async function loadFirestorePlayers() {
  try {
    const querySnapshot = await getDocs(fsCollection(db, "players"));
    allPlayers = [];
    
    querySnapshot.forEach((doc) => {
      allPlayers.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Loaded ${allPlayers.length} players from Firestore for Collection view.`);
    await loadCollection();
  } catch (error) {
    console.error("Failed to load players from Firestore:", error);
  }
}

// Initialize load from Firestore
loadFirestorePlayers();

if (toggleBtn && sidebar && content) {
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    content.classList.toggle("expanded");
  });
}

async function loadCollection() {
  collection = (await getUserDataField("collection")) || [];
  favorites = (await getUserDataField("favorites")) || [];
  filteredCollection = [...allPlayers];
  updateStats();
  renderCollection();
}

function updateStats() {
  if (totalPlayers) totalPlayers.textContent = collection.length;

  const countries = new Set(collection.map((player) => player.nationality).filter(Boolean));
  if (totalCountries) totalCountries.textContent = countries.size;

  const clubs = new Set(collection.map((player) => player.team).filter(Boolean));
  if (totalClubs) totalClubs.textContent = clubs.size;

  const totalPossible = allPlayers.length > 0 ? allPlayers.length : TOTAL_PLAYERS;
  const percent = Math.round((collection.length / totalPossible) * 100);

  if (completionPercent) completionPercent.textContent = percent + "%";
  if (progressBar) progressBar.style.width = percent + "%";
  if (collectionCount) collectionCount.textContent = `${collection.length} / ${totalPossible} Players`;
}

function renderCollection() {
  if (!collectionGrid) return;
  collectionGrid.innerHTML = "";

  if (allPlayers.length === 0) {
    return;
  }

  if (emptyCollection) emptyCollection.style.display = "none";

  filteredCollection.forEach((player) => {
    const isCollected = collection.some(
      (collectedPlayer) => collectedPlayer.name === player.name
    );

    const card = document.createElement("div");

    // ==========================================
    // MYSTERY CARD
    // ==========================================
    if (!isCollected) {
      card.className = "collection-card mystery-card";

      card.innerHTML = `
        <div class="mystery-image">
          <span>?</span>
        </div>

        <div class="mystery-lock">🔒</div>

        <h2>???</h2>

        <p>Mystery Player</p>

        <div class="mystery-status">
          NOT UNLOCKED
        </div>
      `;

      card.addEventListener("click", () => {
        card.classList.remove("mystery-shake");
        void card.offsetWidth;
        card.classList.add("mystery-shake");
      });

      collectionGrid.appendChild(card);
      return;
    }

    // ==========================================
    // UNLOCKED PLAYER CARD
    // ==========================================
    const collectedPlayer = collection.find(
      (collected) => collected.name === player.name
    ) || player;

    card.className = "collection-card";

    card.innerHTML = `
      <img 
        src="${collectedPlayer.image || player.image || "https://placehold.co/300x300"}"
        alt="${player.name || "Player"}"
      >

      <h2>${player.name || "Unknown"}</h2>

      <p>${player.team || "Unknown Club"}</p>

      <p>${player.nationality || "Unknown"}</p>

      <p>${player.position || "Unknown Position"}</p>
    `;

    card.addEventListener("click", () => {
      openModal(collectedPlayer);
    });

    collectionGrid.appendChild(card);
  });

  animateCards();
}

// ==============================
// SEARCH & FILTERING
// ==============================

if (collectionSearch) collectionSearch.addEventListener("input", filterPlayers);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.filter;
    filterPlayers();
  });
});

function filterPlayers() {
  const search = collectionSearch ? collectionSearch.value.toLowerCase().trim() : "";

  filteredCollection = allPlayers.filter((player) => {
    const isCollected = collection.some(
      (collectedPlayer) => collectedPlayer.name === player.name
    );

    let matchesSearch = true;

    // Mystery players should not be searchable
    if (!isCollected && search !== "") {
      return false;
    }

    if (search !== "") {
      matchesSearch =
        (player.name && player.name.toLowerCase().includes(search)) ||
        (player.team && player.team.toLowerCase().includes(search)) ||
        (player.nationality && player.nationality.toLowerCase().includes(search));
    }

    let matchesFilter = true;

    if (currentFilter !== "all") {
      if (!isCollected) {
        matchesFilter = true;
      } else {
        matchesFilter = matchesPositionFilter(player.position, currentFilter);
      }
    }

    const matchesFavorite = !favoriteOnly || favorites.includes(player.name);

    return matchesSearch && matchesFilter && matchesFavorite;
  });

  renderCollection();
}

function matchesPositionFilter(position, filter) {
  const pos = (position || "").toLowerCase();

  if (filter === "goalkeeper") {
    return pos.includes("goalkeeper") || pos.includes("keeper") || pos === "gk";
  }

  if (filter === "defender") {
    return (
      pos.includes("defender") ||
      pos.includes("back") ||
      pos.includes("centre-back") ||
      pos.includes("center-back") ||
      pos.includes("centre back") ||
      pos.includes("center back") ||
      pos.includes("sweeper") ||
      pos.includes("libero")
    );
  }

  if (filter === "midfielder") {
    return (
      pos.includes("midfielder") ||
      pos.includes("midfield") ||
      pos.includes("central mid") ||
      pos.includes("winger") ||
      pos.includes("wing")
    );
  }

  if (filter === "forward") {
    return (
      pos.includes("forward") ||
      pos.includes("striker") ||
      pos.includes("attacker") ||
      pos.includes("winger") ||
      pos.includes("wing")
    );
  }

  return true;
}

// ==============================
// MODAL & CARD INTERACTIONS
// ==============================

function openModal(player) {
  selectedPlayer = player;

  if (modalImage) modalImage.src = player.image || "https://placehold.co/300x300";
  if (modalName) modalName.textContent = player.name || "Unknown";
  if (modalNationality) modalNationality.textContent = "🌍 " + (player.nationality || "-");
  if (modalClub) modalClub.textContent = "🏟 " + (player.team || "-");
  if (modalPosition) modalPosition.textContent = "⚽ " + (player.position || "-");
  if (modalHeight) modalHeight.textContent = "📏 Height: " + (player.height || "-");
  if (modalWeight) modalWeight.textContent = "💪 Weight: " + (player.weight || "-");
  if (modalBirth) modalBirth.textContent = "🎂 " + (player.birth || "-");
  if (modalDescription) modalDescription.textContent = player.description || "No biography available.";

  if (favoriteStar) {
    favoriteStar.style.display = "inline";
    favoriteStar.textContent = favorites.includes(player.name) ? "★" : "☆";
  }

  if (modal) modal.classList.add("active");
}

if (closeModal) {
  closeModal.addEventListener("click", () => {
    if (modal) modal.classList.remove("active");
  });
}

window.addEventListener("click", (e) => {
  if (modal && e.target === modal) {
    modal.classList.remove("active");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal) {
    modal.classList.remove("active");
  }
});

// ==============================
// REMOVE PLAYER (CLOUDSYNCED)
// ==============================

if (removeBtn) {
  removeBtn.addEventListener("click", async () => {
    if (!selectedPlayer) return;

    const confirmed = confirm(`Remove ${selectedPlayer.name} from your collection?`);
    if (!confirmed) return;

    collection = collection.filter((player) => player.name !== selectedPlayer.name);
    await setUserDataField("collection", collection);

    updateStats();
    filterPlayers();

    if (modal) modal.classList.remove("active");
  });
}

// ==============================
// ANIMATIONS & UTILITIES
// ==============================

if (collectionSearch) {
  collectionSearch.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      collectionSearch.blur();
    }
  });
}

function animateCards() {
  const cards = document.querySelectorAll(".collection-card");
  cards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";

    setTimeout(() => {
      card.style.transition = "0.35s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 40);
  });
}

// ==============================
// FAVORITES & STATS MODAL (CLOUDSYNCED)
// ==============================

const favoriteCard = document.getElementById("favoriteFilter");
if (favoriteCard) {
  favoriteCard.addEventListener("click", () => {
    favoriteOnly = !favoriteOnly;
    favoriteCard.textContent = favoriteOnly ? "❤️ Showing Favorites" : "❤️ Favorites";
    favoriteCard.classList.toggle("active", favoriteOnly);
    filterPlayers();
  });
}

if (favoriteStar) {
  favoriteStar.addEventListener("click", async () => {
    if (!selectedPlayer) return;

    if (favorites.includes(selectedPlayer.name)) {
      favorites = favorites.filter((name) => name !== selectedPlayer.name);
    } else {
      favorites.push(selectedPlayer.name);
    }

    await setUserDataField("favorites", favorites);
    favoriteStar.textContent = favorites.includes(selectedPlayer.name) ? "★" : "☆";
    filterPlayers();
  });
}

function getMostCommon(arr) {
  if (!arr || arr.length === 0) return "-";
  const counts = {};
  arr.forEach((item) => {
    if (item) counts[item] = (counts[item] || 0) + 1;
  });
  const keys = Object.keys(counts);
  if (keys.length === 0) return "-";
  return keys.reduce((a, b) => (counts[a] > counts[b] ? a : b));
}

function updateStatistics() {
  const statPlayers = document.getElementById("statPlayers");
  const statFavorites = document.getElementById("statFavorites");
  const statIcons = document.getElementById("statIcons");
  const statRating = document.getElementById("statRating");
  const statNation = document.getElementById("statNation");
  const statClub = document.getElementById("statClub");

  if (statPlayers) statPlayers.textContent = collection.length;
  if (statFavorites) statFavorites.textContent = favorites.length;
  if (statIcons) statIcons.textContent = collection.filter((p) => p.rarity === "icon").length;

  const ratings = collection.map((p) => Number(p.rating)).filter((r) => !isNaN(r));
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
  if (statRating) statRating.textContent = avg;

  if (statNation) statNation.textContent = getMostCommon(collection.map((p) => p.nationality));
  if (statClub) statClub.textContent = getMostCommon(collection.map((p) => p.team));

  const gk = collection.filter((p) => p.position?.toLowerCase().includes("goalkeeper")).length;
  const def = collection.filter((p) => {
    const pos = p.position?.toLowerCase() || "";
    return pos.includes("back") || pos.includes("sweeper");
  }).length;
  const mid = collection.filter((p) => {
    const pos = p.position?.toLowerCase() || "";
    return pos.includes("midfield");
  }).length;
  const fwd = collection.filter((p) => {
    const pos = p.position?.toLowerCase() || "";
    return pos.includes("wing") || pos.includes("forward") || pos.includes("striker");
  }).length;

  const statGK = document.getElementById("statGK");
  const statDEF = document.getElementById("statDEF");
  const statMID = document.getElementById("statMID");
  const statFWD = document.getElementById("statFWD");

  if (statGK) statGK.textContent = gk;
  if (statDEF) statDEF.textContent = def;
  if (statMID) statMID.textContent = mid;
  if (statFWD) statFWD.textContent = fwd;
}

if (statsBtn && statsModal) {
  statsBtn.addEventListener("click", () => {
    updateStatistics();
    statsModal.classList.add("active");
  });
}

if (closeStats && statsModal) {
  closeStats.addEventListener("click", () => {
    statsModal.classList.remove("active");
  });
}

window.addEventListener("click", (e) => {
  if (statsModal && e.target === statsModal) {
    statsModal.classList.remove("active");
  }
});