const INTRO_ENTRY_DURATION_MS = 1520;
const INTRO_DURATION_MS = 1900;
const INTRO_FADE_DURATION_MS = 800;
const SEOUL_TIMEZONE = "Asia/Seoul";
const WEDDING_DATE = new Date(Date.UTC(2026, 8, 19, 17, 0, 0));
const WEDDING_DAY_START = new Date(Date.UTC(2026, 8, 19, 0, 0, 0));
const WEDDING_CONFIG = window.WEDDING_CONFIG ?? {};
const FIREBASE_CONFIG = WEDDING_CONFIG.firebaseConfig ?? null;
const KAKAO_JAVASCRIPT_KEY = String(WEDDING_CONFIG.kakaoJavascriptKey ?? "").trim();
const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const FIREBASE_SDK_URLS = [
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore-compat.js",
];
const SHARE_TITLE = "국성 & 가영 Wedding Invitation";
const SHARE_DESCRIPTION = "두 사람의 첫 번째 레코드 재생하기";
const SHARE_IMAGE_PATH = "resource/thumbnail.png?v=20260622";
const GUESTBOOK_COLLECTION = "guestbook";
const GUESTBOOK_PREVIEW_LIMIT = 5;
const GUESTBOOK_MODAL_LIMIT = 40;
const GUESTBOOK_NAME_MAX = 20;
const GUESTBOOK_MESSAGE_MAX = 160;
const GUESTBOOK_NOTICE_DEFAULT = "남겨주신 축하의 마음은 소중히 간직하겠습니다.";
const GUESTBOOK_ERROR_MESSAGE = "방명록을 잠시 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
const INTRO_PULSE_MS = 1000;
const INTRO_NOTE_SYMBOLS = ["♩", "♪", "♫", "♬"];
const PAGE_NOTE_COUNT = 36;
const MAX_ACTIVE_TAP_NOTES = 42;
const SCROLL_IDLE_MS = 160;
const INTRO_NOTE_QUADRANTS = [
  { minDeg: -110, maxDeg: -25 },
  { minDeg: -10, maxDeg: 75 },
  { minDeg: 100, maxDeg: 170 },
  { minDeg: -175, maxDeg: -105 },
];
const PREVIEW_IMAGE_COUNT = 9;
const GALLERY_IMAGES = [
  "gallery/web/KakaoTalk_20260714_225120649.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_01.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_02.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_03.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_04.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_05.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_06.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_07.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_08.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_09.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_10.jpg",
  "gallery/web/KakaoTalk_20260714_225120649_11.jpg",
];

const mainContent = document.getElementById("main-content");
const tapNoteBursts = document.getElementById("tap-note-bursts");
const toast = document.getElementById("toast");
const lightbox = document.getElementById("lightbox");
const lightboxImage = lightbox?.querySelector(".lightbox__image");
const gallerySheet = document.getElementById("gallery-sheet");
const guestbookSheet = document.getElementById("guestbook-sheet");
const calendarGrid = document.getElementById("calendar-grid");
const countdownDays = document.getElementById("countdown-days");
const countdownHours = document.getElementById("countdown-hours");
const countdownMinutes = document.getElementById("countdown-minutes");
const countdownSeconds = document.getElementById("countdown-seconds");
const countdownMessage = document.getElementById("countdown-message");
const galleryPreviewGrid = document.getElementById("gallery-preview-grid");
const gallerySheetGrid = document.getElementById("gallery-sheet-grid");
const galleryOpenButton = document.getElementById("gallery-open-button");
const guestbookForm = document.getElementById("guestbook-form");
const guestbookNameInput = document.getElementById("guestbook-name");
const guestbookMessageInput = document.getElementById("guestbook-message");
const guestbookCount = document.getElementById("guestbook-count");
const guestbookNotice = document.getElementById("guestbook-notice");
const guestbookPosts = document.getElementById("guestbook-posts");
const guestbookSheetPosts = document.getElementById("guestbook-sheet-posts");
const guestbookWriteButton = document.getElementById("guestbook-write-button");
const guestbookListButton = document.getElementById("guestbook-list-button");
const copyLinkButton = document.getElementById("copy-link-button");
const kakaoShareButton = document.getElementById("kakao-share-button");

let currentGalleryIndex = 0;
let kakaoSdkPromise = null;
let firebaseSdkPromise = null;
let guestbookServicePromise = null;
let guestbookPreviewUnsubscribe = null;
let guestbookSheetUnsubscribe = null;
let gallerySheetRendered = false;

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
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const lerp = (start, end, progress) => start + (end - start) * progress;
const pseudoRandom = (seed) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};
const randomBetween = (min, max) => min + Math.random() * (max - min);
const easeOutCubic = (value) => 1 - (1 - value) ** 3;
const easeInOutSine = (value) => -(Math.cos(Math.PI * value) - 1) / 2;
const runWhenIdle = (callback, timeout = 1200) => {
  if (window.requestIdleCallback) {
    return window.requestIdleCallback(() => {
      callback();
    }, { timeout });
  }

  return window.setTimeout(callback, timeout);
};

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

const getShareImageUrl = () => new URL(SHARE_IMAGE_PATH, window.location.href).href;

const isFirebaseGuestbookConfigured = () =>
  Boolean(
    FIREBASE_CONFIG &&
      FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.appId,
  );

const getGuestbookErrorMessage = (error) => {
  void error;
  return GUESTBOOK_ERROR_MESSAGE;
};

const setGuestbookNotice = (message, tone = "normal") => {
  if (!guestbookNotice) {
    return;
  }

  guestbookNotice.textContent = message;
  guestbookNotice.classList.toggle("is-error", tone === "error");
  guestbookNotice.classList.toggle("is-success", tone === "success");
};

const setGuestbookInteractivity = (isEnabled) => {
  [guestbookNameInput, guestbookMessageInput, guestbookWriteButton, guestbookListButton].forEach(
    (element) => {
      if (!element) {
        return;
      }

      element.disabled = !isEnabled;
    },
  );
};

const setGuestbookSubmitting = (isSubmitting) => {
  if (!guestbookWriteButton) {
    return;
  }

  guestbookWriteButton.disabled = isSubmitting;
  guestbookWriteButton.textContent = isSubmitting ? "남기는 중..." : "방명록 남기기";
};

const updateGuestbookCount = () => {
  if (!guestbookMessageInput || !guestbookCount) {
    return;
  }

  guestbookCount.textContent = `${guestbookMessageInput.value.trim().length} / ${GUESTBOOK_MESSAGE_MAX}`;
};

const formatGuestbookDate = (value) => {
  const date = value?.toDate instanceof Function ? value.toDate() : null;

  if (!date) {
    return "JUST NOW";
  }

  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL_TIMEZONE,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
};

const createGuestbookEmptyState = (message) => {
  const article = document.createElement("article");
  article.className = "guestbook-post guestbook-post--empty";

  const content = document.createElement("div");
  content.className = "guestbook-post__content";
  content.textContent = message;

  article.append(content);
  return article;
};

const createGuestbookPostElement = (entry) => {
  const article = document.createElement("article");
  article.className = "guestbook-post";

  const meta = document.createElement("div");
  meta.className = "guestbook-post__meta";

  const metaMain = document.createElement("div");
  metaMain.className = "guestbook-post__meta-main";

  const name = document.createElement("span");
  name.textContent = entry.name || "익명";

  const date = document.createElement("span");
  date.textContent = formatGuestbookDate(entry.createdAt);

  metaMain.append(name, date);

  const deleteButton = document.createElement("button");
  deleteButton.className = "guestbook-post__delete";
  deleteButton.type = "button";
  deleteButton.textContent = "삭제";
  deleteButton.setAttribute("data-guestbook-delete-id", entry.id);
  deleteButton.setAttribute("aria-label", `${entry.name || "익명"} 메시지 삭제`);

  meta.append(metaMain, deleteButton);

  const content = document.createElement("div");
  content.className = "guestbook-post__content";
  content.textContent = entry.message || "";

  article.append(meta, content);
  return article;
};

const renderGuestbookEntries = (container, entries, emptyMessage) => {
  if (!container) {
    return;
  }

  const visibleEntries = entries.filter((entry) => entry.isDeleted !== true);

  container.replaceChildren();

  if (!visibleEntries.length) {
    container.append(createGuestbookEmptyState(emptyMessage));
    return;
  }

  visibleEntries.forEach((entry) => {
    container.append(createGuestbookPostElement(entry));
  });
};

const ensureGuestbookService = async () => {
  if (!isFirebaseGuestbookConfigured()) {
    const error = new Error("Firebase guestbook config missing");
    error.code = "guestbook/config-missing";
    throw error;
  }

  if (!window.firebase) {
    if (!firebaseSdkPromise) {
      firebaseSdkPromise = FIREBASE_SDK_URLS.reduce(
        (promise, src) =>
          promise.then(
            () =>
              new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = src;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("Firebase SDK 로딩에 실패했습니다."));
                document.head.appendChild(script);
              }),
          ),
        Promise.resolve(),
      ).catch((error) => {
        firebaseSdkPromise = null;
        throw error;
      });
    }

    await firebaseSdkPromise;
  }

  if (!guestbookServicePromise) {
    guestbookServicePromise = (async () => {
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(FIREBASE_CONFIG);
      }

      const auth = window.firebase.auth();
      const firestore = window.firebase.firestore();

      if (!auth.currentUser) {
        await auth.signInAnonymously();
      }

      return { auth, firestore };
    })().catch((error) => {
      guestbookServicePromise = null;
      throw error;
    });
  }

  return guestbookServicePromise;
};

const subscribeGuestbookFeed = async (container, limitCount) => {
  const { firestore } = await ensureGuestbookService();

  return firestore
    .collection(GUESTBOOK_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .onSnapshot(
      (snapshot) => {
        const entries = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        renderGuestbookEntries(container, entries, "아직 등록된 메시지가 없습니다. 첫 번째 축하를 남겨주세요.");
      },
      (error) => {
        renderGuestbookEntries(container, [], getGuestbookErrorMessage(error));
        setGuestbookNotice(getGuestbookErrorMessage(error), "error");
      },
    );
};

const markGuestbookEntryDeleted = async (entryId) => {
  if (!entryId) {
    return;
  }

  const willDelete = window.confirm(
    "정말 삭제하시겠습니까?",
  );

  if (!willDelete) {
    return;
  }

  try {
    const { auth, firestore } = await ensureGuestbookService();
    const user = auth.currentUser || (await auth.signInAnonymously()).user;

    await firestore.collection(GUESTBOOK_COLLECTION).doc(entryId).update({
      isDeleted: true,
      deletedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      deletedByUid: user.uid,
    });

    showToast("메시지를 삭제했습니다.");
  } catch (error) {
    const notice = getGuestbookErrorMessage(error);
    setGuestbookNotice(notice, "error");
    showToast(notice);
  }
};

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
      title: SHARE_TITLE,
      description: SHARE_DESCRIPTION,
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

  const isAnyModalOpen = [lightbox, gallerySheet, guestbookSheet].some(
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

const openGuestbookSheet = () => {
  setModalState(guestbookSheet, true);
};

const closeGuestbookSheet = () => {
  setModalState(guestbookSheet, false);
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

      if (targetId === "guestbook-sheet") {
        closeGuestbookSheet();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeLightbox();
    closeGallerySheet();
    closeGuestbookSheet();
  });
};

const setupIntroMotion = (recordButton) => {
  const flow = recordButton.querySelector(".record-launch__flow");
  const surface = recordButton.querySelector(".record-launch__surface");
  const glow = document.querySelector(".intro-screen__glow");

  if (!flow || !surface || !glow) {
    return () => {};
  }

  const particles = [];
  let frameId = 0;
  let lastFrameTime = 0;
  let spawnAccumulator = 0;
  let quadrantIndex = 0;
  let isStopped = false;

  const spawnParticle = () => {
    const quadrant = INTRO_NOTE_QUADRANTS[quadrantIndex % INTRO_NOTE_QUADRANTS.length];
    quadrantIndex += 1;

    const element = document.createElement("span");
    element.className = "record-launch__note";
    element.textContent =
      INTRO_NOTE_SYMBOLS[Math.floor(Math.random() * INTRO_NOTE_SYMBOLS.length)];
    element.style.setProperty("--note-size", `${randomBetween(1, 1.26).toFixed(2)}rem`);
    flow.appendChild(element);

    const angle = (randomBetween(quadrant.minDeg, quadrant.maxDeg) * Math.PI) / 180;

    particles.push({
      angle,
      duration: randomBetween(1500, 2250),
      element,
      maxDistance: randomBetween(118, 176),
      phase: randomBetween(0, Math.PI * 2),
      progress: 0,
      rotation: randomBetween(-18, 18),
      spin: randomBetween(-34, 34),
      sway: randomBetween(-13, 13),
    });
  };

  const updatePulse = (now) => {
    const isEntering = document.body.classList.contains("intro-entering");
    const pulseProgress = ((now % INTRO_PULSE_MS) + INTRO_PULSE_MS) % INTRO_PULSE_MS / INTRO_PULSE_MS;
    let pulseStrength = 0;

    if (pulseProgress < 0.18) {
      pulseStrength = easeOutCubic(pulseProgress / 0.18);
    } else if (pulseProgress < 0.48) {
      pulseStrength = 1 - easeInOutSine((pulseProgress - 0.18) / 0.3);
    }

    surface.style.transform = `scale(${(1 + pulseStrength * 0.058).toFixed(3)})`;
    surface.style.setProperty("--record-halo-scale", (0.98 + pulseStrength * 0.24).toFixed(3));
    surface.style.setProperty("--record-halo-opacity", (0.18 + pulseStrength * 0.34).toFixed(3));
    surface.style.setProperty("--record-ring-scale", (0.94 + pulseStrength * 0.3).toFixed(3));
    surface.style.setProperty("--record-ring-opacity", (0.08 + pulseStrength * 0.24).toFixed(3));
    glow.style.transform = `scale(${(isEntering ? 0.84 + pulseStrength * 0.12 : 0.94 + pulseStrength * 0.2).toFixed(3)})`;
    glow.style.opacity = (isEntering ? 0.06 + pulseStrength * 0.12 : 0.22 + pulseStrength * 0.32).toFixed(3);

    return pulseStrength;
  };

  const tick = (now) => {
    if (isStopped) {
      return;
    }

    if (!lastFrameTime) {
      lastFrameTime = now;
    }

    const delta = Math.min(now - lastFrameTime, 32);
    lastFrameTime = now;

    const pulseStrength = updatePulse(now);
    const isEntering = document.body.classList.contains("intro-entering");
    const isPressedNow = recordButton.classList.contains("is-pressed");
    const spawnInterval = isPressedNow
      ? lerp(62, 24, pulseStrength)
      : isEntering
        ? lerp(124, 52, pulseStrength)
        : lerp(215, 96, pulseStrength);
    const speedMultiplier = isPressedNow
      ? lerp(1.35, 3.6, pulseStrength)
      : isEntering
        ? lerp(0.96, 2.48, pulseStrength)
        : lerp(0.48, 1.82, pulseStrength);
    const flowOpacity = isPressedNow
      ? 0.76 + pulseStrength * 0.2
      : isEntering
        ? 0.52 + pulseStrength * 0.34
        : 0.42 + pulseStrength * 0.46;
    const particleLimit = isPressedNow ? 54 : isEntering ? 34 : 24;
    const spawnBatchSize = isPressedNow
      ? (pulseStrength > 0.55 ? 3 : 2)
      : isEntering
        ? (pulseStrength > 0.62 ? 2 : 1)
        : 1;

    spawnAccumulator += delta;

    while (spawnAccumulator >= spawnInterval && particles.length < particleLimit) {
      spawnAccumulator -= spawnInterval;

      for (
        let batchIndex = 0;
        batchIndex < spawnBatchSize && particles.length < particleLimit;
        batchIndex += 1
      ) {
        spawnParticle();
      }
    }

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.progress += (delta / particle.duration) * speedMultiplier;

      if (particle.progress >= 1) {
        particle.element.remove();
        particles.splice(index, 1);
        continue;
      }

      const travel = easeOutCubic(clamp(particle.progress, 0, 1));
      const distance = particle.maxDistance * travel;
      const sway =
        Math.sin(now / 180 + particle.phase) * particle.sway * (0.35 + travel);
      const x =
        Math.cos(particle.angle) * distance +
        Math.cos(particle.angle + Math.PI / 2) * sway;
      const y =
        Math.sin(particle.angle) * distance +
        Math.sin(particle.angle + Math.PI / 2) * sway;

      let opacity = 1;

      if (particle.progress < 0.1) {
        opacity = particle.progress / 0.1;
      } else if (particle.progress > 0.72) {
        opacity = 1 - (particle.progress - 0.72) / 0.28;
      }

      const scale = 0.5 + travel * 0.7 + pulseStrength * 0.18;
      const rotation = particle.rotation + particle.spin * travel;

      particle.element.style.transform =
        `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ` +
        `scale(${scale.toFixed(3)}) rotate(${rotation.toFixed(1)}deg)`;
      particle.element.style.opacity = (clamp(opacity, 0, 1) * flowOpacity).toFixed(3);
    }

    frameId = window.requestAnimationFrame(tick);
  };

  frameId = window.requestAnimationFrame(tick);

  return () => {
    if (isStopped) {
      return;
    }

    isStopped = true;
    window.cancelAnimationFrame(frameId);
    flow.textContent = "";
    surface.style.transform = "";
    surface.style.removeProperty("--record-halo-scale");
    surface.style.removeProperty("--record-halo-opacity");
    surface.style.removeProperty("--record-ring-scale");
    surface.style.removeProperty("--record-ring-opacity");
    glow.style.transform = "";
    glow.style.opacity = "";
  };
};

const setupIntro = () => {
  const recordButton = document.querySelector(".record-launch");
  const searchParams = new URLSearchParams(window.location.search);
  const shouldSkipIntro =
    window.location.hash === "#main" || searchParams.get("skipIntro") === "1";
  const shouldAutoPlayIntro = searchParams.get("playIntro") === "1";
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (!recordButton || !mainContent) {
    return;
  }

  if (shouldSkipIntro) {
    document.body.classList.add("intro-complete");
    return;
  }

  let isPlaying = false;
  let isPressed = false;
  let isReady = Boolean(prefersReducedMotion);
  const stopIntroMotion = setupIntroMotion(recordButton);
  const preventNativeHoldBehavior = (event) => {
    event.preventDefault();
  };
  const markIntroReady = () => {
    if (isReady) {
      return;
    }

    isReady = true;
    document.body.classList.remove("intro-entering");
    document.body.classList.add("intro-ready");
    recordButton.disabled = false;
    recordButton.removeAttribute("aria-disabled");
  };

  const clearPressState = () => {
    isPressed = false;
    recordButton.classList.remove("is-pressed");
  };

  const beginPressState = () => {
    if (!isReady || isPlaying || isPressed) {
      return;
    }

    isPressed = true;
    recordButton.classList.add("is-pressed");
  };

  const playIntro = () => {
    if (isPlaying) {
      return;
    }

    isPlaying = true;
    clearPressState();
    stopIntroMotion();
    document.body.classList.add("intro-playing");

    window.setTimeout(() => {
      document.body.classList.add("intro-complete");
      mainContent.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });

      window.setTimeout(() => {
        document.body.classList.remove("intro-playing");
      }, INTRO_FADE_DURATION_MS);
    }, INTRO_DURATION_MS);
  };

  if (window.PointerEvent) {
    recordButton.addEventListener("contextmenu", preventNativeHoldBehavior);
    recordButton.addEventListener("dragstart", preventNativeHoldBehavior);

    recordButton.addEventListener("pointerdown", (event) => {
      if (isPlaying) {
        return;
      }

      if (!isReady) {
        event.preventDefault();
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      beginPressState();
      recordButton.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    recordButton.addEventListener("pointerup", (event) => {
      if (!isPressed || isPlaying) {
        return;
      }

      if (recordButton.hasPointerCapture?.(event.pointerId)) {
        recordButton.releasePointerCapture(event.pointerId);
      }

      event.preventDefault();
      playIntro();
    });

    const cancelPress = (event) => {
      if (!isPressed || isPlaying) {
        return;
      }

      if (
        typeof event.pointerId === "number" &&
        recordButton.hasPointerCapture?.(event.pointerId)
      ) {
        recordButton.releasePointerCapture(event.pointerId);
      }

      clearPressState();
    };

    recordButton.addEventListener("pointercancel", cancelPress);
    recordButton.addEventListener("lostpointercapture", () => {
      if (!isPlaying) {
        clearPressState();
      }
    });
  } else {
    recordButton.addEventListener("contextmenu", preventNativeHoldBehavior);
    recordButton.addEventListener("dragstart", preventNativeHoldBehavior);
    recordButton.addEventListener("click", () => {
      if (!isReady) {
        return;
      }

      playIntro();
    });
  }

  recordButton.addEventListener("keydown", (event) => {
    if (!isReady || isPlaying || event.repeat) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    beginPressState();
    event.preventDefault();
  });

  recordButton.addEventListener("keyup", (event) => {
    if (!isReady || isPlaying) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    playIntro();
  });

  recordButton.addEventListener("blur", () => {
    if (!isPlaying) {
      clearPressState();
    }
  });

  if (prefersReducedMotion) {
    document.body.classList.add("intro-ready");
  } else {
    document.body.classList.add("intro-entering");
    recordButton.disabled = true;
    recordButton.setAttribute("aria-disabled", "true");
    window.setTimeout(() => {
      markIntroReady();
    }, INTRO_ENTRY_DURATION_MS);
  }

  if (shouldAutoPlayIntro) {
    window.setTimeout(() => {
      playIntro();
    }, prefersReducedMotion ? 140 : INTRO_ENTRY_DURATION_MS + 220);
  }
};

const setupPageNotes = () => {
  const pageNotes = document.querySelector(".page-notes");

  if (!pageNotes) {
    return;
  }

  pageNotes.replaceChildren();

  const columnCount = 6;
  const rowCount = Math.ceil(PAGE_NOTE_COUNT / columnCount);

  for (let index = 0; index < PAGE_NOTE_COUNT; index += 1) {
    const row = Math.floor(index / columnCount);
    const column = index % columnCount;
    const leftProgress = columnCount === 1 ? 0.5 : column / (columnCount - 1);
    const topProgress = rowCount === 1 ? 0.5 : row / (rowCount - 1);
    const left = clamp(lerp(7, 89, leftProgress) + (pseudoRandom(index + 1) - 0.5) * 8.4, 4, 92);
    const top = clamp(lerp(5, 95, topProgress) + (pseudoRandom(index + 41) - 0.5) * 9.6, 4, 96);
    const size = 0.82 + pseudoRandom(index + 81) * 0.54;
    const opacity = 0.18 + pseudoRandom(index + 121) * 0.16;
    const duration = 9.4 + pseudoRandom(index + 161) * 4.8;
    const delay = -(pseudoRandom(index + 201) * 12.5);
    const driftX = (pseudoRandom(index + 241) - 0.5) * 4.8;
    const driftY = (pseudoRandom(index + 281) - 0.5) * 5.8;
    const rotate = -16 + pseudoRandom(index + 321) * 32;
    const note = document.createElement("span");

    note.className = "page-note";
    note.textContent =
      INTRO_NOTE_SYMBOLS[Math.floor(pseudoRandom(index + 361) * INTRO_NOTE_SYMBOLS.length)];
    note.style.setProperty("--page-note-left", `${left.toFixed(2)}%`);
    note.style.setProperty("--page-note-top", `${top.toFixed(2)}%`);
    note.style.setProperty("--page-note-size", `${size.toFixed(2)}rem`);
    note.style.setProperty("--page-note-opacity", opacity.toFixed(2));
    note.style.setProperty("--page-note-duration", `${duration.toFixed(2)}s`);
    note.style.setProperty("--page-note-delay", `${delay.toFixed(2)}s`);
    note.style.setProperty("--page-note-drift-x", `${driftX.toFixed(2)}rem`);
    note.style.setProperty("--page-note-drift-y", `${driftY.toFixed(2)}rem`);
    note.style.setProperty("--page-note-rotate", `${rotate.toFixed(2)}deg`);
    pageNotes.append(note);
  }
};

const setupTapNoteBursts = () => {
  if (!mainContent || !tapNoteBursts) {
    return;
  }

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  let activeTouchId = null;
  let lastTrailX = 0;
  let lastTrailY = 0;

  const appendTapNote = (className, x, y, configure) => {
    const note = document.createElement("span");

    note.className = className;
    note.textContent =
      INTRO_NOTE_SYMBOLS[Math.floor(randomBetween(0, INTRO_NOTE_SYMBOLS.length))];
    note.style.left = `${x}px`;
    note.style.top = `${y}px`;
    configure(note);

    while (tapNoteBursts.childElementCount >= MAX_ACTIVE_TAP_NOTES) {
      tapNoteBursts.firstElementChild?.remove();
    }

    tapNoteBursts.append(note);
    note.addEventListener(
      "animationend",
      () => {
        note.remove();
      },
      { once: true },
    );
  };

  const spawnTapBurst = (x, y) => {
    const burstCount = 8;

    for (let index = 0; index < burstCount; index += 1) {
      const angle = (Math.PI * 2 * index) / burstCount + randomBetween(-0.22, 0.22);
      const distance = randomBetween(24, 62);
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance - randomBetween(8, 24);
      const delay = index * 18 + randomBetween(0, 18);

      appendTapNote("tap-note-burst", x, y, (note) => {
        note.style.setProperty("--burst-x", `${offsetX.toFixed(2)}px`);
        note.style.setProperty("--burst-y", `${offsetY.toFixed(2)}px`);
        note.style.setProperty("--burst-size", `${randomBetween(0.92, 1.32).toFixed(2)}rem`);
        note.style.setProperty("--burst-opacity", `${randomBetween(0.74, 0.98).toFixed(2)}`);
        note.style.setProperty("--burst-rotate", `${randomBetween(-30, 30).toFixed(2)}deg`);
        note.style.setProperty("--burst-duration", `${randomBetween(620, 860).toFixed(0)}ms`);
        note.style.setProperty("--burst-delay", `${delay.toFixed(0)}ms`);
      });
    }
  };

  const spawnTrailNote = (x, y, options = {}) => {
    const {
      delay = 0,
      driftX,
      driftY,
      opacity = randomBetween(0.4, 0.72),
      rotate = randomBetween(-24, 24),
      size = randomBetween(0.92, 1.16),
      duration = randomBetween(560, 820),
    } = options;
    const radialAngle = randomBetween(-Math.PI, Math.PI);
    const radialDistance = randomBetween(16, 32);
    const resolvedDriftX = driftX ?? Math.cos(radialAngle) * radialDistance;
    const resolvedDriftY = driftY ?? Math.sin(radialAngle) * radialDistance;

    appendTapNote("tap-note-burst tap-note-trail", x, y, (note) => {
      note.style.setProperty("--trail-delay", `${delay.toFixed(0)}ms`);
      note.style.setProperty("--trail-x", `${resolvedDriftX.toFixed(2)}px`);
      note.style.setProperty("--trail-y", `${resolvedDriftY.toFixed(2)}px`);
      note.style.setProperty("--trail-size", `${size.toFixed(2)}rem`);
      note.style.setProperty("--trail-opacity", `${opacity.toFixed(2)}`);
      note.style.setProperty("--trail-rotate", `${rotate.toFixed(2)}deg`);
      note.style.setProperty("--trail-duration", `${duration.toFixed(0)}ms`);
    });
  };

  const emitTrailBetween = (startX, startY, endX, endY) => {
    const distance = Math.hypot(endX - startX, endY - startY);

    if (distance < 10) {
      return;
    }

    const stepDistance = distance > 110 ? 18 : 20;
    const stepCount = Math.max(1, Math.floor(distance / stepDistance));
    const sprayCount = distance > 96 ? 2 : 1;

    for (let stepIndex = 1; stepIndex <= stepCount; stepIndex += 1) {
      const progress = stepIndex / stepCount;
      const anchorX = lerp(startX, endX, progress) + randomBetween(-1.8, 1.8);
      const anchorY = lerp(startY, endY, progress) + randomBetween(-1.8, 1.8);

      for (let sprayIndex = 0; sprayIndex < sprayCount; sprayIndex += 1) {
        const angle = randomBetween(-Math.PI, Math.PI);
        const radius = randomBetween(18, 34) + sprayIndex * randomBetween(2, 8);

        spawnTrailNote(anchorX, anchorY, {
          delay: sprayIndex * 16 + randomBetween(0, 12),
          driftX: Math.cos(angle) * radius,
          driftY: Math.sin(angle) * radius,
          opacity: randomBetween(0.42, 0.76),
          rotate: randomBetween(-28, 28),
          size: randomBetween(0.94, 1.18),
          duration: randomBetween(560, 840),
        });
      }
    }
  };

  const findTouchById = (touchList, identifier) => {
    for (let index = 0; index < touchList.length; index += 1) {
      const touch = touchList[index];

      if (touch.identifier === identifier) {
        return touch;
      }
    }

    return null;
  };

  const clearActiveTouch = () => {
    activeTouchId = null;
    lastTrailX = 0;
    lastTrailY = 0;
  };

  mainContent.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.clientX === 0 && event.clientY === 0) {
      return;
    }

    if (event.target.closest("input, textarea, select")) {
      return;
    }

    spawnTapBurst(event.clientX, event.clientY);
  });

  mainContent.addEventListener(
    "touchstart",
    (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      if (event.target.closest("input, textarea, select")) {
        clearActiveTouch();
        return;
      }

      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      activeTouchId = touch.identifier;
      lastTrailX = touch.clientX;
      lastTrailY = touch.clientY;
      spawnTrailNote(lastTrailX, lastTrailY);
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (activeTouchId === null) {
        return;
      }

      const touch = findTouchById(event.touches, activeTouchId);

      if (!touch) {
        return;
      }

      emitTrailBetween(lastTrailX, lastTrailY, touch.clientX, touch.clientY);
      lastTrailX = touch.clientX;
      lastTrailY = touch.clientY;
    },
    { passive: true },
  );

  const stopTouchTrail = (event) => {
    if (activeTouchId === null) {
      return;
    }

    const touch = findTouchById(event.changedTouches, activeTouchId);

    if (!touch) {
      return;
    }

    clearActiveTouch();
  };

  window.addEventListener("touchend", stopTouchTrail, { passive: true });
  window.addEventListener("touchcancel", stopTouchTrail, { passive: true });
};

const setupScrollPerformanceTuning = () => {
  let isScrolling = false;
  let clearScrollStateTimeoutId = 0;

  const clearScrollState = () => {
    isScrolling = false;
    document.body.classList.remove("is-scrolling");
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!isScrolling) {
        isScrolling = true;
        document.body.classList.add("is-scrolling");
      }

      window.clearTimeout(clearScrollStateTimeoutId);
      clearScrollStateTimeoutId = window.setTimeout(clearScrollState, SCROLL_IDLE_MS);
    },
    { passive: true },
  );
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
    countdownMessage.innerHTML = `국성과 가영의 결혼식이 <strong>${dayDiff}일</strong> 남았습니다.`;
  } else if (dayDiff === 0) {
    countdownMessage.innerHTML = `<strong>오늘</strong>은 바로 국성과 가영의 결혼식입니다.`;
  } else {
    countdownMessage.textContent = "국성과 가영의 결혼식은 아름다운 추억으로 남아 있습니다.";
  }
};

const renderGallery = () => {
  if (!galleryPreviewGrid) {
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
};

const renderGallerySheet = () => {
  if (!gallerySheetGrid || gallerySheetRendered) {
    return;
  }

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
  gallerySheetRendered = true;
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
    renderGallerySheet();
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
      const successMessage = button.getAttribute("data-copy-success") || "복사되었습니다.";

      if (value) {
        copyText(value, successMessage);
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

const initializeGuestbookFeed = async () => {
  try {
    guestbookPreviewUnsubscribe?.();
    guestbookPreviewUnsubscribe = await subscribeGuestbookFeed(
      guestbookPosts,
      GUESTBOOK_PREVIEW_LIMIT,
    );
    setGuestbookNotice(GUESTBOOK_NOTICE_DEFAULT);
    setGuestbookInteractivity(true);
  } catch (error) {
    const message = getGuestbookErrorMessage(error);
    renderGuestbookEntries(guestbookPosts, [], message);
    setGuestbookNotice(message, "error");
    setGuestbookInteractivity(false);
  }
};

const openGuestbookFeed = async () => {
  openGuestbookSheet();

  if (!guestbookSheetPosts) {
    return;
  }

  renderGuestbookEntries(guestbookSheetPosts, [], "남겨주신 메시지를 불러오고 있어요.");

  try {
    guestbookSheetUnsubscribe?.();
    guestbookSheetUnsubscribe = await subscribeGuestbookFeed(
      guestbookSheetPosts,
      GUESTBOOK_MODAL_LIMIT,
    );
  } catch (error) {
    renderGuestbookEntries(guestbookSheetPosts, [], getGuestbookErrorMessage(error));
  }
};

const submitGuestbookEntry = async (event) => {
  event.preventDefault();

  if (!guestbookNameInput || !guestbookMessageInput) {
    return;
  }

  const name = guestbookNameInput.value.trim();
  const message = guestbookMessageInput.value.trim();

  if (!name) {
    showToast("이름을 적어주세요.");
    guestbookNameInput.focus();
    return;
  }

  if (!message) {
    showToast("축하 메시지를 적어주세요.");
    guestbookMessageInput.focus();
    return;
  }

  if (name.length > GUESTBOOK_NAME_MAX || message.length > GUESTBOOK_MESSAGE_MAX) {
    showToast("입력 가능한 글자 수를 확인해 주세요.");
    return;
  }

  setGuestbookSubmitting(true);

  try {
    const { auth, firestore } = await ensureGuestbookService();
    const user = auth.currentUser || (await auth.signInAnonymously()).user;

    await firestore.collection(GUESTBOOK_COLLECTION).add({
      name,
      message,
      uid: user.uid,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    });

    guestbookMessageInput.value = "";
    updateGuestbookCount();
    showToast("축하 메시지를 남겼습니다.");
  } catch (error) {
    const notice = getGuestbookErrorMessage(error);
    setGuestbookNotice(notice, "error");
    showToast(notice);
  } finally {
    setGuestbookSubmitting(false);
  }
};

const setupGuestbook = () => {
  if (!guestbookForm || !guestbookPosts) {
    return;
  }

  let guestbookFeedStarted = false;
  const startGuestbookFeed = () => {
    if (guestbookFeedStarted) {
      return;
    }

    guestbookFeedStarted = true;
    initializeGuestbookFeed();
  };

  setGuestbookInteractivity(false);
  setGuestbookNotice(GUESTBOOK_NOTICE_DEFAULT);
  renderGuestbookEntries(guestbookPosts, [], "따뜻한 축하 한마디를 기다리고 있어요.");
  renderGuestbookEntries(guestbookSheetPosts, [], "남겨주신 메시지를 불러오고 있어요.");
  updateGuestbookCount();

  guestbookMessageInput?.addEventListener("input", () => {
    updateGuestbookCount();
  });

  guestbookForm.addEventListener("submit", submitGuestbookEntry);

  guestbookListButton?.addEventListener("click", () => {
    startGuestbookFeed();
    openGuestbookFeed();
  });

  [guestbookPosts, guestbookSheetPosts].forEach((container) => {
    container?.addEventListener("click", (event) => {
      const deleteButton = event.target.closest("[data-guestbook-delete-id]");

      if (!deleteButton) {
        return;
      }

      const entryId = deleteButton.getAttribute("data-guestbook-delete-id");

      if (entryId) {
        markGuestbookEntryDeleted(entryId);
      }
    });
  });

  const guestbookCard = guestbookPosts.closest(".guestbook-card");

  if (guestbookCard && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          startGuestbookFeed();
          observer.disconnect();
        }
      },
      { rootMargin: "480px 0px" },
    );

    observer.observe(guestbookCard);
  } else {
    runWhenIdle(startGuestbookFeed, 2400);
  }
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
setupScrollPerformanceTuning();
setupModalCloseButtons();
setupCopyButtons();
setupHeartToggles();
setupGuestbook();
setupKakaoShare();
setupPageNotes();
setupTapNoteBursts();
renderCalendar();
renderCountdown();
setupGallery();
window.setInterval(renderCountdown, 1000);
