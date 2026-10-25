// ==========================================
// FOOTBALL ARCHIVE ECONOMY
// ==========================================

const STARTING_COINS = 1000;

// -------------------------
// COINS
// -------------------------

function getCoins() {
  const coins = Number(localStorage.getItem("coins"));

  if (isNaN(coins)) {
    localStorage.setItem("coins", STARTING_COINS);
    return STARTING_COINS;
  }

  return coins;
}

function setCoins(amount) {
  localStorage.setItem("coins", amount);
}

function addCoins(amount) {
  const coins = getCoins() + amount;

  setCoins(coins);

  if (typeof updateCoinDisplay === "function") {
    updateCoinDisplay();
  }

  return coins;
}

function spendCoins(amount) {
  const coins = getCoins();

  if (coins < amount) {
    return false;
  }

  setCoins(coins - amount);

  if (typeof updateCoinDisplay === "function") {
    updateCoinDisplay();
  }

  return true;
}

// -------------------------
// COLLECTION
// -------------------------

function getCollection() {
  return JSON.parse(localStorage.getItem("collection")) || [];
}

function saveCollection(collection) {
  localStorage.setItem("collection", JSON.stringify(collection));
}

function addPlayer(player) {
  const collection = getCollection();

  collection.push(player);

  saveCollection(collection);
}

function collectionSize() {
  return getCollection().length;
}