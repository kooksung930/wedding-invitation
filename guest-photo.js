const config = window.WEDDING_CONFIG?.firebaseConfig;
const sdkUrls = [
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage-compat.js",
];
const form = document.getElementById("guest-photo-form");
const fileInput = document.getElementById("photo-file");
const fileLabel = document.getElementById("file-picker-label");
const preview = document.getElementById("photo-preview");
const status = document.getElementById("form-status");
const submitButton = document.getElementById("submit-button");
const bgmPlayer = document.getElementById("bgm-player");
const musicButton = document.getElementById("music-button");
const maxInputFileSize = 50 * 1024 * 1024;
const maxUploadFileSize = 4 * 1024 * 1024;
const maxImageDimension = 2000;
const bgmPositionKey = "wedding-bgm-position";
let heicConverterPromise;

const setStatus = (message, success = false) => {
  status.textContent = message;
  status.classList.toggle("is-success", success);
};

const updateMusicButton = () => {
  const isPlaying = bgmPlayer && !bgmPlayer.paused;
  musicButton.classList.toggle("is-playing", isPlaying);
  musicButton.textContent = isPlaying ? "Music off" : "Music on";
};

const setupMusic = async () => {
  if (!bgmPlayer || !musicButton) return;
  bgmPlayer.volume = 0.24;
  const savedPosition = Number.parseFloat(localStorage.getItem(bgmPositionKey));
  if (Number.isFinite(savedPosition)) {
    bgmPlayer.addEventListener("loadedmetadata", () => {
      if (savedPosition < bgmPlayer.duration) bgmPlayer.currentTime = savedPosition;
    }, { once: true });
  }
  bgmPlayer.addEventListener("timeupdate", () => localStorage.setItem(bgmPositionKey, String(bgmPlayer.currentTime)));
  bgmPlayer.addEventListener("play", updateMusicButton);
  bgmPlayer.addEventListener("pause", updateMusicButton);
  musicButton.addEventListener("click", async () => {
    if (bgmPlayer.paused) await bgmPlayer.play(); else bgmPlayer.pause();
    updateMusicButton();
  });
  try { await bgmPlayer.play(); } catch (_) { /* Browser autoplay policy */ }
  updateMusicButton();
};

const loadSdk = () => Promise.all(sdkUrls.map((src) => new Promise((resolve, reject) => {
  const script = document.createElement("script");
  script.src = src;
  script.onload = resolve;
  script.onerror = () => reject(new Error("Firebase SDK load failed"));
  document.head.append(script);
})));

const isHeic = (file) => /\.(heic|heif)$/i.test(file.name) || /image\/(heic|heif)/i.test(file.type);
const loadHeicConverter = () => {
  if (window.heic2any) return Promise.resolve(window.heic2any);
  if (!heicConverterPromise) {
    heicConverterPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      script.onload = () => window.heic2any ? resolve(window.heic2any) : reject(new Error("heic-converter-load-failed"));
      script.onerror = () => reject(new Error("heic-converter-load-failed"));
      document.head.append(script);
    });
  }
  return heicConverterPromise;
};

const convertIfHeic = async (file) => {
  if (!isHeic(file)) return file;
  const converter = await loadHeicConverter();
  const converted = await converter({ blob: file, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(converted) ? converted[0] : converted;
};

fileInput.addEventListener("change", () => {
  const files = [...fileInput.files];
  if (!files.length) return;
  fileLabel.textContent = `${files.length} photos selected`;
  preview.textContent = "";
  files.forEach((file, index) => {
    if ((!file.type.startsWith("image/") && !isHeic(file)) || file.size > maxInputFileSize) return;
    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = `Selected photo ${index + 1}`;
    preview.append(image);
  });
  preview.hidden = preview.childElementCount === 0;
});

setupMusic();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const files = [...fileInput.files];
  const name = document.getElementById("guest-name").value.trim();
  const message = document.getElementById("guest-message").value.trim();
  const consent = document.getElementById("guest-consent").checked;

  if (!files.length || files.some((file) => (!file.type.startsWith("image/") && !isHeic(file)) || file.size > maxInputFileSize)) {
    setStatus("이미지 사진만 선택해주세요. 원본은 50MB까지 가능해요."); return;
  }
  if (!name) { setStatus("이름을 입력해주세요."); return; }
  if (!consent) { setStatus("사진 전달 동의에 체크해주세요."); return; }

  submitButton.disabled = true;
  submitButton.textContent = `Uploading 0/${files.length}...`;
  setStatus("");
  try {
    if (!window.firebase) await loadSdk();
    if (!firebase.apps.length) firebase.initializeApp(config);
    const auth = firebase.auth();
    const user = auth.currentUser || (await auth.signInAnonymously()).user;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      submitButton.textContent = `Compressing ${index + 1}/${files.length}...`;
      const compressedFile = await compressImage(file);
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "") + ".jpg";
      const storagePath = `guest-photos/${user.uid}/${fileId}-${safeName}`;
      const snapshot = await firebase.storage().ref(storagePath).put(compressedFile, { contentType: "image/jpeg" });
      const imageUrl = await snapshot.ref.getDownloadURL();
      await firebase.firestore().collection("guestPhotos").add({
        uid: user.uid, name, message, imageUrl, storagePath, status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      submitButton.textContent = `Uploading ${index + 1}/${files.length}...`;
    }
    form.reset();
    preview.hidden = true;
    fileLabel.textContent = "Choose photos";
    setStatus(`${files.length}장의 사진이 잘 도착했어요.`, true);
  } catch (error) {
    console.error(error);
    const reason = error.message === "heic-converter-load-failed"
      ? "HEIC 변환 도구를 불러오지 못했어요. 잠시 후 다시 시도해주세요."
      : error.message === "unsupported-image-format"
        ? "이 사진 형식을 변환하지 못했어요."
      : error.message === "compression-failed"
        ? "사진 용량을 줄이지 못했어요. 다른 사진을 선택해주세요."
        : (error.code || "please try again");
    setStatus(`Upload failed: ${reason}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Leave photos";
  }
});

async function compressImage(file) {
  file = await convertIfHeic(file);
  let image;
  try {
    image = await createImageBitmap(file);
  } catch (_) {
    throw new Error("unsupported-image-format");
  }
  const scale = Math.min(1, maxImageDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();
  let quality = 0.82;
  let blob;
  do {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    quality -= 0.1;
  } while (blob && blob.size > maxUploadFileSize && quality >= 0.42);
  if (!blob || blob.size > maxUploadFileSize) throw new Error("compression-failed");
  return blob;
}
