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
const maxFileSize = 10 * 1024 * 1024;
const bgmPositionKey = "wedding-bgm-position";

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
  bgmPlayer.addEventListener("timeupdate", () => {
    localStorage.setItem(bgmPositionKey, String(bgmPlayer.currentTime));
  });
  bgmPlayer.addEventListener("play", updateMusicButton);
  bgmPlayer.addEventListener("pause", updateMusicButton);
  musicButton.addEventListener("click", async () => {
    if (bgmPlayer.paused) await bgmPlayer.play();
    else bgmPlayer.pause();
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

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  fileLabel.textContent = file.name;
  if (file.size <= maxFileSize && file.type.startsWith("image/")) {
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

  if (!file || !file.type.startsWith("image/") || file.size > maxFileSize) {
    setStatus("Please choose an image under 10MB."); return;
  }
  if (!name) { setStatus("Please enter your name."); return; }
  if (!consent) { setStatus("Please agree to send the photo."); return; }

  submitButton.disabled = true;
  submitButton.textContent = "Uploading...";
  setStatus("");
  try {
    if (!window.firebase) await loadSdk();
    if (!firebase.apps.length) firebase.initializeApp(config);
    const auth = firebase.auth();
    const user = auth.currentUser || (await auth.signInAnonymously()).user;
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `guest-photos/${user.uid}/${fileId}-${safeName}`;
    const snapshot = await firebase.storage().ref(storagePath).put(file, { contentType: file.type });
    const imageUrl = await snapshot.ref.getDownloadURL();
    await firebase.firestore().collection("guestPhotos").add({
      uid: user.uid, name, message, imageUrl, storagePath, status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    form.reset();
    preview.hidden = true;
    fileLabel.textContent = "Choose a photo";
    setStatus("Your photo has arrived. Thank you!", true);
  } catch (error) {
    console.error(error);
    setStatus(`Upload failed: ${error.code || "please try again"}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Leave a photo";
  }
});
