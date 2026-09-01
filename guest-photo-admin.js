const firebaseConfig = {
  apiKey: "AIzaSyDaGOxomY9IWP6kqAvth7bm9cGrw3QwkpM",
  authDomain: "wedding-e262a.firebaseapp.com",
  projectId: "wedding-e262a",
  storageBucket: "wedding-e262a.firebasestorage.app",
  messagingSenderId: "16876005547",
  appId: "1:16876005547:web:02684611d089df33daefee",
};
const adminEmail = "ks_gy@wedding-e262a.firebaseapp.com";
const pageSize = 12;
const sdkUrls = [
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore-compat.js",
];
const status = document.getElementById("admin-status");
const loginPanel = document.getElementById("login-panel");
const photoPanel = document.getElementById("photo-panel");
const list = document.getElementById("admin-list");
const pageNumber = document.getElementById("page-number");
const previousButton = document.getElementById("prev-page");
const nextButton = document.getElementById("next-page");
let page = 1;
let pageCursors = [null];

const setStatus = (message) => { status.textContent = message; };
const loadSdk = () => Promise.all(sdkUrls.map((src) => new Promise((resolve, reject) => {
  const script = document.createElement("script"); script.src = src; script.onload = resolve;
  script.onerror = () => reject(new Error("Firebase SDK load failed")); document.head.append(script);
})));
const getEmail = () => `${document.getElementById("admin-id").value.trim()}@wedding-e262a.firebaseapp.com`;
const formatDate = (timestamp) => timestamp?.toDate ? timestamp.toDate().toLocaleString("ko-KR") : "방금 전";

const makePhotoCard = (doc) => {
  const data = doc.data();
  const article = document.createElement("article");
  article.className = `admin-photo ${data.status === "approved" ? "is-approved" : ""} ${data.status === "declined" ? "is-declined" : ""}`;
  const image = document.createElement("img"); image.src = data.imageUrl; image.alt = `${data.name}님이 올린 사진`;
  const body = document.createElement("div"); body.className = "admin-photo__body";
  const meta = document.createElement("p"); meta.className = "admin-photo__meta"; meta.textContent = `${data.name} · ${formatDate(data.createdAt)} · ${data.status}`;
  const message = document.createElement("p"); message.className = "admin-photo__message"; message.textContent = data.message || "메시지 없음";
  const actions = document.createElement("div"); actions.className = "admin-photo__actions";
  const approve = document.createElement("button"); approve.className = "admin-photo__button approve"; approve.type = "button"; approve.textContent = data.status === "approved" ? "승인됨" : "승인";
  const decline = document.createElement("button"); decline.className = "admin-photo__button"; decline.type = "button"; decline.textContent = data.status === "declined" ? "거절됨" : "거절";
  const updateStatus = async (nextStatus, button) => {
    button.disabled = true; button.textContent = "처리 중...";
    try { await firebase.firestore().collection("guestPhotos").doc(doc.id).update({ status: nextStatus }); await loadPage(page); }
    catch (error) { setStatus(`상태 변경 실패: ${error.code || "다시 시도해주세요"}`); button.disabled = false; }
  };
  approve.disabled = data.status === "approved"; decline.disabled = data.status === "declined";
  approve.addEventListener("click", () => updateStatus("approved", approve));
  decline.addEventListener("click", () => updateStatus("declined", decline));
  actions.append(approve, decline); body.append(meta, message, actions); article.append(image, body); return article;
};

const loadPage = async (targetPage) => {
  const query = firebase.firestore().collection("guestPhotos").orderBy("createdAt", "desc").limit(pageSize);
  const snapshot = await (pageCursors[targetPage - 1] ? query.startAfter(pageCursors[targetPage - 1]).get() : query.get());
  page = targetPage; pageCursors[page] = snapshot.docs[snapshot.docs.length - 1] || pageCursors[page];
  list.textContent = "";
  snapshot.docs.forEach((doc) => list.append(makePhotoCard(doc)));
  document.getElementById("photo-count").textContent = `현재 ${snapshot.docs.length}장 · 페이지당 ${pageSize}장 표시`;
  pageNumber.textContent = `${page} / ${snapshot.docs.length === pageSize ? page + 1 : page}`;
  previousButton.disabled = page === 1; nextButton.disabled = snapshot.docs.length < pageSize;
  if (!snapshot.docs.length) list.textContent = "아직 올라온 사진이 없습니다.";
};

const openAdmin = async () => {
  if (firebase.auth().currentUser?.email !== adminEmail) { setStatus("관리자 계정만 사용할 수 있어요."); return; }
  loginPanel.classList.add("hidden"); photoPanel.classList.remove("hidden");
  try { await loadPage(1); } catch (error) { setStatus(`목록을 불러오지 못했어요: ${error.code || "규칙을 확인해주세요"}`); }
};

const init = async () => {
  try {
    await loadSdk(); firebase.initializeApp(firebaseConfig);
    document.getElementById("login-button").addEventListener("click", async () => { try { await firebase.auth().signInWithEmailAndPassword(getEmail(), document.getElementById("admin-password").value); await openAdmin(); } catch (error) { setStatus(`로그인 실패: ${error.code}`); } });
    document.getElementById("signup-button").addEventListener("click", async () => { try { await firebase.auth().createUserWithEmailAndPassword(getEmail(), document.getElementById("admin-password").value); await openAdmin(); } catch (error) { setStatus(`계정 생성 실패: ${error.code}`); } });
    document.getElementById("logout-button").addEventListener("click", () => firebase.auth().signOut().then(() => location.reload()));
    previousButton.addEventListener("click", () => loadPage(page - 1));
    nextButton.addEventListener("click", () => loadPage(page + 1));
  } catch (_) { setStatus("Firebase를 불러오지 못했어요."); }
};
init();
