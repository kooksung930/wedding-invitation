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
const maxFileSize = 50 * 1024 * 1024;
const uploadIdleTimeout = 10 * 60 * 1000;
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
  if (Number.isFinite(savedPosition)) bgmPlayer.addEventListener("loadedmetadata", () => { if (savedPosition < bgmPlayer.duration) bgmPlayer.currentTime = savedPosition; }, { once: true });
  bgmPlayer.addEventListener("timeupdate", () => localStorage.setItem(bgmPositionKey, String(bgmPlayer.currentTime)));
  bgmPlayer.addEventListener("play", updateMusicButton);
  bgmPlayer.addEventListener("pause", updateMusicButton);
  musicButton.addEventListener("click", async () => { if (bgmPlayer.paused) await bgmPlayer.play(); else bgmPlayer.pause(); updateMusicButton(); });
  try { await bgmPlayer.play(); } catch (_) { /* Browser autoplay policy */ }
  updateMusicButton();
};

const loadSdk = () => Promise.all(sdkUrls.map((src) => new Promise((resolve, reject) => {
  const script = document.createElement("script"); script.src = src; script.onload = resolve;
  script.onerror = () => reject(new Error("Firebase SDK load failed")); document.head.append(script);
})));

const isImageFile = (file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name);
const getContentType = (file) => {
  if (file.type.startsWith("image/")) return file.type;
  const extension = file.name.split(".").pop().toLowerCase();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif", avif: "image/avif" })[extension] || "image/jpeg";
};

fileInput.addEventListener("change", () => {
  const files = [...fileInput.files];
  if (!files.length) return;
  fileLabel.textContent = `${files.length} photos selected`;
  preview.textContent = "";
  files.forEach((file, index) => {
    if (!isImageFile(file) || file.size > maxFileSize || file.type.match(/heic|heif/i)) return;
    const image = document.createElement("img"); image.src = URL.createObjectURL(file); image.alt = `Selected photo ${index + 1}`; preview.append(image);
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
  if (!files.length || files.some((file) => !isImageFile(file) || file.size > maxFileSize)) { setStatus("이미지 사진만 가능하고, 사진 1장당 50MB까지예요."); return; }
  if (!name) { setStatus("이름을 입력해주세요."); return; }
  if (!consent) { setStatus("사진 전달 동의에 체크해주세요."); return; }
  submitButton.disabled = true; submitButton.textContent = `Uploading 0/${files.length}...`; setStatus("");
  try {
    if (!window.firebase) await loadSdk();
    if (!firebase.apps.length) firebase.initializeApp(config);
    const auth = firebase.auth(); const user = auth.currentUser || (await auth.signInAnonymously()).user;
    const failedFiles = [];
    let uploadedCount = 0;
    await Promise.all(files.map(async (file, index) => {
      submitButton.textContent = `Uploading ${index + 1}/${files.length}...`;
      try {
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `guest-photos/${user.uid}/${fileId}-${safeName}`;
        const contentType = getContentType(file);
        const uploadTask = firebase.storage().ref(storagePath).put(file, { contentType });
        const snapshot = await new Promise((resolve, reject) => {
          let progressTimer = window.setTimeout(() => {
            uploadTask.cancel();
            reject(Object.assign(new Error("upload-timeout"), { code: "storage/timeout" }));
          }, uploadIdleTimeout);
          uploadTask.on("state_changed", (progress) => {
            window.clearTimeout(progressTimer);
            const percent = Math.round((progress.bytesTransferred / progress.totalBytes) * 100);
            submitButton.textContent = `Uploading ${index + 1}/${files.length} (${percent}%)...`;
            progressTimer = window.setTimeout(() => {
              uploadTask.cancel();
              reject(Object.assign(new Error("upload-timeout"), { code: "storage/timeout" }));
            }, uploadIdleTimeout);
          }, (error) => {
            window.clearTimeout(progressTimer);
            reject(error);
          }, () => {
            window.clearTimeout(progressTimer);
            resolve(uploadTask.snapshot);
          });
        });
        const imageUrl = await snapshot.ref.getDownloadURL();
        await firebase.firestore().collection("guestPhotos").add({ uid: user.uid, name, message, imageUrl, storagePath, status: "pending", createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        uploadedCount += 1;
        submitButton.textContent = `Uploading ${uploadedCount}/${files.length} complete...`;
      } catch (error) {
        console.error(`Failed file: ${file.name}`, error);
        failedFiles.push(`${file.name} (${error.code || error.message || "error"})`);
      }
    }));
    form.reset(); preview.hidden = true; fileLabel.textContent = "Choose photos";
    if (failedFiles.length) setStatus(`${uploadedCount}장 업로드 완료. 실패: ${failedFiles.join(", ")}`);
    else setStatus(`${uploadedCount}장의 사진이 잘 도착했어요.`, true);
  } catch (error) { console.error(error); setStatus(`Upload failed: ${error.code || "please try again"}`); }
  finally { submitButton.disabled = false; submitButton.textContent = "Leave photos"; }
});
