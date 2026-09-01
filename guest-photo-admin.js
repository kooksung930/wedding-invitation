const firebaseConfig = {
  apiKey: "AIzaSyDaGOxomY9IWP6kqAvth7bm9cGrw3QwkpM",
  authDomain: "wedding-e262a.firebaseapp.com",
  projectId: "wedding-e262a",
  storageBucket: "wedding-e262a.firebasestorage.app",
  messagingSenderId: "16876005547",
  appId: "1:16876005547:web:02684611d089df33daefee",
};
const adminEmail = "ks_gy@wedding-e262a.firebaseapp.com";
const sdkUrls = [
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore-compat.js",
];
const status = document.getElementById("admin-status");
const loginPanel = document.getElementById("login-panel");
const photoPanel = document.getElementById("photo-panel");
const list = document.getElementById("admin-list");

const setStatus = (message) => { status.textContent = message; };
const loadSdk = () => Promise.all(sdkUrls.map((src) => new Promise((resolve, reject) => {
  const script = document.createElement("script"); script.src = src; script.onload = resolve;
  script.onerror = () => reject(new Error("Firebase SDK load failed")); document.head.append(script);
})));
const getEmail = () => `${document.getElementById("admin-id").value.trim()}@wedding-e262a.firebaseapp.com`;

const formatDate = (timestamp) => timestamp?.toDate ? timestamp.toDate().toLocaleString("ko-KR") : "방금 전";
const renderPhotos = (docs) => {
  document.getElementById("photo-count").textContent = `총 ${docs.length}장 · pending 사진을 승인해주세요.`;
  list.textContent = "";
  if (!docs.length) { list.textContent = "아직 올라온 사진이 없습니다."; return; }
  docs.forEach((doc) => {
    const data = doc.data(); const article = document.createElement("article");
    article.className = `admin-photo ${data.status === "approved" ? "is-approved" : ""}`;
    article.innerHTML = `<img src="${data.imageUrl}" alt="${data.name}님이 올린 사진"><div class="admin-photo__body"><p class="admin-photo__meta">${data.name} · ${formatDate(data.createdAt)}</p><p class="admin-photo__message">${data.message || "메시지 없음"}</p><button class="admin-photo__button" type="button">${data.status === "approved" ? "승인됨" : "approved 처리하기"}</button></div>`;
    const button = article.querySelector("button");
    button.disabled = data.status === "approved";
    button.addEventListener("click", async () => {
      button.disabled = true; button.textContent = "처리 중...";
      try { await firebase.firestore().collection("guestPhotos").doc(doc.id).update({ status: "approved" }); button.textContent = "승인됨"; article.classList.add("is-approved"); }
      catch (error) { setStatus(`승인 실패: ${error.code || "다시 시도해주세요"}`); button.disabled = false; button.textContent = "approved 처리하기"; }
    });
    list.append(article);
  });
};

const openAdmin = async () => {
  const user = firebase.auth().currentUser;
  if (!user || user.email !== adminEmail) { setStatus("관리자 계정만 사용할 수 있어요."); return; }
  loginPanel.classList.add("hidden"); photoPanel.classList.remove("hidden");
  firebase.firestore().collection("guestPhotos").orderBy("createdAt", "desc").onSnapshot(renderPhotos, (error) => setStatus(`목록을 불러오지 못했어요: ${error.code}`));
};

const init = async () => {
  try {
    await loadSdk(); firebase.initializeApp(firebaseConfig);
    document.getElementById("login-button").addEventListener("click", async () => {
      try { await firebase.auth().signInWithEmailAndPassword(getEmail(), document.getElementById("admin-password").value); await openAdmin(); }
      catch (error) { setStatus(`로그인 실패: ${error.code}`); }
    });
    document.getElementById("signup-button").addEventListener("click", async () => {
      try { await firebase.auth().createUserWithEmailAndPassword(getEmail(), document.getElementById("admin-password").value); await openAdmin(); }
      catch (error) { setStatus(`계정 생성 실패: ${error.code}`); }
    });
    document.getElementById("logout-button").addEventListener("click", () => firebase.auth().signOut().then(() => location.reload()));
  } catch (error) { setStatus("Firebase를 불러오지 못했어요."); }
};
init();
