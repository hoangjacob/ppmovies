const API_KEY       = "853c77bd76b2772ab88ab049ad08d610";
const IMG_BASE       = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE  = "https://image.tmdb.org/t/p/w1280";

let mode = "movie";        // "movie" | "tv"
let currentShow = null;    // { id, seasons } while show overlay is open

// ── Bootstrap ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupSearch();
  setupOverlay();
  setupShowOverlay();
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

    const open = () => openDetails(item.id, title, item.backdrop_path);
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
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (overlay.classList.contains("active")) closePlayer();
    else if (document.getElementById("show-overlay").classList.contains("active")) closeShowOverlay();
  });
}

function openPlayer(id, season, episode) {
  let src;
  if (mode === "tv" && season != null && episode != null) {
    src = `https://vidsrcme.ru/embed/tv/${id}/${season}/${episode}`;
  } else if (mode === "tv") {
    src = `https://vidsrcme.ru/embed/tv/${id}`;
  } else {
    src = `https://vidsrcme.ru/embed/movie/${id}`;
  }
  document.getElementById("player").src = src;
  document.getElementById("player-overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePlayer() {
  document.getElementById("player-overlay").classList.remove("active");
  document.getElementById("player").src = "";
  document.body.style.overflow = "";
}

// ── Show details overlay (seasons + episodes) ───────────────────────
function setupShowOverlay() {
  const overlay = document.getElementById("show-overlay");
  document.getElementById("show-close-btn").addEventListener("click", closeShowOverlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeShowOverlay(); });
}

async function openDetails(id, fallbackTitle, fallbackBackdrop) {
  const overlay = document.getElementById("show-overlay");
  overlay.classList.add("active");
  overlay.scrollTop = 0;
  document.body.style.overflow = "hidden";

  document.getElementById("show-title").textContent = fallbackTitle;
  document.getElementById("show-overview").textContent = "";
  setShowBackdrop(fallbackBackdrop);

  if (mode === "movie") {
    document.getElementById("movie-actions").classList.remove("hidden");
    document.getElementById("season-tabs").classList.add("hidden");
    document.getElementById("episode-list").classList.add("hidden");
    document.getElementById("movie-meta").innerHTML = "";

    const data = await tmdb(`movie/${id}`);
    if (!data) return;

    document.getElementById("show-title").textContent = data.title || fallbackTitle;
    document.getElementById("show-overview").textContent = data.overview || "";
    setShowBackdrop(data.backdrop_path || fallbackBackdrop);
    renderMovieMeta(data);

    document.getElementById("movie-play-btn").onclick = () => {
      closeShowOverlay();
      openPlayer(id);
    };
    return;
  }

  // TV branch
  document.getElementById("movie-actions").classList.add("hidden");
  document.getElementById("season-tabs").classList.remove("hidden");
  document.getElementById("episode-list").classList.remove("hidden");
  document.getElementById("season-tabs").innerHTML = "";
  showEpisodeSkeletons();

  const data = await tmdb(`tv/${id}`);
  if (!data || !data.seasons) return;

  currentShow = {
    id,
    seasons: data.seasons.filter(s => s.season_number !== 0)
  };

  document.getElementById("show-title").textContent = data.name || fallbackTitle;
  document.getElementById("show-overview").textContent = data.overview || "";
  setShowBackdrop(data.backdrop_path || fallbackBackdrop);

  renderSeasonTabs(currentShow.seasons);
  if (currentShow.seasons.length) {
    loadSeason(currentShow.seasons[0].season_number);
  } else {
    document.getElementById("episode-list").innerHTML =
      `<p class="episode-empty">No season info available for this show.</p>`;
  }
}

function renderMovieMeta(data) {
  const year    = (data.release_date || "").slice(0, 4);
  const hrs     = data.runtime ? Math.floor(data.runtime / 60) : null;
  const mins    = data.runtime ? data.runtime % 60 : null;
  const runtime = data.runtime ? `${hrs}h ${mins}m` : null;
  const score   = data.vote_average ? data.vote_average.toFixed(1) : null;
  const genres  = (data.genres || []).map(g => g.name);

  document.getElementById("movie-meta").innerHTML = `
    <div class="meta-line">
      ${year ? `<span>${year}</span>` : ""}
      ${runtime ? `<span>${runtime}</span>` : ""}
      ${score ? `<span class="meta-score"><i class="fa-solid fa-star"></i>${score}</span>` : ""}
    </div>
    ${genres.length ? `<div class="genre-row">${genres.map(g => `<span class="genre-chip">${g}</span>`).join("")}</div>` : ""}
  `;
}

function setShowBackdrop(path) {
  const el = document.getElementById("show-backdrop");
  el.style.backgroundImage = path ? `url(${BACKDROP_BASE}${path})` : "none";
}

function renderSeasonTabs(seasons) {
  const wrap = document.getElementById("season-tabs");
  wrap.innerHTML = seasons.map((s, i) => `
    <button class="season-tab${i === 0 ? " active" : ""}" data-season="${s.season_number}">
      Season ${s.season_number}
    </button>
  `).join("");

  wrap.querySelectorAll(".season-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".season-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadSeason(Number(btn.dataset.season));
    });
  });
}

async function loadSeason(seasonNumber) {
  showEpisodeSkeletons();
  const data = await tmdb(`tv/${currentShow.id}/season/${seasonNumber}`);
  renderEpisodes(data.episodes || [], seasonNumber);
}

function renderEpisodes(episodes, seasonNumber) {
  const list = document.getElementById("episode-list");

  if (!episodes.length) {
    list.innerHTML = `<p class="episode-empty">No episodes listed for this season yet.</p>`;
    return;
  }

  list.innerHTML = episodes.map(ep => {
    const still   = ep.still_path ? `${IMG_BASE}${ep.still_path}` : null;
    const runtime = ep.runtime ? `${ep.runtime} min` : "";
    const overview = ep.overview || "No description available.";

    return `
      <div class="episode-row" data-ep="${ep.episode_number}" tabindex="0" role="button"
           aria-label="Play Season ${seasonNumber}, Episode ${ep.episode_number}: ${ep.name || ""}">
        <div class="episode-thumb">
          ${still
            ? `<img src="${still}" alt="" loading="lazy">`
            : `<div class="poster-fallback"><i class="fa-solid fa-clapperboard"></i></div>`
          }
          <div class="episode-play" aria-hidden="true"><i class="fa-solid fa-play"></i></div>
        </div>
        <div class="episode-info">
          <p class="episode-heading"><span class="episode-num">${ep.episode_number}.</span> ${ep.name || "Untitled"}</p>
          <p class="episode-overview">${overview}</p>
        </div>
        ${runtime ? `<span class="episode-runtime">${runtime}</span>` : ""}
      </div>
    `;
  }).join("");

  list.querySelectorAll(".episode-row").forEach(row => {
    const playEpisode = () => {
      const epNum = Number(row.dataset.ep);
      closeShowOverlay();
      openPlayer(currentShow.id, seasonNumber, epNum);
    };
    row.addEventListener("click", playEpisode);
    row.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playEpisode(); }
    });
  });
}

function showEpisodeSkeletons(count = 6) {
  document.getElementById("episode-list").innerHTML = Array(count).fill(0).map(() => `
    <div class="episode-row skeleton" aria-hidden="true">
      <div class="episode-thumb"></div>
      <div class="episode-info">
        <div class="skel-line"></div>
        <div class="skel-line short"></div>
      </div>
    </div>
  `).join("");
}

function closeShowOverlay() {
  document.getElementById("show-overlay").classList.remove("active");
  document.body.style.overflow = "";
  currentShow = null;
}
