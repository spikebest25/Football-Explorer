import { auth, db } from './firebase-config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const ADMIN_EMAIL = 'nktony380@gmail.com';
const $ = id => document.getElementById(id);
const rarities = ['common', 'rare', 'epic', 'legendary', 'hero', 'icon'];
const colors = ['#919eab', '#00a76f', '#8e33ff', '#ff5630', '#ffab00', '#d6a21d'];
let players = [], page = 1, authorized = false, loading = false, toastTimer;
const pageSize = 10;

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const rarityOf = p => rarities.includes(p.rarity) ? p.rarity : 'common';
const initials = name => String(name || '?').split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase();
const ratingOf = p => Number.isFinite(Number(p.rating)) && p.rating !== null && p.rating !== '' ? Number(p.rating) : 0;

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('adminToast').textContent = message;
  $('adminToast').dataset.error = error;
  $('adminToast').hidden = false;
  toastTimer = setTimeout(() => { $('adminToast').hidden = true; }, 5000);
}

onAuthStateChanged(auth, async user => {
  authorized = Boolean(user && user.email === ADMIN_EMAIL);
  $('adminDashboard').style.display = authorized ? 'flex' : 'none';
  $('adminAuthWarning').style.display = authorized ? 'none' : 'block';
  if (!authorized) {
    players = [];
    renderPlayers();
    renderMetrics();
    $('adminAuthWarning').textContent = 'Access denied. Please sign in with an administrator account to continue.';
    return;
  }
  $('adminEmailDisplay').textContent = user.email;
  await loadAdminData();
});

async function loadAdminData() {
  if (!authorized || loading) return;
  loading = true;
  $('refreshPlayers').disabled = true;
  $('refreshPlayers').textContent = 'Refreshing…';
  try {
    const snapshot = await getDocs(collection(db, 'players'));
    if (!authorized) return;
    players = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    renderMetrics();
    renderPlayers();
  } catch (error) {
    console.error('Error loading admin database:', error);
    $('playerTableBody').innerHTML = '<tr><td colspan="6" class="empty-state">Unable to load players. Use Refresh to try again.</td></tr>';
    $('tableSummary').textContent = 'Could not load directory';
    $('rarityChart').innerHTML = '<p class="empty-state">Distribution is unavailable. Please refresh.</p>';
    $('topPlayers').innerHTML = '<p class="empty-state">Rankings are unavailable. Please refresh.</p>';
    toast('Could not load the player database. Please try again.', true);
  } finally {
    loading = false;
    $('refreshPlayers').disabled = false;
    $('refreshPlayers').textContent = 'Refresh';
  }
}

function renderMetrics() {
  $('metricTotalPlayers').textContent = players.length.toLocaleString();
  const rated = players.filter(p => ratingOf(p) > 0);
  $('metricAverageRating').textContent = rated.length ? (rated.reduce((total, p) => total + ratingOf(p), 0) / rated.length).toFixed(1) : '—';
  $('directoryCount').textContent = players.length;
  $('rarityChart').innerHTML = rarities.map((rarity, i) => {
    const count = players.filter(p => rarityOf(p) === rarity).length;
    const percent = players.length ? count / players.length * 100 : 0;
    return `<div class="rarity-row"><span class="badge ${rarity}">${rarity}</span><div class="rarity-track" role="img" aria-label="${rarity}: ${count} players, ${percent.toFixed(1)} percent"><div class="rarity-fill" style="--rarity-color:${colors[i]};width:${percent}%"></div></div><span class="rarity-total">${count} · ${percent.toFixed(0)}%</span></div>`;
  }).join('');
  $('topPlayers').innerHTML = [...players].sort((a,b) => ratingOf(b) - ratingOf(a)).slice(0, 5).map((p, i) => `<div class="top-player"><span class="rank">0${i+1}</span><span class="player-avatar">${escapeHTML(initials(p.name))}</span><div class="player-info"><strong>${escapeHTML(p.name || 'Unnamed player')}</strong><small>${escapeHTML(p.team || 'No club')}</small></div><span class="rating">${ratingOf(p) || '—'}</span></div>`).join('') || '<p class="empty-state">No players yet. Add your first player below.</p>';
}

function renderPlayers() {
  const search = $('playerSearch').value.trim().toLowerCase();
  const filter = $('rarityFilter').value;
  const sort = $('playerSort').value;
  const filtered = players.filter(p => (!filter || rarityOf(p) === filter) && [p.name,p.team,p.nationality,p.position].some(value => String(value || '').toLowerCase().includes(search)));
  filtered.sort((a,b) => sort === 'rating' ? ratingOf(b) - ratingOf(a) : String(a[sort] || '').localeCompare(String(b[sort] || '')));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages);
  const start = (page-1)*pageSize;

  $('playerTableBody').innerHTML = filtered.slice(start, start + pageSize).map(p => `
    <tr>
      <td>
        <div>
          <span class="player-avatar">${escapeHTML(initials(p.name))}</span>
          <div><strong>${escapeHTML(p.name || 'Unnamed player')}</strong><small>${escapeHTML(p.nationality || '—')}</small></div>
        </div>
      </td>
      <td>${escapeHTML(p.team || '—')}</td>
      <td>${escapeHTML(p.position || '—')}</td>
      <td>
        <div class="inline-edit-cell">
          <span class="rating">${ratingOf(p) || '—'}</span>
          <div class="inline-arrows">
            <button type="button" class="arrow-btn" data-ovr-id="${escapeHTML(p.id)}" data-action="up">▲</button>
            <button type="button" class="arrow-btn" data-ovr-id="${escapeHTML(p.id)}" data-action="down">▼</button>
          </div>
        </div>
      </td>
      <td>
        <div class="inline-edit-cell">
          <span class="badge ${rarityOf(p)}">${rarityOf(p)}</span>
          <div class="inline-arrows">
            <button type="button" class="arrow-btn" data-rarity-id="${escapeHTML(p.id)}" data-action="up">▲</button>
            <button type="button" class="arrow-btn" data-rarity-id="${escapeHTML(p.id)}" data-action="down">▼</button>
          </div>
        </div>
      </td>
      <td>
        <button type="button" class="btn-danger" data-delete-id="${escapeHTML(p.id)}" aria-label="Delete ${escapeHTML(p.name)}">Delete</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty-state">' + (players.length ? 'No players match your search or filter.' : 'Your archive is empty. Add your first player above.') + '</td></tr>';

  $('tableSummary').textContent = `Showing ${filtered.length ? start+1 : 0}–${Math.min(start+pageSize,filtered.length)} of ${filtered.length} players`;
  $('pageIndicator').textContent = `${page} / ${pages}`;
  $('previousPage').disabled = page === 1;
  $('nextPage').disabled = page === pages;
}

// Inline Up/Down Arrow Update Handlers for OVR & Rarity
$('playerTableBody').addEventListener('click', async event => {
  const ovrBtn = event.target.closest('[data-ovr-id]');
  const rarityBtn = event.target.closest('[data-rarity-id]');
  const deleteBtn = event.target.closest('[data-delete-id]');

  if (!authorized) return;

  // Handle OVR adjustments (+1 / -1)
  if (ovrBtn) {
    const id = ovrBtn.dataset.ovrId;
    const action = ovrBtn.dataset.action;
    const player = players.find(p => p.id === id);
    if (!player) return;

    let currentRating = ratingOf(player) || 85;
    if (action === 'up') currentRating = Math.min(99, currentRating + 1);
    if (action === 'down') currentRating = Math.max(80, currentRating - 1);

    try {
      await updateDoc(doc(db, 'players', id), { rating: currentRating });
      player.rating = currentRating;
      renderMetrics();
      renderPlayers();
      toast(`Updated ${player.name}'s OVR to ${currentRating}`);
    } catch (err) {
      console.error('Error updating OVR:', err);
      toast('Failed to update rating.', true);
    }
  }

  // Handle Rarity adjustments (cycling up/down through rarities)
  if (rarityBtn) {
    const id = rarityBtn.dataset.rarityId;
    const action = rarityBtn.dataset.action;
    const player = players.find(p => p.id === id);
    if (!player) return;

    let currentIndex = rarities.indexOf(rarityOf(player));
    if (currentIndex === -1) currentIndex = 0;

    if (action === 'up') currentIndex = (currentIndex + 1) % rarities.length;
    if (action === 'down') currentIndex = (currentIndex - 1 + rarities.length) % rarities.length;

    const newRarity = rarities[currentIndex];

    try {
      await updateDoc(doc(db, 'players', id), { rarity: newRarity });
      player.rarity = newRarity;
      renderMetrics();
      renderPlayers();
      toast(`Updated ${player.name}'s rarity to ${newRarity}`);
    } catch (err) {
      console.error('Error updating rarity:', err);
      toast('Failed to update rarity.', true);
    }
  }

  // Handle Deletion
  if (deleteBtn) {
    const player = players.find(p => p.id === deleteBtn.dataset.deleteId);
    if (!player || !confirm(`Are you sure you want to delete ${player.name} from Firestore?`)) return;
    deleteBtn.disabled = true;
    try {
      await deleteDoc(doc(db, 'players', player.id));
      toast(`${player.name} has been removed.`);
      await loadAdminData();
    } catch (error) {
      console.error('Error deleting player:', error);
      toast('Failed to delete player. Please try again.', true);
    } finally {
      deleteBtn.disabled = false;
    }
  }
});

$('addPlayerForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!authorized) return;
  const newPlayer = {
    name: $('playerName').value.trim(), team: $('playerTeam').value.trim(),
    nationality: $('playerNation').value.trim(), position: $('playerPosition').value.trim(),
    rating: Number($('playerRating').value), rarity: $('playerRarity').value,
    image: $('playerImage').value.trim() || 'https://placehold.co/400x400?text=Player'
  };
  if (!newPlayer.name || !newPlayer.team || !newPlayer.nationality || !newPlayer.position || !Number.isInteger(newPlayer.rating) || newPlayer.rating < 80 || newPlayer.rating > 99) {
    toast('Please complete all required details and enter a rating from 80 to 99.', true); return;
  }
  const button = $('savePlayerButton');
  const label = button.innerHTML;
  button.disabled = true; button.textContent = 'Saving…';
  try {
    await addDoc(collection(db, 'players'), newPlayer);
    $('addPlayerForm').reset();
    toast(`${newPlayer.name} was added successfully.`);
    await loadAdminData();
  } catch (error) {
    console.error('Error adding player:', error);
    toast('Failed to save player. Please try again.', true);
  } finally { button.disabled = false; button.innerHTML = label; }
});

for (const id of ['playerSearch','rarityFilter','playerSort']) $(id).addEventListener(id === 'playerSearch' ? 'input' : 'change', () => { page = 1; renderPlayers(); });
$('globalSearch').addEventListener('input', () => { $('playerSearch').value = $('globalSearch').value; page = 1; renderPlayers(); });
$('playerSearch').addEventListener('input', () => { $('globalSearch').value = $('playerSearch').value; });
$('globalSearch').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); $('players').scrollIntoView({behavior:'smooth'}); $('playerSearch').focus({preventScroll:true}); } });
$('previousPage').addEventListener('click', () => { if (page > 1) { page--; renderPlayers(); } });
$('nextPage').addEventListener('click', () => { page++; renderPlayers(); });
$('refreshPlayers').addEventListener('click', loadAdminData);

function closeSidebar() { document.body.classList.remove('sidebar-open'); $('sidebarToggle').setAttribute('aria-expanded', 'false'); }
$('sidebarToggle').addEventListener('click', () => {
  if (window.matchMedia('(max-width:1100px)').matches) {
    const open = document.body.classList.toggle('sidebar-open');
    $('sidebarToggle').setAttribute('aria-expanded', String(open));
  } else {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    $('sidebarToggle').setAttribute('aria-expanded', String(!collapsed));
  }
});
$('sidebarBackdrop').addEventListener('click', closeSidebar);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSidebar(); });
window.matchMedia('(max-width:1100px)').addEventListener('change', closeSidebar);
document.querySelectorAll('.nav-link[href^="#"]').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
  link.classList.add('active'); closeSidebar();
}));

let storedTheme;
try { storedTheme = localStorage.getItem('football-admin-theme'); } catch { /* Storage may be disabled. */ }
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('themeToggle').setAttribute('aria-pressed', String(theme === 'dark'));
  $('themeToggle').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
}
applyTheme(storedTheme === 'dark' ? 'dark' : 'light');
$('themeToggle').addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { localStorage.setItem('football-admin-theme', theme); } catch { /* Keep theme for this session. */ }
});

const ideas = [
  {title:'Expand your icon database',desc:'Bring historical club legends into the archive to create a richer player collection.'},
  {title:'Keep your roster balanced',desc:'Review rarity distribution and add players across every tier of your collection.'},
  {title:'Give every card a face',desc:'Include a player image URL when adding new cards to make your archive more engaging.'},
  {title:'Check your standout players',desc:'Explore the highest rated players and discover which clubs lead your roster.'}
];
let ideaIndex = 0;
function renderIdea() { $('ideaTitle').textContent = ideas[ideaIndex].title; $('ideaDesc').textContent = ideas[ideaIndex].desc; }
$('previousIdea').addEventListener('click', () => { 
  ideaIndex = (ideaIndex + ideas.length - 1) % ideas.length; 
  renderIdea(); 
});
$('nextIdea').addEventListener('click', () => { ideaIndex = (ideaIndex + 1) % ideas.length; renderIdea(); });
renderIdea();