const grid = document.querySelector("#gameGrid");
const searchInput = document.querySelector("#gameSearch");
const filterButtons = Array.from(document.querySelectorAll(".category-chip"));
const emptyState = document.querySelector("#emptyState");
const databaseDot = document.querySelector("#databaseDot");
const databaseStatus = document.querySelector("#databaseStatus");
const toast = document.querySelector("#toast");
const playerName = document.querySelector("#playerName");

let selectedGenre = "All games";
let searchText = "";
let toastTimer;
const isPagesDemo = window.location.hostname.endsWith("github.io");
const demoGames = [
  { slug: "starlight-run", title: "Starlight Run", genre: "Arcade", description: "Race through a neon galaxy.", players: "8.4k", rating: "4.9", icon: "🚀", theme: "cosmic" },
  { slug: "mossy-mystery", title: "Mossy Mystery", genre: "Adventure", description: "Explore a tiny enchanted forest.", players: "5.2k", rating: "4.8", icon: "🍄", theme: "forest" },
  { slug: "pixel-rally", title: "Pixel Rally", genre: "Racing", description: "Drift fast. Find your own line.", players: "3.7k", rating: "4.7", icon: "🏎️", theme: "sunset" },
  { slug: "brain-garden", title: "Brain Garden", genre: "Puzzle", description: "Give your brain a playful workout.", players: "2.1k", rating: "4.8", icon: "🧩", theme: "garden" },
  { slug: "cloud-keepers", title: "Cloud Keepers", genre: "Adventure", description: "Build a home above the clouds.", players: "1.8k", rating: "4.6", icon: "☁️", theme: "sky" },
  { slug: "tiny-duel", title: "Tiny Duel", genre: "Arcade", description: "A quick little challenge for two.", players: "950", rating: "4.5", icon: "⚔️", theme: "berry" }
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function makeCard(game) {
  const title = escapeHtml(game.title);
  const slug = escapeHtml(game.slug);
  const genre = escapeHtml(game.genre);
  const description = escapeHtml(game.description);
  const theme = escapeHtml(game.theme);
  const icon = escapeHtml(game.icon);
  const rating = escapeHtml(game.rating);
  const players = escapeHtml(game.players);

  return '<article class="game-card">' +
    '<div class="game-art art-' + theme + '">' +
    '<span class="game-tag">' + genre.toUpperCase() + '</span>' +
    '<button class="save-game" data-save="' + slug + '" aria-label="Save ' + title + '">♡</button>' +
    '<span class="game-symbol" aria-hidden="true">' + icon + '</span></div>' +
    '<div class="game-info"><div class="game-category">' + genre + '</div>' +
    '<div class="game-name-row"><span class="game-title">' + title + '</span><span class="game-rating">★ ' + rating + '</span></div>' +
    '<p class="game-description">' + description + '</p>' +
    '<div class="game-card-bottom"><span class="player-count">◉ ' + players + ' playing</span>' +
    '<button class="play-small" data-play="' + slug + '">PLAY ↗</button></div></div>' +
    '</article>';
}

async function loadGames() {
  grid.innerHTML = '<div class="loading-card">Finding a game for you...</div>';
  if (isPagesDemo) {
    const query = searchText.trim().toLowerCase();
    const games = demoGames.filter((game) =>
      (selectedGenre === "All games" || game.genre === selectedGenre) &&
      (!query || (game.title + " " + game.genre + " " + game.description).toLowerCase().includes(query))
    );
    grid.innerHTML = games.map(makeCard).join("");
    emptyState.hidden = games.length > 0;
    return;
  }

  const params = new URLSearchParams();
  if (selectedGenre !== "All games") params.set("genre", selectedGenre);
  if (searchText.trim()) params.set("search", searchText.trim());

  try {
    const response = await fetch("/api/games?" + params.toString());
    if (response.status === 401) {
      window.location.replace("/");
      return;
    }
    if (!response.ok) throw new Error("The game list could not be loaded.");
    const games = await response.json();
    grid.innerHTML = games.map(makeCard).join("");
    emptyState.hidden = games.length > 0;
  } catch (_error) {
    grid.innerHTML = '<div class="loading-card">The game list could not load. Refresh the page and try again.</div>';
    emptyState.hidden = true;
  }
}

async function updateDatabaseStatus() {
  if (isPagesDemo) {
    databaseDot.className = "database-dot demo";
    databaseStatus.textContent = "GitHub Pages demo · sign-in and play counts stay in this browser";
    return;
  }

  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    if (health.database === "connected") {
      databaseDot.className = "database-dot connected";
      databaseStatus.textContent = "MongoDB connected · Play counts are saved";
    } else {
      databaseDot.className = "database-dot demo";
      databaseStatus.textContent = "Demo mode · MongoDB is still starting";
    }
  } catch (_error) {
    databaseDot.className = "database-dot demo";
    databaseStatus.textContent = "Portal server unavailable";
  }
}

let searchTimer;
searchInput.addEventListener("input", () => {
  searchText = searchInput.value;
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadGames, 180);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedGenre = button.dataset.genre;
    filterButtons.forEach((item) => item.classList.toggle("selected", item === button));
    loadGames();
  });
});

document.addEventListener("click", async (event) => {
  const saveButton = event.target.closest("[data-save]");
  if (saveButton) {
    const saved = saveButton.classList.toggle("saved");
    saveButton.textContent = saved ? "♥" : "♡";
    showToast(saved ? "Saved to your play list." : "Removed from your play list.");
    return;
  }

  const playButton = event.target.closest("[data-play]");
  if (!playButton) return;
  if (isPagesDemo) {
    const playCounts = JSON.parse(localStorage.getItem("playroomPagesDemoCounts") || "{}");
    playCounts[playButton.dataset.play] = (playCounts[playButton.dataset.play] || 0) + 1;
    localStorage.setItem("playroomPagesDemoCounts", JSON.stringify(playCounts));
    const game = demoGames.find((item) => item.slug === playButton.dataset.play);
    showToast((game?.title || "Game") + " is ready. Play count saved in this browser.");
    return;
  }

  const originalText = playButton.textContent;
  playButton.disabled = true;
  playButton.textContent = "STARTING...";
  try {
    const response = await fetch("/api/games/" + encodeURIComponent(playButton.dataset.play) + "/play", { method: "POST" });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace("/");
      return;
    }
    if (!response.ok) throw new Error(result.error || "Could not start the game.");
    showToast(result.title + " is ready. Launch " + result.launches + " recorded.");
  } catch (_error) {
    showToast("Could not record this play. Please try again.");
  } finally {
    playButton.disabled = false;
    playButton.textContent = originalText;
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  if (isPagesDemo) {
    localStorage.removeItem("playroomPagesDemoUser");
    window.location.replace("./");
    return;
  }
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  window.location.replace("./");
});

if (isPagesDemo) {
  const demoUser = localStorage.getItem("playroomPagesDemoUser");
  if (!demoUser) window.location.replace("./");
  else playerName.textContent = JSON.parse(demoUser).name;
} else {
  fetch("/api/auth/me")
    .then((response) => response.json())
    .then((result) => {
      if (!result.authenticated) {
        window.location.replace("./");
        return;
      }
      playerName.textContent = result.user.name;
    })
    .catch(() => window.location.replace("./"));
}

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});

loadGames();
updateDatabaseStatus();
window.setInterval(updateDatabaseStatus, 4000);
