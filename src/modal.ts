import type { OMDbDetail } from "./types.js";
import { buildDetailHTML } from "./detail.js";

// ─── Internal ─────────────────────────────────────────────

function onEscKey(e: KeyboardEvent): void {
  if (e.key === "Escape") closeModal();
}

// ─── Public API ───────────────────────────────────────────

export function openModal(movie: OMDbDetail): void {
  let overlay = document.getElementById("movie-modal-overlay") as HTMLDivElement | null;

  if (!overlay) {
    overlay           = document.createElement("div");
    overlay.id        = "movie-modal-overlay";
    overlay.className = "movie-modal-overlay";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeModal();
    });
  }

  overlay.innerHTML = buildDetailHTML(movie);
  document.getElementById("modal-close-btn")!.addEventListener("click", closeModal);

  const posterImg = document.getElementById("modal-poster-img") as HTMLImageElement | null;
  if (posterImg) {
    posterImg.addEventListener("error", () => {
      const wrapper = posterImg.parentElement;
      if (wrapper) {
        wrapper.innerHTML = `<div class="movie-modal-poster-placeholder">No poster</div>`;
      }
    }, { once: true });
  }

  requestAnimationFrame(() => overlay!.classList.add("open"));
  document.addEventListener("keydown", onEscKey);
}

export function closeModal(): void {
  const overlay = document.getElementById("movie-modal-overlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  document.removeEventListener("keydown", onEscKey);
}