import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { initHeaderAuth } from './header.js';

// Call this after your page loads
initHeaderAuth();
// ===========================
// ELEMENTS
// ===========================

const selects = document.querySelectorAll(".player-select");

const blueScore = document.getElementById("blueScore");
const redScore = document.getElementById("redScore");

const matchEvents = document.getElementById("matchEvents");

const simulateBtn = document.getElementById("simulateBtn");
const resetBtn = document.getElementById("resetBtn");
const randomTeamsBtn = document.getElementById("randomTeamsBtn");
const matchTimer = document.querySelector(".timer");
let playerStats = {};
let playerGoals = {};
let players = [];

let blueGoals = 0;
let redGoals = 0;

let matchRunning = false;

let lastPlayer = "";

// ===========================
// LOAD PLAYERS FROM FIRESTORE
// ===========================

async function loadFirestorePlayers() {
  try {
    const querySnapshot = await getDocs(collection(db, "players"));
    players = [];
    
    querySnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Loaded ${players.length} players from Firestore for Arena.`);
    loadSelectors();
  } catch (error) {
    console.error("Player loading error from Firestore:", error);
  }
}

// Initialize load
loadFirestorePlayers();

// ===========================
// POSITION SYSTEM
// ===========================

function getRoles(position) {
  if (!position) return [];
  position = position.toLowerCase();

  let roles = [];

  if (position.includes("goalkeeper") || position.includes("keeper") || position === "gk") {
    roles.push("gk");
  }

  if (position.includes("back") || position.includes("sweeper") || position.includes("libero") || position.includes("defender")) {
    roles.push("defender");
  }

  if (position.includes("midfielder") || position.includes("midfield")) {
    roles.push("midfielder");
  }

  if (
    position.includes("forward") ||
    position.includes("winger") ||
    position.includes("striker") ||
    position.includes("attacker") ||
    position.includes("wing")
  ) {
    roles.push("attacker");
  }

  return roles;
}

// ===========================
// DROPDOWNS
// ===========================

function loadSelectors() {
  selects.forEach((select) => {
    let id = select.id;
    let role = "";

    if (id.includes("GK")) {
      role = "gk";
    } else if (id.includes("DEF")) {
      role = "defender";
    } else if (id.includes("MID")) {
      role = "midfielder";
    } else if (id.includes("ATT")) {
      role = "attacker";
    }

    select.innerHTML = `<option value="">Select Player</option>`;

    players
      .filter((player) => {
        return getRoles(player.position).includes(role);
      })
      .forEach((player) => {
        let option = document.createElement("option");
        option.value = player.name;
        option.textContent = player.name;
        select.appendChild(option);
      });
  });
}

// ===========================
// START MATCH
// ===========================

if (simulateBtn) {
  simulateBtn.addEventListener("click", startMatch);
}

function startMatch() {
  playerGoals = {};
  playerStats = {};
  if (matchRunning) return;

  let blueTeam = getTeam("blue");
  let redTeam = getTeam("red");

  displayPitch(blueTeam, "blue");
  displayPitch(redTeam, "red");

  if (blueTeam.some((player) => !player) || redTeam.some((player) => !player)) {
    addEvent("⚠️ Pick all 10 players first!");
    return;
  }
  resetScores();

  matchRunning = true;
  matchEvents.innerHTML = "";
  addEvent("🏟️️ The match begins!");

  let minute = 0;

  let match = setInterval(() => {
    minute += 5;
    if (matchTimer) matchTimer.textContent = `${minute}'`;

    let event = createHighlight(blueTeam, redTeam);
    addEvent(`${minute}' ${event.text}`);

    if (event.goal) {
      if (event.team === "blue") {
        blueGoals++;
        if (blueScore) blueScore.textContent = blueGoals;
      } else {
        redGoals++;
        if (redScore) redScore.textContent = redGoals;
      }

      // Match Storylines
      if (Math.abs(blueGoals - redGoals) === 1) {
        if (blueGoals > redGoals) {
          addEvent("🔵 TEAM BLUE TAKES THE LEAD!! THE FANS ARE ON THEIR FEET!");
        } else {
          addEvent("🔴 TEAM RED STRIKES FIRST!! WHAT A RESPONSE FROM THE REDS!");
        }
      }

      if (blueGoals === redGoals && blueGoals > 0) {
        addEvent("🤯 THEY'VE EQUALISED!!!");
        addEvent("🔥 INCREDIBLE CHARACTER!! THIS MATCH IS ALIVE ONCE AGAIN!");
      }

      if (Math.abs(blueGoals - redGoals) >= 3) {
        if (blueGoals > redGoals) {
          addEvent("💥 TEAM BLUE ARE RUNNING RIOT!! THIS COULD TURN INTO A ROUT!");
        } else {
          addEvent("💥 TEAM RED ARE ABSOLUTELY DOMINATING THIS MATCH!");
        }
      }

      if (minute >= 85) {
        addEvent("⏰ LATE DRAMA!! EVERY TOUCH COULD DECIDE THE MATCH!");
      }

      if (minute === 60 && blueGoals === 0 && redGoals === 0) {
        addEvent("😬 STILL NO GOALS... THE TENSION IS ALMOST UNBEARABLE!");
        addEvent("🛡 BOTH DEFENCES HAVE BEEN ABSOLUTELY OUTSTANDING!");
      }
    }

    if (minute >= 90) {
      clearInterval(match);
      finishMatch();
      matchRunning = false;
    }
  }, 2000);
}

// ===========================
// GET TEAM
// ===========================

function getTeam(team) {
  let ids = [
    `${team}GK`,
    `${team}DEF`,
    `${team}MID1`,
    `${team}MID2`,
    `${team}ATT`,
  ];

  return ids.map((id) => {
    const el = document.getElementById(id);
    let name = el ? el.value : "";
    return players.find((player) => player.name === name);
  });
}

// ===========================
// HIGHLIGHTS
// ===========================

function createHighlight(blueTeam, redTeam) {
  let team = Math.random() < 0.5 ? blueTeam : redTeam;
  let player;
  let validPlayers = team.filter((p) => p);

  if (validPlayers.length === 0) {
    return {
      goal: false,
      text: "⚠️️ No players available.",
    };
  }

  do {
    player = validPlayers[Math.floor(Math.random() * validPlayers.length)];
  } while (validPlayers.length > 1 && player.name === lastPlayer);

  lastPlayer = player.name;

  if (!playerStats[player.name]) {
    playerStats[player.name] = {
      goals: 0,
      appearances: 0,
    };
  }

  playerStats[player.name].appearances++;
  let scored = canScore(player);
  let teamName = team === blueTeam ? "blue" : "red";

  if (scored) {
    const goalMessages = [
      `⚽ GOOOOOOOOOOOOOOOOOOOOOOOOOOAL!!! ${player.name} SENDS THE STADIUM INTO ABSOLUTE CHAOS!! WHAT A STRIKE!! 🔥🔥`,
      `⚽ GOLAZOOOOOOOOOOOOOOOO!!! ${player.name} UNLEASHES AN ABSOLUTE ROCKET INTO THE TOP CORNER!! THERE WAS NO STOPPING THAT!!`,
      `⚽ UNBELIEVABLE!!! ${player.name} PRODUCES A MOMENT OF PURE MAGIC!! THE CROWD CAN'T BELIEVE WHAT THEY'VE JUST SEEN!!`,
      `⚽ ${player.name} takes one touch... shoots... GOOOOOOAL!! CALM, CLINICAL AND WORLD CLASS!!`,
      `⚽ ${player.name} DANCES PAST THE DEFENCE... FIRES... AND SCORES!! THE FANS ARE LOSING THEIR MINDS!!`,
      `⚽ THE STADIUM HAS ERUPTED!! ${player.name} HAS WRITTEN HIS NAME INTO TODAY'S STORY!!`,
      `⚽ WHAT A FINISH!! ${player.name} MAKES ABSOLUTELY NO MISTAKE!! THIS MATCH HAS COME ALIVE!!`,
      `⚽ INCREDIBLE SCENES!! ${player.name} DELIVERS WHEN HIS TEAM NEEDED HIM MOST!!`,
      `⚽ GOOOOOOOOOOOOOOOAL!! ${player.name} CELEBRATES WILDLY AS HIS TEAM TAKES THE LEAD!!`,
      `⚽ YOU CANNOT SCRIPT THIS!! ${player.name} STRIKES AT THE PERFECT MOMENT!!`,
    ];

    playerStats[player.name].goals++;
    if (!playerGoals[player.name]) {
      playerGoals[player.name] = 0;
    }
    playerGoals[player.name]++;

    const goalCount = playerGoals[player.name];

    if (goalCount === 2) {
      addEvent(`⚽⚽ BRACE FOR ${player.name.toUpperCase()}!! HE'S HAVING A FANTASTIC MATCH!! 🔥`);
    } else if (goalCount === 3) {
      addEvent(`🎩🎩🎩 HAT-TRICK HEROOOOOOOOOOOOOOOOOOO!!! ${player.name.toUpperCase()} HAS THE MATCH BALL!! WHAT A LEGEND!!!`);
    } else if (goalCount === 4) {
      addEvent(`🤯 FOUR GOALS!! ${player.name.toUpperCase()} IS ABSOLUTELY UNSTOPPABLE TODAY!!`);
    } else if (goalCount === 5) {
      addEvent(`👑 FIVE GOALS!!!!! ${player.name.toUpperCase()} HAS WRITTEN FOOTBALL HISTORY TODAY!!`);
    }

    return {
      goal: true,
      team: teamName,
      text: goalMessages[Math.floor(Math.random() * goalMessages.length)],
    };
  }

  let roles = getRoles(player.position);
  let events = [];

  if (roles.includes("gk")) {
    events = [
      `🧤 WHAT A SAVE!! ${player.name} FLIES ACROSS GOAL TO KEEP HIS TEAM ALIVE!!`,
      `🚫 NO WAY THROUGH!! ${player.name} MAKES AN OUTRAGEOUS STOP!!`,
      `🙌 ${player.name} STANDS TALL!! THE STRIKER CAN'T BELIEVE IT!!`,
      `🧱 A BRICK WALL IN GOAL!! ${player.name} REFUSES TO BE BEATEN!!`,
      `🔥 SENSATIONAL REFLEXES!! ${player.name} DENIES A CERTAIN GOAL!!`,
    ];
  } else if (roles.includes("defender")) {
    events = [
      `🛡 LAST-DITCH TACKLE!! ${player.name} SAVES HIS TEAM AT THE VERY LAST SECOND!!`,
      `💪 ${player.name} BULLIES THE ATTACKER OFF THE BALL!! WHAT DEFENDING!!`,
      `🚫 ${player.name} READS THE GAME PERFECTLY AND SHUTS THE ATTACK DOWN!!`,
      `👏 A DEFENSIVE MASTERCLASS FROM ${player.name}!!`,
      `⚔️ ${player.name} WINS A HUGE DUEL AND SENDS THE BALL CLEAR!!`,
    ];
  } else if (roles.includes("midfielder")) {
    events = [
      `🎯 ${player.name} SPLITS THE DEFENCE WITH A RIDICULOUS THROUGH BALL!!`,
      `✨ ${player.name} IS RUNNING THE MIDFIELD LIKE A CONDUCTOR!!`,
      `🔥 THE CROWD RISES TO THEIR FEET AS ${player.name} GLIDES PAST TWO PLAYERS!!`,
      `⚡ ${player.name} TRIES HIS LUCK FROM DISTANCE... JUST INCHES WIDE!!`,
      `🎩 ABSOLUTE SILK FROM ${player.name}!! THE TECHNIQUE IS OUT OF THIS WORLD!!`,
    ];
  } else {
    events = [
      `🔥 ${player.name} IS TERRORISING THE DEFENCE!! THEY JUST CAN'T HANDLE HIM!!`,
      `⚡ ${player.name} BURSTS THROUGH... THE CROWD HOLDS ITS BREATH!!`,
      `😱 HUGE CHANCE!! ${player.name} COMES SO CLOSE TO SCORING!!`,
      `💨 ${player.name} LEAVES THE DEFENDERS FOR DEAD WITH HIS PACE!!`,
      `🎯 ${player.name} FIRES JUST WIDE!! THAT WAS CENTIMETRES AWAY!!`,
    ];
  }

  return {
    goal: false,
    text: events[Math.floor(Math.random() * events.length)],
  };
}

if (randomTeamsBtn) {
  randomTeamsBtn.addEventListener("click", fillRandomTeams);
}

// ===========================
// SCORING
// ===========================

function canScore(player) {
  let roles = getRoles(player.position);
  let chance = 0.05;

  if (roles.includes("gk")) {
    chance = 0.01;
  } else if (roles.includes("defender")) {
    chance = 0.04;
  } else if (roles.includes("midfielder")) {
    chance = 0.15;
  } else if (roles.includes("attacker")) {
    chance = 0.35;
  }

  return Math.random() < chance;
}

// ===========================
// END MATCH
// ===========================

function finishMatch() {
  if (blueGoals > redGoals) {
    addEvent(`🏁 FULL TIME!! TEAM BLUE WINS ${blueGoals}-${redGoals}! WHAT A PERFORMANCE!`);
    addEvent("🔵 Blue celebrate wildly as the final whistle blows!");
    addEvent("💙 Joy for Team Blue... heartbreak for Team Red after an unforgettable battle.");
  } else if (redGoals > blueGoals) {
    addEvent(`🏁 FULL TIME!! TEAM RED WINS ${redGoals}-${blueGoals}! AN INCREDIBLE DISPLAY OF FOOTBALL!`);
    addEvent("🔴 The Red supporters erupt with celebration!");
    addEvent("❤️ Heartbreak for Team Blue... they gave everything until the very last whistle.");
  } else {
    addEvent(`🏁 FULL TIME!! IT ENDS ${blueGoals}-${redGoals}! NOBODY COULD SEPARATE THESE TWO SIDES!`);
    addEvent("🤝 Both teams leave the pitch to a standing ovation after an unforgettable contest.");
    addEvent("👏 A match full of passion, drama and unforgettable moments.");
  }

  if (blueGoals >= 5) {
    addEvent("🤯 WHAT A DEMOLITION JOB!! TEAM BLUE HAVE BEEN UNSTOPPABLE TODAY!");
  }

  if (redGoals >= 5) {
    addEvent("👑 A FIVE-STAR PERFORMANCE FROM TEAM RED!! ABSOLUTE FOOTBALLING PERFECTION!");
  }

  if (blueGoals === 0 && redGoals === 0) {
    addEvent("🧤 BOTH GOALKEEPERS WALK AWAY AS HEROES AFTER A DEFENSIVE MASTERCLASS!");
  }

  if (Math.abs(blueGoals - redGoals) === 1) {
    addEvent("💔 HEARTBREAK FOR THE LOSING SIDE... THEY FOUGHT UNTIL THE VERY LAST WHISTLE.");
  }

  if (blueGoals + redGoals >= 6) {
    addEvent("🎆 WHAT A SPECTACLE!! THIS MATCH WILL BE TALKED ABOUT FOR YEARS TO COME!");
  }

  showMOTM();
  generateStats();
}

// ===========================
// UTILITIES
// ===========================

function addEvent(text) {
  if (!matchEvents) return;
  let p = document.createElement("p");
  p.textContent = text;
  matchEvents.prepend(p);
}

function resetScores() {
  blueGoals = 0;
  redGoals = 0;
  if (blueScore) blueScore.textContent = 0;
  if (redScore) redScore.textContent = 0;
  if (matchTimer) matchTimer.textContent = "0'";
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    resetScores();
    playerStats = {};
    playerGoals = {};
    lastPlayer = "";
    matchRunning = false;
    if (matchEvents) matchEvents.innerHTML = "<p>Match reset.</p>";
  });
}

// ===========================
// UPDATE MINI PITCHS
// ===========================

function displayPitch(team, colour) {
  if (!team || team.length !== 5) return;

  const ids =
    colour === "blue"
      ? [
          "bluePitchGK",
          "bluePitchDEF",
          "bluePitchMID1",
          "bluePitchMID2",
          "bluePitchATT",
        ]
      : [
          "redPitchGK",
          "redPitchDEF",
          "redPitchMID1",
          "redPitchMID2",
          "redPitchATT",
        ];

  team.forEach((player, index) => {
    const marker = document.getElementById(ids[index]);
    if (!marker) return;

    if (!player) {
      marker.innerHTML = "❓<span>Empty</span>";
      return;
    }

    let icon = "⚽";
    const roles = getRoles(player.position);

    if (roles.includes("gk")) icon = "🧤";
    else if (roles.includes("defender")) icon = "🛡";
    else if (roles.includes("midfielder")) icon = "🎯";
    else icon = "⚽";

    const surname = player.name ? player.name.split(" ").pop() : "Unknown";
    marker.innerHTML = `${icon}<span>${surname}</span>`;
  });
}

function showMOTM() {
  let winner = "";
  let bestScore = -1;
  let rating = 6.0;

  for (const player in playerStats) {
    const stats = playerStats[player];
    const score = stats.goals * 3 + stats.appearances;

    if (score > bestScore) {
      bestScore = score;
      winner = player;
      rating = 6.5 + stats.goals * 1.1 + stats.appearances * 0.25;
    }
  }

  if (!winner) return;

  rating = Math.min(10, rating).toFixed(1);

  addEvent("");
  addEvent("⭐━━━━━━━━━━━━━━━━━━━━⭐");
  addEvent("🏆 MAN OF THE MATCH");
  addEvent(`⭐ ${winner}`);
  addEvent(`⚽ Goals: ${playerStats[winner].goals}`);
  addEvent(`🎯 Key Moments: ${playerStats[winner].appearances}`);
  addEvent(`🌟 Match Rating: ${rating}`);
  addEvent("⭐━━━━━━━━━━━━━━━━━━━━⭐");
}

function generateStats() {
  const blueShots = blueGoals + Math.floor(Math.random() * 8) + 6;
  const redShots = redGoals + Math.floor(Math.random() * 8) + 6;

  const blueOnTarget = Math.min(
    blueShots,
    blueGoals + Math.floor(Math.random() * 4) + 2,
  );

  const redOnTarget = Math.min(
    redShots,
    redGoals + Math.floor(Math.random() * 4) + 2,
  );

  const possession = 45 + Math.floor(Math.random() * 11);

  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setTxt("blueShots", blueShots);
  setTxt("redShots", redShots);
  setTxt("blueOnTarget", blueOnTarget);
  setTxt("redOnTarget", redOnTarget);
  setTxt("bluePossession", possession + "%");
  setTxt("redPossession", (100 - possession) + "%");
  setTxt("blueCorners", Math.floor(Math.random() * 8));
  setTxt("redCorners", Math.floor(Math.random() * 8));
  setTxt("blueFouls", Math.floor(Math.random() * 12) + 3);
  setTxt("redFouls", Math.floor(Math.random() * 12) + 3);
  setTxt("blueSaves", Math.max(0, redOnTarget - redGoals));
  setTxt("redSaves", Math.max(0, blueOnTarget - blueGoals));
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function fillRandomTeams() {
  const used = new Set();

  selects.forEach((select) => {
    let role = "";

    if (select.id.includes("GK")) role = "gk";
    else if (select.id.includes("DEF")) role = "defender";
    else if (select.id.includes("MID")) role = "midfielder";
    else role = "attacker";

    const available = players.filter((player) => {
      return getRoles(player.position).includes(role) && !used.has(player.name);
    });

    const chosen = randomChoice(available);

    if (chosen) {
      select.value = chosen.name;
      used.add(chosen.name);
    }
  });

  displayPitch(getTeam("blue"), "blue");
  displayPitch(getTeam("red"), "red");

  addEvent("🎲 Random teams generated!");
}