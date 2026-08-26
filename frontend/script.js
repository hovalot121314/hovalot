const IS_LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_URL = window.API_URL || (IS_LOCAL
  ? "http://localhost:5001/api"
  : "https://hovalot-production-2bdd.up.railway.app/api");
const $ = (q) => document.querySelector(q);
let galleryPhotos = [];
let activePhotoIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  loadGallery();
  $("#galleryPrev").addEventListener("click", () => scrollGallery(-1));
  $("#galleryNext").addEventListener("click", () => scrollGallery(1));
  $(".lightbox-close").addEventListener("click", closeLightbox);
  $(".lightbox-prev").addEventListener("click", () => moveLightbox(-1));
  $(".lightbox-next").addEventListener("click", () => moveLightbox(1));
  $("#galleryLightbox").addEventListener("click", (event) => {
    if (event.target.id === "galleryLightbox") closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") moveLightbox(1);
    if (event.key === "ArrowRight") moveLightbox(-1);
  });
});
async function loadGallery() {
  const line = $("#photoLine");
  try {
    const response = await fetch(`${API_URL}/gallery`);
    const photos = await response.json();
    if (!photos.length) throw new Error();
    galleryPhotos = photos;
    line.innerHTML = photos.map((photo, index) => `<button class="photo-card" type="button" data-index="${index}" aria-label="פתיחת תמונה ${index + 1}"><img src="${photo.image}" alt="הובלה שביצענו" loading="lazy"><span class="photo-number">${String(index + 1).padStart(2, "0")}</span><span class="photo-caption">הובלות חיפה והקריות</span></button>`).join("");
    line.querySelectorAll(".photo-card").forEach((card) => card.addEventListener("click", () => openLightbox(Number(card.dataset.index))));
  } catch {
    line.innerHTML = '<div class="photo-card fallback"></div><div class="photo-card fallback"></div><div class="photo-card fallback"></div>';
  }
}

function scrollGallery(direction) {
  const line = $("#photoLine");
  const card = line.querySelector(".photo-card");
  const gap = Number.parseFloat(getComputedStyle(line).columnGap) || 0;
  line.scrollBy({ left: direction * -(card ? card.getBoundingClientRect().width + gap : line.clientWidth), behavior: "smooth" });
}

function openLightbox(index) {
  activePhotoIndex = index;
  updateLightbox();
  $("#galleryLightbox").classList.add("open");
  $("#galleryLightbox").setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  $("#galleryLightbox").classList.remove("open");
  $("#galleryLightbox").setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function moveLightbox(direction) {
  if (!galleryPhotos.length || !$("#galleryLightbox").classList.contains("open")) return;
  activePhotoIndex = (activePhotoIndex + direction + galleryPhotos.length) % galleryPhotos.length;
  updateLightbox();
}

function updateLightbox() {
  $("#lightboxImage").src = galleryPhotos[activePhotoIndex].image;
  $("#lightboxCounter").textContent = `${String(activePhotoIndex + 1).padStart(2, "0")} / ${String(galleryPhotos.length).padStart(2, "0")}`;
}
