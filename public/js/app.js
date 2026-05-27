const form = document.getElementById('downloadForm');
const input = document.getElementById('urlInput');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnIcon = document.getElementById('btnIcon');
const btnLoader = document.getElementById('btnLoader');
const errorMessage = document.getElementById('errorMessage');

const featuresGrid = document.getElementById('featuresGrid');
const supportTicker = document.getElementById('supportTicker');
const resultContainer = document.getElementById('resultContainer');
const aboutModal = document.getElementById('aboutModal');

const resultImage = document.getElementById('resultImage');
const titleEl = resultContainer.querySelector('h2');
const creatorEl = resultContainer.querySelector('.ph-user')?.parentElement;
const statEls = resultContainer.querySelectorAll('.grid.grid-cols-3 .font-bold.text-sm');
const videoBtn = resultContainer.querySelectorAll('button')[1];
const audioBtn = resultContainer.querySelectorAll('button')[2];

function pushToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `fixed top-20 right-4 z-[120] border-2 px-4 py-3 font-bold uppercase text-xs shadow-brutal ${isError ? 'bg-red-700 text-white border-white' : 'bg-volt text-black border-black'}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

window.toggleAboutModal = function toggleAboutModal() {
  if (aboutModal.classList.contains('hidden')) {
    aboutModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } else {
    aboutModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }
}

aboutModal.addEventListener('click', (e) => {
  if (e.target === aboutModal) window.toggleAboutModal();
});

window.pasteFromClipboard = async function pasteFromClipboard() {
  try {
    input.value = await navigator.clipboard.readText();
    input.focus();
    pushToast('URL berhasil di-paste');
  } catch {
    pushToast('Clipboard ditolak browser', true);
  }
}

function setLoadingState(isLoading) {
  input.disabled = isLoading;
  submitBtn.disabled = isLoading;
  btnText.classList.toggle('hidden', isLoading);
  btnIcon.classList.toggle('hidden', isLoading);
  btnLoader.classList.toggle('hidden', !isLoading);
  if (isLoading) {
    errorMessage.classList.add('hidden');
    featuresGrid.classList.add('opacity-0');
    supportTicker.classList.add('opacity-0');
    setTimeout(() => {
      featuresGrid.classList.add('hidden');
      supportTicker.classList.add('hidden');
    }, 300);
  }
}

function showResult(data) {
  titleEl.textContent = data.title || 'Media berhasil diproses';
  creatorEl.innerHTML = `<i class="ph-bold ph-user"></i> ${data.author || '@unknown_creator'}`;
  statEls[0].textContent = String(data.duration || '-');
  statEls[1].textContent = data.platform || '-';
  statEls[2].textContent = data.type || '-';
  if (data.thumbnail) resultImage.src = data.thumbnail;

  videoBtn.onclick = () => window.open(data.videoUrl, '_blank', 'noopener,noreferrer');
  audioBtn.onclick = () => window.open(data.audioUrl || data.videoUrl, '_blank', 'noopener,noreferrer');

  resultContainer.classList.remove('hidden');
}

window.resetUI = function resetUI() {
  input.value = '';
  resultContainer.classList.add('hidden');
  featuresGrid.classList.remove('hidden');
  supportTicker.classList.remove('hidden');
  setTimeout(() => {
    featuresGrid.classList.remove('opacity-0');
    supportTicker.classList.remove('opacity-0');
  }, 50);
};

window.handleDownload = async function handleDownload(e) {
  e.preventDefault();
  const url = input.value.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    errorMessage.classList.remove('hidden');
    pushToast('URL tidak valid', true);
    return;
  }
  setLoadingState(true);
  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error?.message || data.message || 'Gagal memproses');
    showResult(data.data);
    pushToast('Ekstraksi sukses');
  } catch (err) {
    errorMessage.classList.remove('hidden');
    pushToast(err.message || 'Terjadi kesalahan', true);
  } finally {
    setLoadingState(false);
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    await navigator.serviceWorker.register('/sw.js');
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  pushToast('App siap di-install');
});
