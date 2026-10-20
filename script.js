const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const folderInput = document.getElementById('folder-input');
const searchInput = document.getElementById('search-input');
const artistSelect = document.getElementById('artist-select');
const songListElement = document.getElementById('song-list');
const audioPlayer = document.getElementById('audio-player');

const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const coverArt = document.getElementById('cover-art');
const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');
const btnLoop = document.getElementById('btn-loop');
const btnMute = document.getElementById('btn-mute');
const btnFilterFav = document.getElementById('btn-filter-fav');
const btnExportFavs = document.getElementById('btn-export-favs');
const libraryStats = document.getElementById('library-stats');
const seekBar = document.getElementById('seek-bar');
const volumeBar = document.getElementById('volume-bar');
const speedSelect = document.getElementById('speed-select');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const glassContainer = document.querySelector('.glass-container');

// Elementos da Fila de Espera
const queueSection = document.getElementById('queue-section');
const queueListElement = document.getElementById('queue-list');
const queueCountEl = document.getElementById('queue-count');
const btnClearQueue = document.getElementById('btn-clear-queue');

const btnThemeToggle = document.getElementById('btn-theme-toggle');
const wallpaperInput = document.getElementById('wallpaper-input');
const btnResetWallpaper = document.getElementById('btn-reset-wallpaper');

const jsMediatags = window.jsmediatags;
let songs = [];
let queue = []; 
let currentSongIndex = -1;

let isShuffle = false;
let loopMode = 0; // 0: Off, 1: Loop All, 2: Loop One
let isFavFilterActive = false;
let isMuted = false;
let previousVolume = 1;

// Carregar preferências
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

  const savedSpeed = localStorage.getItem('app-speed');
  if (savedSpeed) {
    speedSelect.value = savedSpeed;
    audioPlayer.playbackRate = parseFloat(savedSpeed);
  }

  setupMediaSession();
});

// Suporte à Media Session API (Notificações e Fone de Ouvido)
function setupMediaSession() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => btnPlay.click());
    navigator.mediaSession.setActionHandler('pause', () => btnPlay.click());
    navigator.mediaSession.setActionHandler('previoustrack', () => btnPrev.click());
    navigator.mediaSession.setActionHandler('nexttrack', () => btnNext.click());
  }
}

function updateMediaSessionMetadata(song) {
  if ('mediaSession' in navigator && song) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: 'JotaPlayer',
      artwork: song.pictureUrl ? [{ src: song.pictureUrl, sizes: '512x512', type: 'image/png' }] : []
    });
  }
}

// Sistema de Abas
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Configurações
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

speedSelect.addEventListener('change', () => {
  const speed = parseFloat(speedSelect.value);
  audioPlayer.playbackRate = speed;
  localStorage.setItem('app-speed', speed);
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

// Exportar Favoritos
btnExportFavs.addEventListener('click', () => {
  const favs = songs.filter(s => s.favorite);
  if (favs.length === 0) {
    alert('Nenhuma música marcada como favorita.');
    return;
  }

  let text = '=== MINHAS MÚSICAS FAVORITAS (JOTAPLAYER) ===\n\n';
  favs.forEach((s, i) => {
    text += `${i + 1}. ${s.title} - ${s.artist}\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'favoritos_jotaplayer.txt';
  a.click();
  URL.revokeObjectURL(url);
});

// Carregar Arquivos
folderInput.addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  const audioFiles = files.filter(file => file.type.startsWith('audio/'));

  if (audioFiles.length === 0) return;

  songs = [];
  queue = [];
  renderQueue();

  let loadedCount = 0;
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

        const songObj = { file, title, artist, pictureUrl, url: URL.createObjectURL(file), favorite: false, duration: 0 };

        const tempAudio = new Audio(songObj.url);
        tempAudio.addEventListener('loadedmetadata', () => {
          songObj.duration = tempAudio.duration;
          updateLibraryStats();
        });

        songs.push(songObj);
        loadedCount++;
        if (loadedCount === audioFiles.length) {
          updateArtistDropdown();
          renderSongList();
        }
      },
      onError: function() {
        const title = file.name.replace(/\.[^/.]+$/, "");
        const songObj = { file, title, artist: "Artista Desconhecido", pictureUrl: null, url: URL.createObjectURL(file), favorite: false, duration: 0 };

        const tempAudio = new Audio(songObj.url);
        tempAudio.addEventListener('loadedmetadata', () => {
          songObj.duration = tempAudio.duration;
          updateLibraryStats();
        });

        songs.push(songObj);
        loadedCount++;
        if (loadedCount === audioFiles.length) {
          updateArtistDropdown();
          renderSongList();
        }
      }
    });
  });
});

function updateLibraryStats() {
  const count = songs.length;
  const totalSec = songs.reduce((acc, s) => acc + (isNaN(s.duration) ? 0 : s.duration), 0);
  libraryStats.textContent = `${count} ${count === 1 ? 'música' : 'músicas'} (${formatTime(totalSec)})`;
}

// Extrai e separa os nomes individuais de artistas
function updateArtistDropdown() {
  const artistSet = new Set();

  songs.forEach(song => {
    if (song.artist && song.artist !== "Artista Desconhecido") {
      // Separa por vírgulas, barras, &, feat. ou ft.
      const individualArtists = song.artist.split(/[,/\\&]|feat\.|ft\./i);
      individualArtists.forEach(name => {
        const cleanName = name.trim();
        if (cleanName.length > 0) {
          artistSet.add(cleanName);
        }
      });
    }
  });

  const sortedArtists = Array.from(artistSet).sort((a, b) => a.localeCompare(b));
  artistSelect.innerHTML = '<option value="">Todos os Artistas</option>';
  
  sortedArtists.forEach(artist => {
    const opt = document.createElement('option');
    opt.value = artist;
    opt.textContent = artist;
    artistSelect.appendChild(opt);
  });
}

// Renderizar Lista
function renderSongList() {
  const query = searchInput.value.toLowerCase().trim();
  const selectedArtist = artistSelect.value.toLowerCase().trim();
  songListElement.innerHTML = '';

  const filteredSongs = songs.map((song, originalIndex) => ({ song, originalIndex })).filter(({ song }) => {
    const matchesSearch = song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query);
    const matchesFav = isFavFilterActive ? song.favorite : true;
    
    // Verifica se o artista selecionado faz parte do campo do artista da música
    const matchesArtist = selectedArtist 
      ? song.artist.toLowerCase().includes(selectedArtist) 
      : true;

    return matchesSearch && matchesFav && matchesArtist;
  });

  if (filteredSongs.length === 0) {
    songListElement.innerHTML = '<li class="empty-msg">Nenhuma música encontrada.</li>';
    return;
  }

  filteredSongs.forEach(({ song, originalIndex }) => {
    const li = document.createElement('li');
    li.className = 'song-item';
    if (originalIndex === currentSongIndex) {
      li.classList.add('active');
    }

    li.innerHTML = `
      <div class="song-info">
        <span class="title">${song.title}</span>
        <span class="artist">${song.artist}</span>
      </div>
      <div class="item-actions">
        <button class="action-btn-small btn-add-queue" title="Adicionar à Fila">➕</button>
        <button class="action-btn-small btn-fav" title="Favoritar">${song.favorite ? '❤️' : '🤍'}</button>
      </div>
    `;

    li.querySelector('.btn-fav').addEventListener('click', (e) => {
      e.stopPropagation();
      song.favorite = !song.favorite;
      renderSongList();
    });

    li.querySelector('.btn-add-queue').addEventListener('click', (e) => {
      e.stopPropagation();
      queue.push(originalIndex);
      renderQueue();
    });

    li.addEventListener('click', () => {
      loadAndPlaySong(originalIndex);
    });

    songListElement.appendChild(li);
  });
}

// Gerenciamento da Fila de Espera
function renderQueue() {
  if (queue.length === 0) {
    queueSection.style.display = 'none';
    return;
  }

  queueSection.style.display = 'block';
  queueCountEl.textContent = queue.length;
  queueListElement.innerHTML = '';

  queue.forEach((songIdx, qIdx) => {
    const song = songs[songIdx];
    const li = document.createElement('li');
    li.className = 'queue-item';
    li.innerHTML = `
      <span>${song.title}</span>
      <button class="btn-text">❌</button>
    `;

    li.querySelector('button').addEventListener('click', () => {
      queue.splice(qIdx, 1);
      renderQueue();
    });

    queueListElement.appendChild(li);
  });
}

btnClearQueue.addEventListener('click', () => {
  queue = [];
  renderQueue();
});

searchInput.addEventListener('input', renderSongList);
artistSelect.addEventListener('change', renderSongList);

btnFilterFav.addEventListener('click', () => {
  isFavFilterActive = !isFavFilterActive;
  btnFilterFav.classList.toggle('active-filter', isFavFilterActive);
  btnFilterFav.textContent = isFavFilterActive ? '❤️' : '🤍';
  renderSongList();
});

btnShuffle.addEventListener('click', () => {
  isShuffle = !isShuffle;
  btnShuffle.classList.toggle('active', isShuffle);
});

btnLoop.addEventListener('click', () => {
  loopMode = (loopMode + 1) % 3;
  if (loopMode === 0) {
    btnLoop.textContent = '🔁';
    btnLoop.classList.remove('active');
  } else if (loopMode === 1) {
    btnLoop.textContent = '🔁';
    btnLoop.classList.add('active');
  } else if (loopMode === 2) {
    btnLoop.textContent = '🔂';
    btnLoop.classList.add('active');
  }
});

btnMute.addEventListener('click', () => {
  if (!isMuted) {
    previousVolume = audioPlayer.volume;
    audioPlayer.volume = 0;
    volumeBar.value = 0;
    isMuted = true;
    btnMute.textContent = '🔇';
  } else {
    audioPlayer.volume = previousVolume;
    volumeBar.value = previousVolume * 100;
    isMuted = false;
    btnMute.textContent = '🔊';
  }
});

// Reprodução
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

  updateMediaSessionMetadata(song);
  renderSongList();

  audioPlayer.src = song.url;
  audioPlayer.playbackRate = parseFloat(speedSelect.value);
  audioPlayer.volume = volumeBar.value / 100;
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

function getNextIndex() {
  if (queue.length > 0) {
    const nextIdx = queue.shift();
    renderQueue();
    return nextIdx;
  }

  if (isShuffle) {
    let rand = Math.floor(Math.random() * songs.length);
    if (rand === currentSongIndex && songs.length > 1) {
      rand = (rand + 1) % songs.length;
    }
    return rand;
  }

  return (currentSongIndex + 1) % songs.length;
}

btnNext.addEventListener('click', () => {
  if (songs.length === 0) return;
  loadAndPlaySong(getNextIndex());
});

btnPrev.addEventListener('click', () => {
  if (songs.length === 0) return;
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
  const vol = volumeBar.value / 100;
  audioPlayer.volume = vol;
  if (vol > 0) {
    isMuted = false;
    btnMute.textContent = '🔊';
  }
});

audioPlayer.addEventListener('ended', () => {
  if (loopMode === 2) {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
  } else if (loopMode === 1 || isShuffle || queue.length > 0 || currentSongIndex < songs.length - 1) {
    btnNext.click();
  } else {
    btnPlay.textContent = '▶';
    glassContainer.classList.remove('playing');
  }
});

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}
