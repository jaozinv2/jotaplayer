const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const songListElement = document.getElementById('song-list');
const audioPlayer = document.getElementById('audio-player');

const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const coverArt = document.getElementById('cover-art');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const seekBar = document.getElementById('seek-bar');
const volumeBar = document.getElementById('volume-bar');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const glassContainer = document.querySelector('.glass-container');

const btnThemeToggle = document.getElementById('btn-theme-toggle');
const wallpaperInput = document.getElementById('wallpaper-input');
const btnResetWallpaper = document.getElementById('btn-reset-wallpaper');

let songs = [];
let currentSongIndex = -1;

// --- LISTA DE MÚSICAS PREDEFINIDAS NA PASTA SONGS ---
// Substitua pelos nomes exatos dos seus arquivos .mp3 e títulos/artistas reais
const predefinedSongs = [
  { title: "Nome da Música 1", artist: "Artista 1", file: "songs/musica1.mp3" },
  { title: "Nome da Música 2", artist: "Artista 2", file: "songs/musica2.mp3" }
];

// --- INICIALIZAÇÃO AO ABRIR A PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Carregar Tema Salvo
  const savedTheme = localStorage.getItem('app-theme');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    btnThemeToggle.textContent = '🌙 Mudar para Escuro';
  }

  // 2. Carregar Wallpaper Salvo
  const savedWallpaper = localStorage.getItem('app-wallpaper');
  if (savedWallpaper) {
    document.body.style.backgroundImage = `url('${savedWallpaper}')`;
  }

  // 3. Carregar as músicas predefinidas automaticamente
  loadPredefinedSongs();
});

function loadPredefinedSongs() {
  songListElement.innerHTML = '';
  songs = [];

  if (predefinedSongs.length === 0) {
    songListElement.innerHTML = '<li class="empty-msg">Nenhuma música predefinida.</li>';
    return;
  }

  predefinedSongs.forEach((item, index) => {
    const songObj = {
      title: item.title,
      artist: item.artist,
      pictureUrl: null,
      url: item.file
    };
    songs.push(songObj);

    const li = document.createElement('li');
    li.className = 'song-item';
    li.innerHTML = `
      <div class="song-info">
        <span class="title">${item.title}</span>
        <span class="artist">${item.artist}</span>
      </div>
    `;

    li.addEventListener('click', () => {
      loadAndPlaySong(index);
    });

    songListElement.appendChild(li);
  });
}

// --- SISTEMA DE ABAS ---
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- CONFIGURAÇÕES: TEMA & WALLPAPER ---
btnThemeToggle.addEventListener('click', () => {
  if (document.body.classList.contains('dark-theme')) {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    btnThemeToggle.textContent = '🌙 Mudar para Escuro';
    localStorage.setItem('app-theme', 'light');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    btnThemeToggle.textContent = '☀️ Mudar para Claro';
    localStorage.setItem('app-theme', 'dark');
  }
});

wallpaperInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64Image = e.target.result;
      document.body.style.backgroundImage = `url('${base64Image}')`;
      try {
        localStorage.setItem('app-wallpaper', base64Image);
      } catch (err) {
        console.warn('Imagem muito grande.');
      }
    };
    reader.readAsDataURL(file);
  }
});

btnResetWallpaper.addEventListener('click', () => {
  document.body.style.backgroundImage = "url('background.jpg')";
  localStorage.removeItem('app-wallpaper');
});

// --- CONTROLES DE ÁUDIO ---
function loadAndPlaySong(index) {
  if (index < 0 || index >= songs.length) return;

  currentSongIndex = index;
  const song = songs[index];

  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;

  coverArt.style.backgroundImage = 'none';
  coverArt.innerHTML = '<span class="cover-placeholder">🎵</span>';

  const items = songListElement.querySelectorAll('.song-item');
  items.forEach((item, i) => {
    item.classList.toggle('active', i === index);
  });

  audioPlayer.src = song.url;
  audioPlayer.play();
  btnPlay.textContent = '⏸';
  glassContainer.classList.add('playing');
}

btnPlay.addEventListener('click', () => {
  if (currentSongIndex === -1 && songs.length > 0) {
    loadAndPlaySong(0);
    return;
  }

  if (audioPlayer.paused) {
    audioPlayer.play();
    btnPlay.textContent = '⏸';
    glassContainer.classList.add('playing');
  } else {
    audioPlayer.pause();
    btnPlay.textContent = '▶';
    glassContainer.classList.remove('playing');
  }
});

btnNext.addEventListener('click', () => {
  if (songs.length === 0) return;
  const nextIndex = (currentSongIndex + 1) % songs.length;
  loadAndPlaySong(nextIndex);
});

btnPrev.addEventListener('click', () => {
  if (songs.length ===0) return;
  const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  loadAndPlaySong(prevIndex);
});

audioPlayer.addEventListener('timeupdate', () => {
  if (!isNaN(audioPlayer.duration)) {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    seekBar.value = progress;

    currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
    durationTimeEl.textContent = formatTime(audioPlayer.duration);
  }
});

seekBar.addEventListener('input', () => {
  if (!isNaN(audioPlayer.duration)) {
    audioPlayer.currentTime = (seekBar.value / 100) * audioPlayer.duration;
  }
});

volumeBar.addEventListener('input', () => {
  audioPlayer.volume = volumeBar.value / 100;
});

audioPlayer.addEventListener('ended', () => {
  btnNext.click();
});

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}
