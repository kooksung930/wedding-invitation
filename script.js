const INTRO_DURATION_MS = 1900;
const SEOUL_TIMEZONE = "Asia/Seoul";
const WEDDING_DATE = new Date(Date.UTC(2026, 8, 19, 17, 0, 0));
const WEDDING_DAY_START = new Date(Date.UTC(2026, 8, 19, 0, 0, 0));
const WEDDING_CONFIG = window.WEDDING_CONFIG ?? {};
const KAKAO_JAVASCRIPT_KEY = String(WEDDING_CONFIG.kakaoJavascriptKey ?? "").trim();
const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const PREVIEW_IMAGE_COUNT = 9;
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
const gallerySheet = document.getElementById("gallery-sheet");
const calendarGrid = document.getElementById("calendar-grid");
const countdownDays = document.getElementById("countdown-days");
const countdownHours = document.getElementById("countdown-hours");
const countdownMinutes = document.getElementById("countdown-minutes");
const countdownSeconds = document.getElementById("countdown-seconds");
const countdownMessage = document.getElementById("countdown-message");
const galleryPreviewGrid = document.getElementById("gallery-preview-grid");
const gallerySheetGrid = document.getElementById("gallery-sheet-grid");
const galleryOpenButton = document.getElementById("gallery-open-button");
const guestbookWriteButton = document.getElementById("guestbook-write-button");
const guestbookListButton = document.getElementById("guestbook-list-button");
const copyLinkButton = document.getElementById("copy-link-button");
const kakaoShareButton = document.getElementById("kakao-share-button");

let currentGalleryIndex = 0;
let kakaoSdkPromise = null;

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

const copyText = async (value, successMessage = "복사되었습니다.") => {
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

    showToast(successMessage);
  } catch (error) {
    showToast("복사에 실패했습니다.");
  }
};

const getShareUrl = () => `${window.location.origin}${window.location.pathname}`;

const getShareImageUrl = () => new URL("resource/intro.png", window.location.href).href;

const loadKakaoSdk = () => {
  if (window.Kakao) {
    return Promise.resolve(window.Kakao);
  }

  if (kakaoSdkPromise) {
    return kakaoSdkPromise;
  }

  kakaoSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Kakao) {
        resolve(window.Kakao);
        return;
      }

      reject(new Error("Kakao SDK를 불러오지 못했습니다."));
    };
    script.onerror = () => {
      reject(new Error("Kakao SDK 로딩에 실패했습니다."));
    };
    document.head.appendChild(script);
  });

  return kakaoSdkPromise;
};

const initializeKakaoSdk = async () => {
  if (!KAKAO_JAVASCRIPT_KEY) {
    throw new Error("카카오 JavaScript Key가 비어 있습니다.");
  }

  const Kakao = await loadKakaoSdk();

  if (!Kakao.isInitialized()) {
    Kakao.init(KAKAO_JAVASCRIPT_KEY);
  }

  return Kakao;
};

const sendKakaoShare = async () => {
  const Kakao = await initializeKakaoSdk();
  const shareUrl = getShareUrl();

  Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: "국성 & 가영 Wedding Invitation",
      description: "2026년 9월 19일 토요일 오후 5시, 브라이드 밸리",
      imageUrl: getShareImageUrl(),
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    },
    buttons: [
      {
        title: "청첩장 보기",
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
    ],
  });
};

const setModalState = (element, isOpen) => {
  if (!element) {
    return;
  }

  element.hidden = !isOpen;
  element.setAttribute("aria-hidden", String(!isOpen));

  const isAnyModalOpen = [lightbox, gallerySheet].some(
    (modal) => modal && !modal.hidden,
  );

  document.body.classList.toggle("modal-open", isAnyModalOpen);
};

const openLightbox = (src, alt) => {
  if (!lightboxImage) {
    return;
  }

  lightboxImage.src = src;
  lightboxImage.alt = alt;
  setModalState(lightbox, true);
};

const closeLightbox = () => {
  if (!lightboxImage) {
    return;
  }

  lightboxImage.src = "";
  lightboxImage.alt = "";
  setModalState(lightbox, false);
};

const openGallerySheet = () => {
  setModalState(gallerySheet, true);
};

const closeGallerySheet = () => {
  setModalState(gallerySheet, false);
};

const setupModalCloseButtons = () => {
  document.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-modal-close");

      if (targetId === "lightbox") {
        closeLightbox();
      }

      if (targetId === "gallery-sheet") {
        closeGallerySheet();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeLightbox();
    closeGallerySheet();
  });
};

const setupIntro = () => {
  const recordButton = document.querySelector(".record-launch");
  const searchParams = new URLSearchParams(window.location.search);
  const shouldSkipIntro =
    window.location.hash === "#main" || searchParams.get("skipIntro") === "1";
  const shouldAutoPlayIntro = searchParams.get("playIntro") === "1";

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

  if (shouldAutoPlayIntro) {
    window.setTimeout(() => {
      recordButton.click();
    }, 140);
  }
};

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

const renderCalendar = () => {
  if (!calendarGrid) {
    return;
  }

  const weekLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const firstDay = new Date(Date.UTC(2026, 8, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(2026, 9, 0)).getUTCDate();
  const cells = [];

  weekLabels.forEach((label, index) => {
    cells.push(
      `<div class="calendar-head${index === 0 ? " is-sunday" : ""}">${label}</div>`,
    );
  });

  for (let index = 0; index < firstDay; index += 1) {
    cells.push('<div class="calendar-cell"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayOfWeek = (firstDay + day - 1) % 7;
    const classes = ["calendar-cell"];

    if (dayOfWeek === 0) {
      classes.push("is-sunday");
    }

    if (day === 19) {
      classes.push("is-wedding-day");
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

  countdownDays.textContent = pad(days);
  countdownHours.textContent = pad(hours);
  countdownMinutes.textContent = pad(minutes);
  countdownSeconds.textContent = pad(seconds);

  if (dayDiff > 0) {
    countdownMessage.textContent = `국성과 가영의 결혼식이 ${dayDiff}일 남았습니다.`;
  } else if (dayDiff === 0) {
    countdownMessage.textContent = "오늘은 바로 국성과 가영의 결혼식입니다.";
  } else {
    countdownMessage.textContent = "국성과 가영의 결혼식은 아름다운 추억으로 남아 있습니다.";
  }
};

const renderGallery = () => {
  if (!galleryPreviewGrid || !gallerySheetGrid) {
    return;
  }

  const previewImages = GALLERY_IMAGES.slice(0, PREVIEW_IMAGE_COUNT);

  galleryPreviewGrid.innerHTML = previewImages
    .map(
      (src, index) => `
        <button
          class="gallery-preview"
          type="button"
          data-gallery-preview-index="${index}"
          aria-label="사진 ${index + 1} 크게 보기"
        >
          <img
            src="${src}"
            alt="국성과 가영의 웨딩 사진 ${index + 1}"
            loading="lazy"
            decoding="async"
          />
        </button>
      `,
    )
    .join("");

  gallerySheetGrid.innerHTML = GALLERY_IMAGES.map(
    (src, index) => `
      <button
        class="gallery-sheet__item"
        type="button"
        data-gallery-sheet-index="${index}"
        aria-label="사진 ${index + 1} 선택"
      >
        <img
          src="${src}"
          alt="국성과 가영의 웨딩 사진 ${index + 1}"
          loading="lazy"
          decoding="async"
        />
      </button>
    `,
  ).join("");
};

const setupGallery = () => {
  if (!galleryPreviewGrid || !gallerySheetGrid || !galleryOpenButton) {
    return;
  }

  renderGallery();

  galleryPreviewGrid.addEventListener("click", (event) => {
    const item = event.target.closest("[data-gallery-preview-index]");

    if (!item) {
      return;
    }

    const index = Number(item.getAttribute("data-gallery-preview-index"));
    currentGalleryIndex = index;
    openLightbox(GALLERY_IMAGES[index], `국성과 가영의 웨딩 사진 ${index + 1}`);
  });

  galleryOpenButton.addEventListener("click", () => {
    openGallerySheet();
  });

  gallerySheetGrid.addEventListener("click", (event) => {
    const item = event.target.closest("[data-gallery-sheet-index]");

    if (!item) {
      return;
    }

    const index = Number(item.getAttribute("data-gallery-sheet-index"));
    currentGalleryIndex = index;
    closeGallerySheet();
    openLightbox(GALLERY_IMAGES[index], `국성과 가영의 웨딩 사진 ${index + 1}`);
  });
};

const setupCopyButtons = () => {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-copy");

      if (value) {
        copyText(value, "주소가 복사되었습니다.");
      }
    });
  });

  copyLinkButton?.addEventListener("click", () => {
    copyText(getShareUrl(), "링크가 복사되었습니다.");
  });
};

const setupHeartToggles = () => {
  document.querySelectorAll("[data-heart-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-heart-target");
      const target = targetId ? document.getElementById(targetId) : null;

      if (!target) {
        return;
      }

      const willOpen = target.hidden;

      document.querySelectorAll(".reveal-panel").forEach((panel) => {
        panel.hidden = true;
      });

      target.hidden = !willOpen;
    });
  });
};

const setupGuestbookPlaceholders = () => {
  const message = "방명록은 서버 연결 후 활성화됩니다.";

  guestbookWriteButton?.addEventListener("click", () => {
    showToast(message);
  });

  guestbookListButton?.addEventListener("click", () => {
    showToast(message);
  });
};

const setupKakaoShare = () => {
  if (!kakaoShareButton) {
    return;
  }

  if (KAKAO_JAVASCRIPT_KEY) {
    initializeKakaoSdk().catch(() => {
      // The click handler shows the user-facing message if initialization still fails.
    });
  }

  kakaoShareButton.addEventListener("click", async () => {
    if (!KAKAO_JAVASCRIPT_KEY) {
      showToast("카카오 JavaScript Key를 연결하면 공유 버튼이 활성화됩니다.");
      return;
    }

    try {
      await sendKakaoShare();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "카카오 공유를 실행하지 못했습니다.";
      showToast(message);
    }
  });
};

setupIntro();
setupModalCloseButtons();
setupCopyButtons();
setupHeartToggles();
setupGuestbookPlaceholders();
setupKakaoShare();
renderCalendar();
renderCountdown();
setupGallery();
window.setInterval(renderCountdown, 1000);
