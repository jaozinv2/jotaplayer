const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const folderInput = document.getElementById('folder-input');
const songListElement = document.getElementById('song-list');

// Dois players para permitir crossfade real entre as faixas
const audio1 = document.getElementById('audio-player-1');
const audio2 = document.getElementById('audio-player-2');
let activeAudio = audio1;
let inactiveAudio = audio2;

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

// Elementos de Configuração e Crossfade
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const wallpaperInput = document.getElementById('wallpaper-input');
const btnResetWallpaper = document.getElementById('btn-reset-wallpaper');
const crossfadeRange = document.getElementById('crossfade-range');
const crossfadeValue = document.getElementById('crossfade-value');

const jsMediatags = window.jsmediatags;
let songs = [];
let currentSongIndex = -1;
let crossfadeDuration = 0; // em segundos

// --- PERSISTÊNCIA (LOCALSTORAGE) ---

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('app-theme');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    btnThemeToggle.textContent = '🌙 Mudar para Escuro';
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    btnThemeToggle.textContent = '☀️ Mudar para Claro';
  }

  const savedWallpaper = localStorage.getItem('app-wallpaper');
  if (savedWallpaper) {
    document.body.style.backgroundImage = `url('${savedWallpaper}')`;
  }

  const savedCrossfade = localStorage.getItem('app-crossfade');
  if (savedCrossfade !== null) {
    crossfadeDuration = parseInt(savedCrossfade, 10);
    crossfadeRange.value = crossfadeDuration;
    crossfadeValue.textContent = `${crossfadeDuration}s`;
  }
});

// --- SISTEMA DE ABAS ---
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- CONFIGURAÇÕES ---
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
        console.warn('Imagem muito grande para salvar no localStorage.');
      }
    };
    reader.readAsDataURL(file);
  }
});

btnResetWallpaper.addEventListener('click', () => {
  document.body.style.backgroundImage = 'none';
  localStorage.removeItem('app-wallpaper');
});

crossfadeRange.addEventListener('input', () => {
  crossfadeDuration = parseInt(crossfadeRange.value, 10);
  crossfadeValue.textContent = `${crossfadeDuration}s`;
  localStorage.setItem('app-crossfade', crossfadeDuration);
});

// --- CARREGAR MÚSICAS ---
folderInput.addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  const audioFiles = files.filter(file => file.type.startsWith('audio/'));

  if (audioFiles.length === 0) {
    songListElement.innerHTML = '<li class="empty-msg">Nenhum áudio encontrado.</li>';
    return;
  }

  songListElement.innerHTML = '';
  songs = [];

  audioFiles.forEach((file) => {
    jsMediatags.read(file, {
      onSuccess: function(tag) {
        const title = tag.tags.title || file.name.replace(/\.[^/.]+$/, "");
        const artist = tag.tags.artist || "Artista Desconhecido";
        
        let pictureUrl = null;
        if (tag.tags.picture) {
          const { data, format } = tag.tags.picture;
          let base64String = "";
          for (let i = 0; i < data.length; i++) {
            base64String += String.fromCharCode(data[i]);
          }
          pictureUrl = `data:${format};base64,${btoa(base64String)}`;
        }

        addSongToList(file, title, artist, pictureUrl);
      },
      onError: function() {
        const title = file.name.replace(/\.[^/.]+$/, "");
        addSongToList(file, title, "Artista Desconhecido", null);
      }
    });
  });
});

function addSongToList(file, title, artist, pictureUrl) {
  const index = songs.length;
  const songObj = { file, title, artist, pictureUrl, url: URL.createObjectURL(file) };
  songs.push(songObj);

  const li = document.createElement('li');
  li.className = 'song-item';
  li.innerHTML = `
    <div class="song-info">
      <span class="title">${title}</span>
      <span class="artist">${artist}</span>
    </div>
  `;

  li.addEventListener('click', () => {
    loadAndPlaySong(index);
  });

  songListElement.appendChild(li);
}

// --- MOTOR DE CROSSFADE E CONTROLES DE ÁUDIO ---
function loadAndPlaySong(index) {
  if (index < 0 || index >= songs.length) return;

  currentSongIndex = index;
  const song = songs[index];

  playerTitle.textContent = song.title;
  playerArtist.textContent = song.artist;

  if (song.pictureUrl) {
    coverArt.style.backgroundImage = `url(${song.pictureUrl})`;
    coverArt.innerHTML = '';
  } else {
    coverArt.style.backgroundImage = 'none';
    coverArt.innerHTML = '<span class="cover-placeholder">🎵</span>';
  }

  const items = songListElement.querySelectorAll('.song-item');
  items.forEach((item, i) => {
    item.classList.toggle('active', i === index);
  });

  const targetVolume = volumeBar.value / 100;

  if (crossfadeDuration > 0 && !activeAudio.paused) {
    // Realiza a transição cruzada (Crossfade) trocando os players ativos
    const outgoingAudio = activeAudio;
    const incomingAudio = inactiveAudio;

    incomingAudio.src = song.url;
    incomingAudio.volume = 0;
    incomingAudio.play();

    let step = 0;
    const steps = 20;
    const intervalTime = (crossfadeDuration * 1000) / steps;
    const volumeStep = targetVolume / steps;

    const fadeInterval = setInterval(() => {
      step++;
      if (outgoingAudio.volume > volumeStep) {
        outgoingAudio.volume -= volumeStep;
      } else {
        outgoingAudio.volume = 0;
      }

      if (incomingAudio.volume < targetVolume - volumeStep) {
        incomingAudio.volume += volumeStep;
      } else {
        incomingAudio.volume = targetVolume;
      }

      if (step >= steps) {
        clearInterval(fadeInterval);
        outgoingAudio.pause();
        outgoingAudio.currentTime = 0;
      }
    }, intervalTime);

    activeAudio = incomingAudio;
    inactiveAudio = outgoingAudio;
  } else {
    // Sem crossfade ou player parado
    activeAudio.pause();
    activeAudio.currentTime = 0;
    
    activeAudio.src = song.url;
    activeAudio.volume = targetVolume;
    activeAudio.play();
  }

  btnPlay.textContent = '⏸';
  glassContainer.classList.add('playing');
}

btnPlay.addEventListener('click', () => {
  if (currentSongIndex === -1 && songs.length > 0) {
    loadAndPlaySong(0);
    return;
  }

  if (activeAudio.paused) {
    activeAudio.play();
    btnPlay.textContent = '⏸';
    glassContainer.classList.add('playing');
  } else {
    activeAudio.pause();
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
  if (songs.length === 0) return;
  const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  loadAndPlaySong(prevIndex);
});

setInterval(() => {
  if (!activeAudio.paused && !isNaN(activeAudio.duration)) {
    const progress = (activeAudio.currentTime / activeAudio.duration) * 100;
    seekBar.value = progress;

    currentTimeEl.textContent = formatTime(activeAudio.currentTime);
    durationTimeEl.textContent = formatTime(activeAudio.duration);
  }
}, 250);

seekBar.addEventListener('input', () => {
  if (!isNaN(activeAudio.duration)) {
    activeAudio.currentTime = (seekBar.value / 100) * activeAudio.duration;
  }
});

volumeBar.addEventListener('input', () => {
  const vol = volumeBar.value / 100;
  activeAudio.volume = vol;
  inactiveAudio.volume = vol;
});

audio1.addEventListener('ended', () => { if(activeAudio === audio1) btnNext.click(); });
audio2.addEventListener('ended', () => { if(activeAudio === audio2) btnNext.click(); });

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}
