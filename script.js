// DOM элементы
const audio = document.getElementById('audioPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');
const currentTitle = document.getElementById('currentTitle');
const currentArtist = document.getElementById('currentArtist');
const playlistContainer = document.getElementById('playlistContainer');

let tracks = [];          // { name, artist, src }
let currentIndex = 0;
let isPlaying = false;

// --- загрузка music.json ---
async function fetchTracks() {
    try {
        const response = await fetch('music.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.tracks || !data.tracks.length) throw new Error('Нет треков');
        tracks = data.tracks;
        renderPlaylist();
        loadTrack(0);
    } catch (err) {
        console.error(err);
        playlistContainer.innerHTML = `<div class="loading-state">⚠️ Ошибка загрузки music.json. Проверьте файл.</div>`;
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
        item.setAttribute('aria-label', `Трек ${track.name} ${track.artist || ''}`);
        
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
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                currentIndex = idx;
                loadTrack(currentIndex);
                playAudio();
            }
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
    updateProgressBarAccessibility();
}

// --- обновить активную карточку и иконки ---
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
            updateProgressBarAccessibility();
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

function nextTrack() {
    if (tracks.length === 0) return;
    currentIndex = (currentIndex + 1) % tracks.length;
    loadTrack(currentIndex);
    if (isPlaying) playAudio();
}

function prevTrack() {
    if (tracks.length === 0) return;
    currentIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(currentIndex);
    if (isPlaying) playAudio();
}

// --- обновление времени и прогресса ---
audio.addEventListener('loadedmetadata', () => {
    const dur = audio.duration;
    if (!isNaN(dur)) {
        durationSpan.textContent = formatTime(dur);
        updateProgressBarAccessibility();
    }
});

audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime;
    const dur = audio.duration;
    if (!isNaN(dur) && dur > 0) {
        const percent = (cur / dur) * 100;
        progressFill.style.width = `${percent}%`;
        currentTimeSpan.textContent = formatTime(cur);
        if (progressBar) {
            progressBar.setAttribute('aria-valuenow', Math.round(percent));
        }
    }
});

audio.addEventListener('ended', () => {
    nextTrack();
});

// --- клик по прогресс-бару ---
progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audio.duration) {
        audio.currentTime = percent * audio.duration;
    }
});

// --- громкость ---
volumeSlider.addEventListener('input', (e) => {
    audio.volume = parseFloat(e.target.value);
});

// --- клавиатурные шорткаты (пробел, стрелки) ---
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
    } else if (e.code === 'ArrowLeft') {
        prevTrack();
    } else if (e.code === 'ArrowRight') {
        nextTrack();
    }
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

function updateProgressBarAccessibility() {
    if (progressBar) {
        progressBar.setAttribute('aria-label', 'Прогресс трека');
        progressBar.setAttribute('aria-valuemin', '0');
        progressBar.setAttribute('aria-valuemax', '100');
    }
}

// --- обработчики кнопок ---
playPauseBtn.addEventListener('click', togglePlayPause);
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);

// --- старт ---
fetchTracks();
