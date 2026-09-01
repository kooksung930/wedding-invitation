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
const previewImage = document.getElementById("photo-preview-image");
const status = document.getElementById("form-status");
const submitButton = document.getElementById("submit-button");
const bgmPlayer = document.getElementById("bgm-player");
const musicButton = document.getElementById("music-button");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BGM_POSITION_KEY = "wedding-bgm-position";

const setStatus = (message, success = false) => {
  status.textContent = message;
  status.classList.toggle("is-success", success);
};

const updateMusicButton = () => {
  const isPlaying = bgmPlayer && !bgmPlayer.paused;
  musicButton.classList.toggle("is-playing", isPlaying);
  musicButton.textContent = isPlaying ? "♫ 음악 끄기" : "♫ 음악 켜기";
};

const setupMusic = async () => {
  if (!bgmPlayer || !musicButton) return;
  bgmPlayer.volume = 0.24;
  const savedPosition = Number.parseFloat(localStorage.getItem(BGM_POSITION_KEY));
  if (Number.isFinite(savedPosition)) {
    bgmPlayer.addEventListener("loadedmetadata", () => {
      if (savedPosition < bgmPlayer.duration) bgmPlayer.currentTime = savedPosition;
    }, { once: true });
  }
  bgmPlayer.addEventListener("timeupdate", () => localStorage.setItem(BGM_POSITION_KEY, String(bgmPlayer.currentTime)));
  bgmPlayer.addEventListener("play", updateMusicButton);
  bgmPlayer.addEventListener("pause", updateMusicButton);
  musicButton.addEventListener("click", async () => {
    if (bgmPlayer.paused) await bgmPlayer.play();
    else bgmPlayer.pause();
    updateMusicButton();
  });
  try { await bgmPlayer.play(); } catch (_) { /* 모바일 자동재생 제한 */ }
  updateMusicButton();
};

const loadSdk = () => Promise.all(sdkUrls.map((src) => new Promise((resolve, reject) => {
  const script = document.createElement("script");
  script.src = src;
  script.onload = resolve;
  script.onerror = () => reject(new Error("Firebase SDK load failed"));
  document.head.append(script);
})));

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileLabel.textContent = file.name;
  if (file.size <= MAX_FILE_SIZE && file.type.startsWith("image/")) {
    previewImage.src = URL.createObjectURL(file);
    preview.hidden = false;
  }
});

setupMusic();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = fileInput.files[0];
  const name = document.getElementById("guest-name").value.trim();
  const message = document.getElementById("guest-message").value.trim();
  const consent = document.getElementById("guest-consent").checked;

  if (!file || !file.type.startsWith("image/") || file.size > MAX_FILE_SIZE) {
    setStatus("10MB 이하의 이미지 사진을 선택해주세요."); return;
  }
  if (!name) { setStatus("이름을 입력해주세요."); return; }
  if (!consent) { setStatus("사진 전달 동의에 체크해주세요."); return; }

  submitButton.disabled = true;
  submitButton.textContent = "업로드 중...";
  setStatus("");
  try {
    if (!window.firebase) await loadSdk();
    if (!firebase.apps.length) firebase.initializeApp(config);
    const auth = firebase.auth();
    const user = auth.currentUser || (await auth.signInAnonymously()).user;
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `guest-photos/${user.uid}/${fileId}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const snapshot = await firebase.storage().ref(storagePath).put(file, { contentType: file.type });
    const imageUrl = await snapshot.ref.getDownloadURL();
    await firebase.firestore().collection("guestPhotos").add({
      uid: user.uid, name, message, imageUrl, storagePath, status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    form.reset(); preview.hidden = true; fileLabel.textContent = "사진을 선택해주세요";
    setStatus("사진이 잘 도착했어요. 소중히 간직할게요.", true);
  } catch (error) {
    console.error(error);
    setStatus("업로드에 실패했어요. 잠시 후 다시 시도해주세요.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "사진 남기기";
  }
});
