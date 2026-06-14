// DOM элементы
const audio = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');
const currentTitle = document.getElementById('currentTitle');
const currentArtist = document.getElementById('currentArtist');
const playlistContainer = document.getElementById('playlistContainer');

let originalTracks = [];     // неизменный список из music.json
let tracks = [];             // текущий (может быть перемешан)
let currentIndex = 0;
let isPlaying = false;

// Состояния
let shuffleOn = false;
let repeatMode = 'none';     // 'none', 'one', 'all'

// --- загрузка music.json ---
async function fetchTracks() {
    try {
        const response = await fetch('music.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.tracks || !data.tracks.length) throw new Error('Нет треков');
        originalTracks = data.tracks;
        resetPlaylist();      // инициализация треков (без перемешивания)
        renderPlaylist();
        loadTrack(0);
    } catch (err) {
        console.error(err);
        playlistContainer.innerHTML = `<div class="loading-state">⚠️ Ошибка загрузки music.json.</div>`;
    }
}

// Сброс/обновление плейлиста (при изменении shuffle или вручную)
function resetPlaylist() {
    if (shuffleOn) {
        // перемешиваем копию
        tracks = [...originalTracks];
        for (let i = tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
        }
    } else {
        tracks = [...originalTracks];
    }
    // Если текущий трек был из старого списка, пытаемся найти его же в новом
    const currentSrc = tracks[currentIndex]?.src;
    if (currentSrc) {
        const newIndex = tracks.findIndex(t => t.src === currentSrc);
        if (newIndex !== -1) currentIndex = newIndex;
        else currentIndex = 0;
    } else {
        currentIndex = 0;
    }
}

// --- рендер списка треков (карточки) ---
function renderPlaylist() {
    playlistContainer.innerHTML = '';
    tracks.forEach((track, idx) => {
        const item = document.createElement('div');
        item.className = 'track-item';
        if (idx === currentIndex) item.classList.add('active');
        item.setAttribute('role', 'listitem');
        item.setAttribute('tabindex', '0');
        
        item.innerHTML = `
            <div class="track-info">
                <div class="track-name">${escapeHtml(track.name)}</div>
                <div class="track-artist-name">${escapeHtml(track.artist || '—')}</div>
            </div>
            <div class="track-status" aria-hidden="true">${idx === currentIndex && isPlaying ? '🔊' : '🎵'}</div>
        `;
        
        item.addEventListener('click', () => {
            currentIndex = idx;
            loadTrack(currentIndex);
            playAudio();
        });
        playlistContainer.appendChild(item);
    });
}

// --- загрузка трека по индексу ---
function loadTrack(index) {
    if (!tracks[index]) return;
    const track = tracks[index];
    audio.src = track.src;
    audio.load();
    currentTitle.textContent = track.name;
    currentArtist.textContent = track.artist || '—';
    updateActiveCard();
    
    if (isPlaying) {
        audio.play().catch(e => console.warn('Play error', e));
    } else {
        playPauseBtn.textContent = '▶';
        updatePlayingIcon();
    }
}

// --- обновить активную карточку ---
function updateActiveCard() {
    const items = document.querySelectorAll('.track-item');
    items.forEach((item, idx) => {
        if (idx === currentIndex) {
            item.classList.add('active');
            const statusSpan = item.querySelector('.track-status');
            if (statusSpan) statusSpan.textContent = isPlaying ? '🔊' : '🎵';
        } else {
            item.classList.remove('active');
            const statusSpan = item.querySelector('.track-status');
            if (statusSpan) statusSpan.textContent = '🎵';
        }
    });
}

function updatePlayingIcon() {
    const items = document.querySelectorAll('.track-item');
    items.forEach((item, idx) => {
        if (idx === currentIndex) {
            const statusSpan = item.querySelector('.track-status');
            if (statusSpan) statusSpan.textContent = isPlaying ? '🔊' : '🎵';
        }
    });
}

// --- управление воспроизведением ---
function playAudio() {
    audio.play()
        .then(() => {
            isPlaying = true;
            playPauseBtn.textContent = '⏸';
            updatePlayingIcon();
        })
        .catch(err => console.log('автовоспроизведение заблокировано', err));
}

function pauseAudio() {
    audio.pause();
    isPlaying = false;
    playPauseBtn.textContent = '▶';
    updatePlayingIcon();
}

function togglePlayPause() {
    if (isPlaying) pauseAudio();
    else playAudio();
}

// --- Следующий трек с учётом repeat ---
function nextTrack() {
    if (tracks.length === 0) return;
    
    if (repeatMode === 'one') {
        // повтор текущего трека
        audio.currentTime = 0;
        audio.play();
        return;
    }
    
    let newIndex = currentIndex + 1;
    if (newIndex >= tracks.length) {
        if (repeatMode === 'all') {
            newIndex = 0;
        } else {
            // ничего не делаем, остаёмся на последнем, но не переключаем
            if (isPlaying) pauseAudio();
            return;
        }
    }
    currentIndex = newIndex;
    loadTrack(currentIndex);
    if (isPlaying) playAudio();
}

// --- Предыдущий трек (без зацикливания, просто назад) ---
function prevTrack() {
    if (tracks.length === 0) return;
    let newIndex = currentIndex - 1;
    if (newIndex < 0) {
        if (repeatMode === 'all') newIndex = tracks.length - 1;
        else newIndex = 0;
    }
    currentIndex = newIndex;
    loadTrack(currentIndex);
    if (isPlaying) playAudio();
}

// --- Shuffle ---
function toggleShuffle() {
    shuffleOn = !shuffleOn;
    // запоминаем текущий трек, чтобы потом его найти
    const currentSrc = tracks[currentIndex]?.src;
    resetPlaylist();               // перемешиваем или восстанавливаем
    // пытаемся найти текущий трек в новом списке
    if (currentSrc) {
        const newIndex = tracks.findIndex(t => t.src === currentSrc);
        if (newIndex !== -1) currentIndex = newIndex;
        else currentIndex = 0;
    } else {
        currentIndex = 0;
    }
    renderPlaylist();
    loadTrack(currentIndex);
    if (isPlaying) playAudio();
    updateShuffleButtonUI();
}

function updateShuffleButtonUI() {
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('active', shuffleOn);
    }
}

// --- Repeat ---
function toggleRepeat() {
    if (repeatMode === 'none') {
        repeatMode = 'all';
    } else if (repeatMode === 'all') {
        repeatMode = 'one';
    } else {
        repeatMode = 'none';
    }
    updateRepeatButtonUI();
}

function updateRepeatButtonUI() {
    if (!repeatBtn) return;
    repeatBtn.classList.remove('active', 'repeat-one');
    if (repeatMode === 'all') {
        repeatBtn.classList.add('active');
        repeatBtn.textContent = '🔁';
    } else if (repeatMode === 'one') {
        repeatBtn.classList.add('repeat-one');
        repeatBtn.textContent = '🔂';
    } else {
        repeatBtn.textContent = '🔁';
        repeatBtn.classList.remove('active', 'repeat-one');
    }
}

// --- обновление времени и прогресса (без изменений) ---
audio.addEventListener('loadedmetadata', () => {
    const dur = audio.duration;
    if (!isNaN(dur)) {
        durationSpan.textContent = formatTime(dur);
    }
});

audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime;
    const dur = audio.duration;
    if (!isNaN(dur) && dur > 0) {
        const percent = (cur / dur) * 100;
        progressFill.style.width = `${percent}%`;
        currentTimeSpan.textContent = formatTime(cur);
    }
});

audio.addEventListener('ended', () => {
    nextTrack();
});

progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audio.duration) {
        audio.currentTime = percent * audio.duration;
    }
});

volumeSlider.addEventListener('input', (e) => {
    audio.volume = parseFloat(e.target.value);
});

// --- вспомогательные функции ---
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// --- обработчики кнопок ---
playPauseBtn.addEventListener('click', togglePlayPause);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);
if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);
if (repeatBtn) repeatBtn.addEventListener('click', toggleRepeat);

// --- инициализация UI ---
updateShuffleButtonUI();
updateRepeatButtonUI();

// --- старт ---
fetchTracks();
