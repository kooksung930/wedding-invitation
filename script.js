const INTRO_DURATION_MS = 1900;
const GALLERY_IMAGES = [
  "gallery/web/DSCF1934.jpg",
  "gallery/web/DSCF1954.jpg",
  "gallery/web/DSCF1991.jpg",
  "gallery/web/DSCF2140.jpg",
  "gallery/web/DSCF2222.jpg",
  "gallery/web/DSCF2226.jpg",
  "gallery/web/DSCF2289.jpg",
  "gallery/web/DSCF2297.jpg",
  "gallery/web/DSCF2319.jpg",
  "gallery/web/DSCF2321.jpg",
  "gallery/web/DSCF2640.jpg",
  "gallery/web/DSCF2668.jpg",
  "gallery/web/DSCF2689.jpg",
  "gallery/web/DSCF2889.jpg",
  "gallery/web/FUJI7831.jpg",
  "gallery/web/FUJI7841.jpg",
  "gallery/web/FUJI7867.jpg",
  "gallery/web/SON01329.jpg",
  "gallery/web/SON01347.jpg",
  "gallery/web/SON01363.jpg",
  "gallery/web/SON01481.jpg",
  "gallery/web/SON01487.jpg",
  "gallery/web/SON01529.jpg",
  "gallery/web/SON01547.jpg",
  "gallery/web/SON01798.jpg",
];

const mainContent = document.getElementById("main-content");
const galleryGrid = document.getElementById("gallery-grid");
const lightbox = document.getElementById("lightbox");
const lightboxImage = lightbox?.querySelector(".lightbox__image");
const toast = document.getElementById("toast");

const showToast = (message) => {
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add("is-visible");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => {
      toast.hidden = true;
    }, 180);
  }, 1700);
};

showToast.timeoutId = 0;

const copyText = async (value) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const helper = document.createElement("textarea");
      helper.value = value;
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }

    showToast("복사되었습니다.");
  } catch (error) {
    showToast("복사에 실패했습니다.");
  }
};

const setupIntro = () => {
  const recordButton = document.querySelector(".record-launch");
  const searchParams = new URLSearchParams(window.location.search);
  const shouldSkipIntro =
    window.location.hash === "#main" || searchParams.get("skipIntro") === "1";

  if (!recordButton || !mainContent) {
    return;
  }

  if (shouldSkipIntro) {
    document.body.classList.add("intro-complete");
    return;
  }

  let isPlaying = false;

  recordButton.addEventListener("click", () => {
    if (isPlaying) {
      return;
    }

    isPlaying = true;
    document.body.classList.add("intro-playing");

    window.setTimeout(() => {
      document.body.classList.add("intro-complete");
      mainContent.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, INTRO_DURATION_MS);
  });
};

const setupCopyButtons = () => {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-copy");
      if (value) {
        copyText(value);
      }
    });
  });
};

const openLightbox = (src, alt) => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightboxImage.src = src;
  lightboxImage.alt = alt;
  lightbox.hidden = false;
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeLightbox = () => {
  if (!lightbox || !lightboxImage) {
    return;
  }

  lightbox.hidden = true;
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
  document.body.style.overflow = "";
};

const setupLightbox = () => {
  if (!lightbox) {
    return;
  }

  lightbox.addEventListener("click", (event) => {
    if (
      event.target.classList.contains("lightbox__backdrop") ||
      event.target.classList.contains("lightbox__close")
    ) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !lightbox.hidden) {
      closeLightbox();
    }
  });
};

const renderGallery = () => {
  if (!galleryGrid) {
    return;
  }

  galleryGrid.innerHTML = GALLERY_IMAGES.map(
    (src, index) => `
      <button
        class="gallery-item"
        type="button"
        data-gallery-src="${src}"
        data-gallery-alt="국성과 가영의 웨딩 사진 ${index + 1}"
      >
        <img
          src="${src}"
          alt="국성과 가영의 웨딩 사진 ${index + 1}"
          loading="${index < 6 ? "eager" : "lazy"}"
          fetchpriority="${index < 4 ? "high" : "auto"}"
          decoding="async"
        />
      </button>
    `,
  ).join("");

  galleryGrid.addEventListener("click", (event) => {
    const item = event.target.closest(".gallery-item");
    if (!item) {
      return;
    }

    openLightbox(item.dataset.gallerySrc, item.dataset.galleryAlt);
  });
};

setupIntro();
setupCopyButtons();
setupLightbox();
renderGallery();
