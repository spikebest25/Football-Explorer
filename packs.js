import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initHeaderAuth } from './header.js';
import { getUserDataField, setUserDataField } from './user-state.js';

// Call this after your page loads
initHeaderAuth();

// ==========================================
// ELEMENTS
// ==========================================

const pack = document.getElementById("pack");
const openBtn = document.getElementById("openPackBtn");

const revealSection = document.getElementById("revealSection");
const playerCard = document.getElementById("playerCard");

const cardImage = document.getElementById("cardImage");
const cardName = document.getElementById("cardName");
const cardNation = document.getElementById("cardNation");
const cardClub = document.getElementById("cardClub");
const cardPosition = document.getElementById("cardPosition");
const clubBadge = document.getElementById("clubBadge");
const rarityBadge = document.getElementById("cardRarity");
const cardRating = document.getElementById("cardRating");
const cardNew = document.getElementById("cardNew");
const coinDisplay = document.getElementById("coinDisplayStats");
const flash = document.getElementById("flash");
const anotherPackBtn = document.getElementById("anotherPack");
const collectionBtn = document.getElementById("viewCollection");

const dailyRewardBtn = document.getElementById("dailyRewardBtn");
const achievementText = document.getElementById("achievementText");

const packsOpenedText = document.getElementById("packsOpened");
const bestPullText = document.getElementById("bestPull");
const collectionOwnedText = document.getElementById("collectionOwned");

// ==========================================
// DATA & STATE
// ==========================================

let players = [];

let duplicateProtection = 0;
let luckyBooster = false;
let iconBooster = false;

// Load user settings/boosters from cloud/state manager on startup
async function loadUserState() {
  duplicateProtection = Number(await getUserDataField("duplicateProtection")) || 0;
  luckyBooster = (await getUserDataField("luckyBooster")) === true;

  // Temporarily force iconBooster to false if it got stuck active
  iconBooster = false; 
  await setUserDataField("iconBooster", false);

  updateCoinDisplay();
  updateCollectionCount();
  initStatsDisplay();
  checkDailyReward();
  checkAchievements();
}

loadUserState();

// ==========================================
// COIN HELPERS (CLOUDSYNCED)
// ==========================================

async function getCoins() {
  const coins = await getUserDataField("coins");
  return coins !== null ? Number(coins) : 1000;
}

async function spendCoins(amount) {
  let currentCoins = await getCoins();
  if (currentCoins >= amount) {
    currentCoins -= amount;
    await setUserDataField("coins", currentCoins);
    updateCoinDisplay();
    return true;
  }
  return false;
}

async function addCoins(amount) {
  let currentCoins = await getCoins();
  currentCoins += amount;
  await setUserDataField("coins", currentCoins);
  updateCoinDisplay();
}

// ==========================================
// LOAD DATABASE FROM FIRESTORE
// ==========================================

async function loadFirestorePlayers() {
  try {
    const querySnapshot = await getDocs(collection(db, "players"));
    players = [];

    querySnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Loaded ${players.length} players from Firestore for Pack Simulator.`);
    updateCollectionCount();
  } catch (error) {
    console.error("Failed to load players from Firestore:", error);
  }
}

loadFirestorePlayers();

// ==========================================
// COINS DISPLAY
// ==========================================

async function updateCoinDisplay() {
  if (!coinDisplay) return;
  const coins = await getCoins();
  coinDisplay.textContent = `${coins} 🪙`;
}

// ==========================================
// RARITY GENERATION (Hero Rarer than Legendary)
// ==========================================

function generateRarity() {
  const rand = Math.random() * 100;

  if (iconBooster) {
    return "icon";
  }

  // Adjusted cumulative distribution:
  // Common: 45% (0 - 45)
  // Rare: 25% (45 - 70)
  // Epic: 15% (70 - 85)
  // Legendary: 9% (85 - 94)
  // Hero: 4% (94 - 98) -> Rarer than Legendary!
  // Icon: 2% (98 - 100)

  if (rand < 45) return "common";
  if (rand < 70) return "rare";
  if (rand < 85) return "epic";
  if (rand < 94) return "legendary";
  if (rand < 98) return "hero";
  return "icon";
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==========================================
// OPEN PACK
// ==========================================

if (openBtn) {
  openBtn.addEventListener("click", openPack);
}

async function openPack() {
  if (!openBtn) return;
  openBtn.disabled = true;

  if (players.length === 0) {
    openBtn.disabled = false;
    alert("Player database is loading... please try again in a moment.");
    return;
  }

  const hasSpent = await spendCoins(100);
  if (!hasSpent) {
    openBtn.disabled = false;
    alert("Not enough coins!");
    return;
  }

  if (revealSection) revealSection.classList.remove("active");
  if (pack) pack.classList.add("opening");

  await new Promise((r) => setTimeout(r, 900));

  if (flash) flash.classList.add("active");
  await new Promise((r) => setTimeout(r, 250));
  if (flash) flash.classList.remove("active");

  if (pack) pack.classList.remove("opening");

  const rarity = generateRarity();

  // Filter pool by generated rarity matching the fixed database rarity
  let pool = players.filter((p) => p.rarity && p.rarity.toLowerCase() === rarity.toLowerCase());

  // Fallback if no players exist for that rarity yet in Firestore
  if (pool.length === 0) {
    pool = players;
  }

  let player = pool[Math.floor(Math.random() * pool.length)];

  if (duplicateProtection > 0) {
    const userCollection = (await getUserDataField("collection")) || [];
    const unowned = pool.filter(
      (p) => !userCollection.some((c) => c.name === p.name),
    );

    if (unowned.length > 0) {
      player = unowned[Math.floor(Math.random() * unowned.length)];
      duplicateProtection--;
      await setUserDataField("duplicateProtection", duplicateProtection);
    } else {
      alert(
        "🛡️ Duplicate Protection expired because you've collected every available player in this rarity!",
      );
      duplicateProtection = 0;
      await setUserDataField("duplicateProtection", 0);
    }
  }

  player = { ...player };
  player.rarity = player.rarity || rarity;
  // Use fixed database rating, with fallback range if missing
  player.rating = player.rating || (
    player.rarity === "icon" ? random(96, 99) :
    player.rarity === "hero" ? random(90, 92) :
    player.rarity === "legendary" ? random(93, 95) :
    player.rarity === "epic" ? random(87, 89) :
    player.rarity === "rare" ? random(84, 86) : random(80, 83)
  );

  await loadImage(player);
  await revealPlayer(player);

  openBtn.disabled = false;
}

// ==========================================
// LOAD IMAGE FROM EXTERNAL API
// ==========================================

async function loadImage(player) {
  try {
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=${encodeURIComponent(player.name)}`,
    );

    const data = await response.json();

    if (data && data.player && data.player[0]) {
      const apiPlayer = data.player[0];
      player.image = apiPlayer.strThumb || player.image || "https://placehold.co/400x400?text=Player";
      player.badge = apiPlayer.strTeamBadge || player.badge || "";
      player.flag = apiPlayer.strNationality || player.nationality;
    } else {
      player.image = player.image || "https://placehold.co/400x400?text=Player";
      player.badge = player.badge || "";
      player.flag = player.nationality;
    }
  } catch {
    player.image = player.image || "https://placehold.co/400x400?text=Player";
    player.badge = player.badge || "";
    player.flag = player.nationality;
  }
}

// ==========================================
// REVEAL PLAYER
// ==========================================

async function revealPlayer(player) {
  if (revealSection) revealSection.classList.add("active");

  if (playerCard) playerCard.className = `player-card ${player.rarity}`;
  if (rarityBadge) rarityBadge.textContent = player.rarity.toUpperCase();
  if (cardRating) cardRating.textContent = player.rating;
  if (cardImage) cardImage.src = player.image;
  if (cardName) cardName.textContent = player.name || "Unknown";
  if (cardNation) cardNation.textContent = player.nationality || "-";
  if (cardClub) cardClub.textContent = player.team || "-";
  if (cardPosition) cardPosition.textContent = player.position || "-";

  if (clubBadge) {
    if (player.badge) {
      clubBadge.src = player.badge;
      clubBadge.style.display = "block";
    } else {
      clubBadge.style.display = "none";
    }
  }

  const userCollection = (await getUserDataField("collection")) || [];
  const owned = userCollection.some((p) => p.name === player.name);

  if (cardNew) {
    if (owned) {
      cardNew.textContent = "DUPLICATE";
      cardNew.className = "new-badge duplicate";
    } else {
      cardNew.textContent = "NEW";
      cardNew.className = "new-badge";
    }
  }

  await savePlayer(player);
  await updateStats(player);

  if ((player.rarity === "icon" || player.rarity === "hero") && playerCard) {
    playerCard.animate(
      [
        { transform: "scale(.9)", filter: "brightness(1)" },
        { transform: "scale(1.08)", filter: "brightness(1.45)" },
        { transform: "scale(1)", filter: "brightness(1)" },
      ],
      { duration: 700 }
    );
  }
}

// ==========================================
// SAVE TO COLLECTION (CLOUDSYNCED)
// ==========================================

async function savePlayer(player) {
  let userCollection = (await getUserDataField("collection")) || [];
  const existing = userCollection.find((p) => p.name === player.name);

  if (existing) {
    await addCoins(50);
    alert(`A duplicate!\n+50 Coins 🪙`);

    if (!existing.image && player.image) {
      existing.image = player.image;
      await setUserDataField("collection", userCollection);
    }
    return;
  }

  player.rating ??= 85;
  userCollection.push(player);

  await setUserDataField("collection", userCollection);
  updateCollectionCount();
}

// ==========================================
// UPDATE STATS (CLOUDSYNCED)
// ==========================================

async function updateStats(player) {
  let opened = Number(await getUserDataField("packsOpened")) || 0;
  opened++;

  await setUserDataField("packsOpened", opened);
  if (packsOpenedText) packsOpenedText.textContent = opened;

  const rarityRank = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    hero: 5,
    icon: 6,
  };

  const current = await getUserDataField("bestPull");

  if (!current || rarityRank[player.rarity] > rarityRank[current]) {
    await setUserDataField("bestPull", player.rarity);
  }

  const best = (await getUserDataField("bestPull")) || "None";
  if (bestPullText) bestPullText.textContent = best === "None" ? "None" : best.toUpperCase();

  checkAchievements();
}

// ==========================================
// BUTTON EVENTS
// ==========================================

if (anotherPackBtn) {
  anotherPackBtn.addEventListener("click", () => {
    if (revealSection) revealSection.classList.remove("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

if (collectionBtn) {
  collectionBtn.addEventListener("click", () => {
    location.href = "collection.html";
  });
}

// ==========================================
// DAILY REWARD
// ==========================================

async function checkDailyReward() {
  if (!dailyRewardBtn) return;

  const today = new Date().toDateString();
  const claimed = await getUserDataField("dailyReward");

  if (claimed === today) {
    dailyRewardBtn.disabled = true;
    dailyRewardBtn.textContent = "Already Claimed";
  }
}

if (dailyRewardBtn) {
  dailyRewardBtn.addEventListener("click", async () => {
    const today = new Date().toDateString();

    await addCoins(200);
    checkAchievements();

    await setUserDataField("dailyReward", today);
    dailyRewardBtn.disabled = true;
    dailyRewardBtn.textContent = "Claimed";
  });
}

// ==========================================
// ACHIEVEMENTS
// ==========================================

async function checkAchievements() {
  if (!achievementText) return;

  const userCollection = (await getUserDataField("collection")) || [];
  const size = userCollection.length;

  if (size >= 100) achievementText.textContent = "🏆 Football Master";
  else if (size >= 75) achievementText.textContent = "👑 Legendary Collector";
  else if (size >= 50) achievementText.textContent = "🌟 Elite Collector";
  else if (size >= 25) achievementText.textContent = "⭐ Rising Collector";
  else if (size >= 10) achievementText.textContent = "🎉 Beginner Collector";
  else achievementText.textContent = `${size} Players Collected`;
}

// ==========================================
// SHOP PURCHASES
// ==========================================

const protectionBtn = document.getElementById("buyProtection");
const luckyBtn = document.getElementById("buyLucky");
const iconBtn = document.getElementById("buyIcon");

if (protectionBtn) {
  protectionBtn.addEventListener("click", async () => {
    const hasSpent = await spendCoins(500);
    if (!hasSpent) {
      alert("Not enough coins!");
      return;
    }

    duplicateProtection += 5;
    await setUserDataField("duplicateProtection", duplicateProtection);
    alert("Duplicate Protection Activated!");
  });
}

if (luckyBtn) {
  luckyBtn.addEventListener("click", async () => {
    const hasSpent = await spendCoins(400);
    if (!hasSpent) {
      alert("Not enough coins!");
      return;
    }

    luckyBooster = true;
    await setUserDataField("luckyBooster", true);
    alert("Lucky Booster Activated!");
  });
}

if (iconBtn) {
  iconBtn.addEventListener("click", async () => {
    const hasSpent = await spendCoins(1200);
    if (!hasSpent) {
      alert("Not enough coins!");
      return;
    }

    iconBooster = true;
    await setUserDataField("iconBooster", true);
    alert("Icon Booster Activated!");
  });
}

// ==========================================
// SIDEBAR TOGGLE
// ==========================================

const sidebar = document.querySelector(".sidebar");
const content = document.querySelector(".content");
const toggleBtn = document.getElementById("toggleSidebar");

if (toggleBtn && sidebar && content) {
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    content.classList.toggle("expanded");
  });
}

// ==========================================
// INITIAL STATS & COUNTS
// ==========================================

async function initStatsDisplay() {
  if (packsOpenedText) {
    packsOpenedText.textContent = (await getUserDataField("packsOpened")) || 0;
  }

  if (bestPullText) {
    const best = (await getUserDataField("bestPull")) || "None";
    bestPullText.textContent = best === "None" ? "None" : best.toUpperCase();
  }
}

async function updateCollectionCount() {
  if (!collectionOwnedText) return;
  const userCollection = (await getUserDataField("collection")) || [];
  collectionOwnedText.textContent = `${userCollection.length} / ${players.length}`;
}