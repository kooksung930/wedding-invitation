const INTRO_DURATION_MS = 1900;

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

const renderGallery = async () => {
  if (!galleryGrid) {
    return;
  }

  try {
    const response = await fetch("gallery/web/manifest.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("manifest");
    }

    const images = await response.json();
    galleryGrid.innerHTML = images
      .map(
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
              loading="${index < 8 ? "eager" : "lazy"}"
              fetchpriority="${index < 4 ? "high" : "auto"}"
              decoding="async"
            />
          </button>
        `,
      )
      .join("");

    galleryGrid.addEventListener("click", (event) => {
      const item = event.target.closest(".gallery-item");
      if (!item) {
        return;
      }

      openLightbox(item.dataset.gallerySrc, item.dataset.galleryAlt);
    });
  } catch (error) {
    galleryGrid.innerHTML = '<p class="gallery-empty">사진을 불러오지 못했습니다.</p>';
  }
};

setupIntro();
setupCopyButtons();
setupLightbox();
renderGallery();
