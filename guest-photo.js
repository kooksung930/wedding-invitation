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
const bgmToggle = document.getElementById("bgm-toggle");
const bgmPrev = document.getElementById("bgm-prev");
const bgmNext = document.getElementById("bgm-next");
const bgmTitle = document.getElementById("bgm-title");
const bgmTitleText = document.querySelector(".bgm-player__title-text");
const bgmSeek = document.getElementById("bgm-seek");
const maxFileSize = 50 * 1024 * 1024;
const maxPhotoCount = 9;
// 전송이 멈춘 경우 오래 기다리지 않도록, 진행이 없는 상태만 45초 후 실패 처리한다.
const uploadIdleTimeout = 45 * 1000;
const bgmPositionKey = "wedding-bgm-position";
const bgmTrackKey = "wedding-bgm-track";
const bgmPlayingKey = "wedding-bgm-playing";
const bgmPlaylist = [
  ["가정을만들자", "resource/bgm/가정을만들자.mp3"], ["길을 잃어도 괜찮아", "resource/bgm/길을 잃어도 괜찮아.mp3"],
  ["박사님과 골목대장", "resource/bgm/박사님과 골목대장.mp3"], ["새벽 두 시, 로봇은 안 잔다", "resource/bgm/새벽 두 시, 로봇은 안 잔다.mp3"],
  ["설명서 필요 없어", "resource/bgm/설명서 필요 없어.mp3"], ["에게해의 다음 장면", "resource/bgm/에게해의 다음 장면.mp3"],
  ["오, 나의 골목대장이여", "resource/bgm/오, 나의 골목대장이여.mp3"], ["우리의 조립 설명서", "resource/bgm/우리의 조립 설명서.mp3"],
  ["집에 가는 길", "resource/bgm/집에 가는 길.mp3"], ["한 바퀴만", "resource/bgm/한 바퀴만.mp3"],
  ["한판 살아봅시다", "resource/bgm/한판 살아봅시다.mp3"], ["Dr. Jun & Miss Choi", "resource/bgm/Dr. Jun & Miss Choi.mp3"],
];

const setStatus = (message, success = false) => {
  status.textContent = message;
  status.classList.toggle("is-success", success);
};

const updateMusicButton = () => {
  const isPlaying = bgmPlayer && !bgmPlayer.paused;
  bgmToggle.textContent = isPlaying ? "Ⅱ" : "▶";
};

const setupMusic = async () => {
  if (!bgmPlayer || !bgmToggle) return;
  bgmPlayer.volume = 0.24;
  let trackIndex = Number.parseInt(localStorage.getItem(bgmTrackKey), 10);
  if (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex >= bgmPlaylist.length) trackIndex = 0;
  const setTrack = (nextIndex, shouldPlay = false) => {
    trackIndex = (nextIndex + bgmPlaylist.length) % bgmPlaylist.length;
    const [title, source] = bgmPlaylist[trackIndex];
    bgmPlayer.src = encodeURI(`${source}?v=20260902-1`);
    bgmTitleText.textContent = title;
    bgmTitle.classList.remove("is-long");
    window.requestAnimationFrame(() => {
      if (bgmTitleText.scrollWidth > bgmTitle.clientWidth) bgmTitle.classList.add("is-long");
    });
    bgmPlayer.load();
    if (shouldPlay) bgmPlayer.play().catch(() => {});
  };
  const savedPosition = Number.parseFloat(localStorage.getItem(bgmPositionKey));
  if (Number.isFinite(savedPosition)) bgmPlayer.addEventListener("loadedmetadata", () => { if (savedPosition < bgmPlayer.duration) bgmPlayer.currentTime = savedPosition; }, { once: true });
  bgmPlayer.addEventListener("timeupdate", () => localStorage.setItem(bgmPositionKey, String(bgmPlayer.currentTime)));
  bgmPlayer.addEventListener("play", updateMusicButton);
  bgmPlayer.addEventListener("pause", updateMusicButton);
  const updateSeek = () => { if (bgmSeek && Number.isFinite(bgmPlayer.duration) && bgmPlayer.duration > 0) bgmSeek.value = String((bgmPlayer.currentTime / bgmPlayer.duration) * 100); };
  bgmPlayer.addEventListener("timeupdate", updateSeek);
  bgmPlayer.addEventListener("loadedmetadata", updateSeek);
  bgmSeek?.addEventListener("input", () => { if (bgmPlayer.duration) bgmPlayer.currentTime = (Number(bgmSeek.value) / 100) * bgmPlayer.duration; });
  bgmToggle.addEventListener("click", async () => { if (bgmPlayer.paused) await bgmPlayer.play(); else bgmPlayer.pause(); updateMusicButton(); });
  bgmPrev?.addEventListener("click", () => setTrack(trackIndex - 1, true));
  bgmNext?.addEventListener("click", () => setTrack(trackIndex + 1, true));
  bgmPlayer.addEventListener("ended", () => setTrack(trackIndex + 1, true));
  setTrack(trackIndex);
  if (localStorage.getItem(bgmPlayingKey) === "true") {
    try { await bgmPlayer.play(); } catch (_) { /* Browser autoplay policy */ }
  }
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

const uploadFile = (file, storagePath, contentType, user, onProgress) => new Promise(async (resolve, reject) => {
  try {
    const token = await user.getIdToken();
    const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(config.storageBucket)}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.setRequestHeader("Content-Type", contentType);
    request.timeout = uploadIdleTimeout;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => request.status >= 200 && request.status < 300
      ? resolve()
      : reject(Object.assign(new Error("storage-http-error"), { code: `storage/http-${request.status}` }));
    request.onerror = () => reject(Object.assign(new Error("storage-network-error"), { code: "storage/network-error" }));
    request.ontimeout = () => reject(Object.assign(new Error("upload-timeout"), { code: "storage/timeout" }));
    request.send(file);
  } catch (error) { reject(error); }
});

fileInput.addEventListener("change", () => {
  const files = [...fileInput.files];
  if (!files.length) return;
  fileLabel.textContent = `${files.length} photos selected`;
  preview.textContent = "";
  files.forEach((file, index) => {
    if (!isImageFile(file) || file.size > maxFileSize) return;
    if (file.type.match(/heic|heif/i) || /\.(heic|heif)$/i.test(file.name)) {
      const item = document.createElement("div");
      item.className = "photo-preview__file";
      item.textContent = `${index + 1}. ${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)}MB`;
      preview.append(item);
      return;
    }
    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = `Selected photo ${index + 1}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("load", () => URL.revokeObjectURL(image.src), { once: true });
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
  if (files.length > maxPhotoCount) { setStatus(`사진은 한 번에 최대 ${maxPhotoCount}장까지 올릴 수 있어요.`); return; }
  if (!files.length || files.some((file) => !isImageFile(file) || file.size > maxFileSize)) { setStatus("이미지 사진만 가능하고, 사진 1장당 50MB까지예요."); return; }
  if (!name) { setStatus("이름을 입력해주세요."); return; }
  submitButton.disabled = true; submitButton.textContent = `Uploading 0/${files.length}...`; setStatus("");
  try {
    if (!window.firebase) await loadSdk();
    if (!firebase.apps.length) firebase.initializeApp(config);
    const auth = firebase.auth(); const user = auth.currentUser || (await auth.signInAnonymously()).user;
    const failedFiles = [];
    let uploadedCount = 0;
    const queue = files.map((file, index) => ({ file, index }));
    const uploadWorker = async () => {
      while (queue.length) {
        const { file, index } = queue.shift();
      submitButton.textContent = `Uploading ${index + 1}/${files.length}...`;
      try {
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `guest-photos/${user.uid}/${fileId}-${safeName}`;
        const contentType = getContentType(file);
        const uploadTask = firebase.storage().ref(storagePath).put(file, { contentType });
        const snapshot = await new Promise((resolve, reject) => {
          let timeout = window.setTimeout(() => {
            uploadTask.cancel();
            reject(Object.assign(new Error("upload-timeout"), { code: "storage/timeout" }));
          }, uploadIdleTimeout);
          let lastTransferred = 0;
          uploadTask.on("state_changed", (progress) => {
            if (progress.bytesTransferred > lastTransferred) {
              lastTransferred = progress.bytesTransferred;
              window.clearTimeout(timeout);
              timeout = window.setTimeout(() => {
                uploadTask.cancel();
                reject(Object.assign(new Error("upload-timeout"), { code: "storage/timeout" }));
              }, uploadIdleTimeout);
            }
            const percent = Math.round((progress.bytesTransferred / progress.totalBytes) * 100);
            submitButton.textContent = `Uploading ${index + 1}/${files.length} (${percent}%)...`;
          }, (error) => {
            window.clearTimeout(timeout); reject(error);
          }, () => {
            window.clearTimeout(timeout); resolve(uploadTask.snapshot);
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
      }
    };
    await uploadWorker();
    form.reset(); preview.hidden = true; fileLabel.textContent = "Choose photos";
    if (failedFiles.length) setStatus(`${uploadedCount}장 업로드 완료. 실패: ${failedFiles.join(", ")}`);
    else setStatus(`${uploadedCount}장의 사진이 잘 도착했어요.`, true);
  } catch (error) { console.error(error); setStatus(`Upload failed: ${error.code || "please try again"}`); }
  finally { submitButton.disabled = false; submitButton.textContent = "Leave photos"; }
});
