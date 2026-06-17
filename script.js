const API_KEY  = "853c77bd76b2772ab88ab049ad08d610";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

let mode = "movie"; // "movie" | "tv"

// ── Bootstrap ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupSearch();
  setupOverlay();
  fetchPopular();
});

// ── Tabs ──────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.mode === mode) return;
      document.querySelectorAll(".tab").forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      mode = btn.dataset.mode;
      clearSearch();
      updatePlaceholder();
      fetchPopular();
    });
  });
}

function updatePlaceholder() {
  document.getElementById("search-input").placeholder =
    mode === "movie" ? "Search movies…" : "Search TV shows…";
}

// ── Search ────────────────────────────────────────────────────────
function setupSearch() {
  document.getElementById("search-btn")
    .addEventListener("click", runSearch);
  document.getElementById("search-input")
    .addEventListener("keydown", e => { if (e.key === "Enter") runSearch(); });
  document.getElementById("back-btn")
    .addEventListener("click", clearSearch);
}

async function runSearch() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return;

  const endpoint = mode === "movie"
    ? `search/movie?query=${encodeURIComponent(q)}`
    : `search/tv?query=${encodeURIComponent(q)}`;

  showSkeletons();
  setTitle(`Results for "${q}"`);
  document.getElementById("back-btn").classList.remove("hidden");

  const data = await tmdb(endpoint);
  renderGrid(data.results);
}

function clearSearch() {
  document.getElementById("search-input").value = "";
  document.getElementById("back-btn").classList.add("hidden");
  fetchPopular();
}

// ── Data ──────────────────────────────────────────────────────────
async function fetchPopular() {
  const endpoint = mode === "movie" ? "movie/popular" : "tv/popular";
  setTitle(mode === "movie" ? "Popular Movies" : "Popular TV Shows");
  showSkeletons();
  const data = await tmdb(endpoint);
  renderGrid(data.results);
}

async function tmdb(endpoint) {
  const sep = endpoint.includes("?") ? "&" : "?";
  const url = `https://api.themoviedb.org/3/${endpoint}${sep}api_key=${API_KEY}&language=en-US`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    console.error("TMDB fetch failed:", err);
    showEmpty("Couldn't load content — check your connection and try again.");
    return { results: [] };
  }
}

// ── Render ────────────────────────────────────────────────────────
function renderGrid(items) {
  const grid  = document.getElementById("grid");
  grid.innerHTML = "";
  document.getElementById("empty-state").classList.add("hidden");

  if (!items || items.length === 0) {
    showEmpty("No results — try a different search.");
    return;
  }

  items.forEach(item => {
    const title  = item.title || item.name || "Untitled";
    const rawDate = item.release_date || item.first_air_date || "";
    const year   = rawDate.slice(0, 4);
    const score  = item.vote_average ? item.vote_average.toFixed(1) : null;
    const poster = item.poster_path ? `${IMG_BASE}${item.poster_path}` : null;

    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", title + (year ? `, ${year}` : ""));

    card.innerHTML = `
      <div class="card-poster">
        ${poster
          ? `<img src="${poster}" alt="" loading="lazy"
               onerror="this.closest('.card-poster').classList.add('no-poster'); this.remove();">`
          : `<div class="poster-fallback"><i class="fa-solid fa-clapperboard"></i></div>`
        }
        ${score ? `<span class="score"><i class="fa-solid fa-star"></i>${score}</span>` : ""}
        <div class="play-hint" aria-hidden="true"><i class="fa-solid fa-play"></i></div>
      </div>
      <div class="card-meta">
        <p class="card-title">${title}</p>
        ${year ? `<p class="card-year">${year}</p>` : ""}
      </div>
    `;

    const open = () => openPlayer(item.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });

    grid.appendChild(card);
  });
}

function showSkeletons(count = 14) {
  document.getElementById("empty-state").classList.add("hidden");
  document.getElementById("grid").innerHTML = Array(count).fill(0).map(() => `
    <div class="card skeleton" aria-hidden="true">
      <div class="card-poster"></div>
      <div class="card-meta">
        <div class="skel-line"></div>
        <div class="skel-line short"></div>
      </div>
    </div>
  `).join("");
}

function showEmpty(msg) {
  document.getElementById("grid").innerHTML = "";
  document.getElementById("empty-msg").textContent = msg;
  document.getElementById("empty-state").classList.remove("hidden");
}

function setTitle(text) {
  document.getElementById("section-title").textContent = text;
}

// ── Player overlay ────────────────────────────────────────────────
function setupOverlay() {
  const overlay = document.getElementById("player-overlay");
  document.getElementById("close-btn").addEventListener("click", closePlayer);
  overlay.addEventListener("click", e => { if (e.target === overlay) closePlayer(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closePlayer(); });
}

function openPlayer(id) {
  const src = mode === "movie"
    ? `https://vidsrc.xyz/embed/movie/${id}`
    : `https://vidsrc.pro/embed/tv/${id}`;
  document.getElementById("player").src = src;
  document.getElementById("player-overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePlayer() {
  document.getElementById("player-overlay").classList.remove("active");
  document.getElementById("player").src = "";
  document.body.style.overflow = "";
}
