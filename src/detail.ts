import type { OMDbDetail } from "./types.js";

// ─── Helper ───────────────────────────────────────────────

export function field(label: string, value: string): string {
  if (!value || value === "N/A") return "";
  return `
    <div class="detail-block">
      <span class="detail-label">${label}</span>
      <p class="detail-value">${value}</p>
    </div>
  `;
}

// ─── Build modal HTML ─────────────────────────────────────

export function buildDetailHTML(movie: OMDbDetail): string {
  const ratings = movie.Ratings?.map(r => `
    <div class="rating-chip">
      <span class="rating-source">${r.Source.replace("Internet Movie Database", "IMDb")}</span>
      <span class="rating-value">${r.Value}</span>
    </div>
  `).join("") ?? "";

  const poster = movie.Poster && movie.Poster !== "N/A"
    ? `<div class="movie-modal-poster"><img id="modal-poster-img" src="${movie.Poster}" alt="${movie.Title} poster" referrerpolicy="no-referrer" loading="lazy"></div>`
    : `<div class="movie-modal-poster"><div class="movie-modal-poster-placeholder">No poster</div></div>`;

  return `
    <div class="movie-modal">
      <div class="movie-modal-header">
        <span class="movie-modal-title">${movie.Title}</span>
        <button class="movie-modal-close" id="modal-close-btn">&#x2715;</button>
      </div>
      <div class="movie-modal-meta">
        ${movie.Year} &middot; ${movie.Runtime} &middot; ${movie.Rated} &middot; ${movie.Country}
      </div>
      <div class="movie-modal-body">
        ${poster}
        <div class="movie-modal-info">
          ${field("Plot",       movie.Plot)}
          ${field("Director",   movie.Director)}
          ${field("Cast",       movie.Actors)}
          ${field("Genre",      movie.Genre)}
          ${movie.Awards    && movie.Awards    !== "N/A" ? field("Awards",     movie.Awards)    : ""}
          ${movie.BoxOffice && movie.BoxOffice !== "N/A" ? field("Box Office", movie.BoxOffice) : ""}
          ${ratings ? `
            <div class="detail-block">
              <span class="detail-label">Ratings</span>
              <div class="movie-modal-ratings">${ratings}</div>
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}