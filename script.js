const INTRO_DURATION_MS = 1900;
const GALLERY_VISIBLE_COUNT = 6;
const SEOUL_TIMEZONE = "Asia/Seoul";
const WEDDING_DATE = new Date(Date.UTC(2026, 8, 19, 17, 0, 0));
const WEDDING_DAY_START = new Date(Date.UTC(2026, 8, 19, 0, 0, 0));
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
const toast = document.getElementById("toast");
const lightbox = document.getElementById("lightbox");
const lightboxImage = lightbox?.querySelector(".lightbox__image");
const calendarGrid = document.getElementById("calendar-grid");
const countdownDays = document.getElementById("countdown-days");
const countdownHours = document.getElementById("countdown-hours");
const countdownMinutes = document.getElementById("countdown-minutes");
const countdownSeconds = document.getElementById("countdown-seconds");
const countdownMessage = document.getElementById("countdown-message");
const dDayBadge = document.getElementById("d-day-badge");
const galleryFeature = document.getElementById("gallery-feature");
const galleryFeatureImage = document.getElementById("gallery-feature-image");
const galleryIndicators = document.getElementById("gallery-indicators");
const galleryGrid = document.getElementById("gallery-grid");
const galleryToggleButton = document.getElementById("gallery-toggle");

let currentGalleryIndex = 0;
let galleryExpanded = false;

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

const pad = (value) => String(value).padStart(2, "0");

const getSeoulParts = (date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return formatter.formatToParts(date).reduce((parts, part) => {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }

    return parts;
  }, {});
};

const getSeoulDate = (date) => {
  const parts = getSeoulParts(date);
  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );
};

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

    showToast("주소가 복사되었습니다.");
  } catch (error) {
    showToast("복사에 실패했습니다.");
  }
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
  lightboxImage.alt = "";
  document.body.style.overflow = "";
};

const setupLightbox = () => {
  if (!lightbox) {
    return;
  }

  lightbox.addEventListener("click", (event) => {
    const target = event.target;
    if (
      target.classList.contains("lightbox__backdrop") ||
      target.classList.contains("lightbox__close")
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
      document.body.classList.remove("intro-playing");
      document.body.classList.add("intro-complete");
      mainContent.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, INTRO_DURATION_MS);
  });
};

const renderCalendar = () => {
  if (!calendarGrid) {
    return;
  }

  const labels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const firstDay = new Date(Date.UTC(2026, 8, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(2026, 9, 0)).getUTCDate();
  const cells = [];

  labels.forEach((label) => {
    cells.push(`<div class="calendar-cell calendar-cell--label">${label}</div>`);
  });

  for (let index = 0; index < firstDay; index += 1) {
    cells.push('<div class="calendar-cell calendar-cell--blank"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayOfWeek = (firstDay + day - 1) % 7;
    const classes = ["calendar-cell"];

    if (dayOfWeek === 0) {
      classes.push("calendar-cell--sunday");
    }

    if (day === 19) {
      classes.push("calendar-cell--wedding");
    }

    cells.push(`<div class="${classes.join(" ")}">${day}</div>`);
  }

  calendarGrid.innerHTML = cells.join("");
};

const renderCountdown = () => {
  const nowSeoul = getSeoulDate(new Date());
  const diff = WEDDING_DATE.getTime() - nowSeoul.getTime();
  const absDiff = Math.abs(diff);
  const days = Math.floor(absDiff / 86400000);
  const hours = Math.floor((absDiff % 86400000) / 3600000);
  const minutes = Math.floor((absDiff % 3600000) / 60000);
  const seconds = Math.floor((absDiff % 60000) / 1000);
  const todaySeoul = new Date(
    Date.UTC(
      nowSeoul.getUTCFullYear(),
      nowSeoul.getUTCMonth(),
      nowSeoul.getUTCDate(),
      0,
      0,
      0,
    ),
  );
  const dayDiff = Math.ceil(
    (WEDDING_DAY_START.getTime() - todaySeoul.getTime()) / 86400000,
  );

  if (countdownDays) {
    countdownDays.textContent = pad(days);
  }

  if (countdownHours) {
    countdownHours.textContent = pad(hours);
  }

  if (countdownMinutes) {
    countdownMinutes.textContent = pad(minutes);
  }

  if (countdownSeconds) {
    countdownSeconds.textContent = pad(seconds);
  }

  if (countdownMessage) {
    if (dayDiff > 0) {
      countdownMessage.textContent = `국성과 가영의 웨딩 플레이까지 ${dayDiff}일 남았습니다.`;
    } else if (dayDiff === 0) {
      countdownMessage.textContent = "오늘이 바로 저희의 첫 재생일입니다.";
    } else {
      countdownMessage.textContent = "저희의 첫 재생은 이제 아름다운 추억이 되었습니다.";
    }
  }

  if (dDayBadge) {
    if (dayDiff > 0) {
      dDayBadge.textContent = `D-${dayDiff}`;
    } else if (dayDiff === 0) {
      dDayBadge.textContent = "D-DAY";
    } else {
      dDayBadge.textContent = `D+${Math.abs(dayDiff)}`;
    }
  }
};

const renderGalleryFeature = () => {
  if (!galleryFeatureImage || !galleryIndicators) {
    return;
  }

  const currentSrc = GALLERY_IMAGES[currentGalleryIndex];
  const currentAlt = `전국성과 최가영의 웨딩 사진 ${currentGalleryIndex + 1}`;
  const maxVisibleIndicators = 5;
  const startIndex = Math.max(
    0,
    Math.min(
      currentGalleryIndex - Math.floor(maxVisibleIndicators / 2),
      GALLERY_IMAGES.length - maxVisibleIndicators,
    ),
  );
  const endIndex = Math.min(
    GALLERY_IMAGES.length,
    startIndex + maxVisibleIndicators,
  );

  galleryFeatureImage.src = currentSrc;
  galleryFeatureImage.alt = currentAlt;

  galleryIndicators.innerHTML = `
    <span class="gallery-page-label">${pad(currentGalleryIndex + 1)} / ${pad(
      GALLERY_IMAGES.length,
    )}</span>
    ${GALLERY_IMAGES.slice(startIndex, endIndex)
      .map(
        (_, offset) => `
      <button
        class="gallery-indicator ${
          startIndex + offset === currentGalleryIndex ? "is-active" : ""
        }"
        type="button"
        data-gallery-index="${startIndex + offset}"
        aria-label="사진 ${startIndex + offset + 1} 보기"
      ></button>
    `,
      )
      .join("")}
  `;
};

const renderGalleryGrid = () => {
  if (!galleryGrid || !galleryToggleButton) {
    return;
  }

  const visibleImages = galleryExpanded
    ? GALLERY_IMAGES
    : GALLERY_IMAGES.slice(0, GALLERY_VISIBLE_COUNT);

  galleryGrid.innerHTML = visibleImages
    .map(
      (src, index) => `
        <button
          class="gallery-thumb"
          type="button"
          data-gallery-src="${src}"
          data-gallery-index="${index}"
          aria-label="사진 ${index + 1} 크게 보기"
        >
          <img
            src="${src}"
            alt="전국성과 최가영의 웨딩 사진 ${index + 1}"
            loading="${index < 4 ? "eager" : "lazy"}"
            fetchpriority="${index < 2 ? "high" : "auto"}"
            decoding="async"
          />
        </button>
      `,
    )
    .join("");

  if (GALLERY_IMAGES.length <= GALLERY_VISIBLE_COUNT) {
    galleryToggleButton.hidden = true;
  } else {
    galleryToggleButton.hidden = false;
    galleryToggleButton.textContent = galleryExpanded ? "사진 접기" : "모든 사진 보기";
  }
};

const updateGalleryIndex = (nextIndex) => {
  const total = GALLERY_IMAGES.length;
  currentGalleryIndex = (nextIndex + total) % total;
  renderGalleryFeature();
};

const setupGallery = () => {
  const prevButton = document.querySelector('[data-gallery-direction="prev"]');
  const nextButton = document.querySelector('[data-gallery-direction="next"]');

  if (!galleryFeature || !galleryIndicators || !galleryGrid || !galleryToggleButton) {
    return;
  }

  renderGalleryFeature();
  renderGalleryGrid();

  prevButton?.addEventListener("click", () => {
    updateGalleryIndex(currentGalleryIndex - 1);
  });

  nextButton?.addEventListener("click", () => {
    updateGalleryIndex(currentGalleryIndex + 1);
  });

  galleryFeature.addEventListener("click", () => {
    openLightbox(
      GALLERY_IMAGES[currentGalleryIndex],
      `전국성과 최가영의 웨딩 사진 ${currentGalleryIndex + 1}`,
    );
  });

  galleryIndicators.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gallery-index]");
    if (!button) {
      return;
    }

    updateGalleryIndex(Number(button.getAttribute("data-gallery-index")));
  });

  galleryGrid.addEventListener("click", (event) => {
    const item = event.target.closest("[data-gallery-src]");
    if (!item) {
      return;
    }

    const index = Number(item.getAttribute("data-gallery-index"));
    currentGalleryIndex = index;
    renderGalleryFeature();
    openLightbox(
      item.getAttribute("data-gallery-src"),
      `전국성과 최가영의 웨딩 사진 ${index + 1}`,
    );
  });

  galleryToggleButton.addEventListener("click", () => {
    galleryExpanded = !galleryExpanded;
    renderGalleryGrid();
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

const setupHeartToggles = () => {
  document.querySelectorAll("[data-heart-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-heart-target");
      const closedLabel = button.getAttribute("data-closed-label") || "안내 보기";
      const openLabel = button.getAttribute("data-open-label") || "안내 닫기";
      const target = targetId ? document.getElementById(targetId) : null;

      if (!target) {
        return;
      }

      const willOpen = target.hidden;

      document.querySelectorAll(".heart-reveal").forEach((panel) => {
        panel.hidden = true;
      });

      document.querySelectorAll("[data-heart-target]").forEach((trigger) => {
        trigger.textContent =
          trigger.getAttribute("data-closed-label") || "안내 보기";
        trigger.setAttribute("aria-expanded", "false");
      });

      target.hidden = !willOpen;
      button.textContent = willOpen ? openLabel : closedLabel;
      button.setAttribute("aria-expanded", String(willOpen));
    });
  });
};

setupIntro();
setupLightbox();
setupCopyButtons();
setupHeartToggles();
renderCalendar();
renderCountdown();
setupGallery();
window.setInterval(renderCountdown, 1000);
