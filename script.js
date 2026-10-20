const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const folderInput = document.getElementById('folder-input');
const searchInput = document.getElementById('search-input');
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
const libraryStats = document.getElementById('library-stats');
const seekBar = document.getElementById('seek-bar');
const volumeBar = document.getElementById('volume-bar');
const speedSelect = document.getElementById('speed-select');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const glassContainer = document.querySelector('.glass-container');

const btnThemeToggle = document.getElementById('btn-theme-toggle');
const wallpaperInput = document.getElementById('wallpaper-input');
const btnResetWallpaper = document.getElementById('btn-reset-wallpaper');

const jsMediatags = window.jsmediatags;
let songs = [];
let currentSongIndex = -1;

// Estados extras
let isShuffle = false;
let loopMode = 0; // 0: Desligado, 1: Repetir Todos, 2: Repetir Atual
let isFavFilterActive = false;
let isMuted = false;
let previousVolume = 1;

// Carregar preferências salvas
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
});

// Sistema de Abas
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Configurações: Tema
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

// Configurações: Velocidade
speedSelect.addEventListener('change', () => {
  const speed = parseFloat(speedSelect.value);
  audioPlayer.playbackRate = speed;
  localStorage.setItem('app-speed', speed);
});

// Configurações: Wallpaper
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

// Carregar Músicas
folderInput.addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  const audioFiles = files.filter(file => file.type.startsWith('audio/'));

  if (audioFiles.length === 0) {
    songListElement.innerHTML = '<li class="empty-msg">Nenhum áudio encontrado.</li>';
    return;
  }

  songs = [];
  songListElement.innerHTML = '';

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

        const songObj = {
          file,
          title,
          artist,
          pictureUrl,
          url: URL.createObjectURL(file),
          favorite: false,
          duration: 0
        };

        // Obter duração real do áudio via elemento temporário
        const tempAudio = new Audio(songObj.url);
        tempAudio.addEventListener('loadedmetadata', () => {
          songObj.duration = tempAudio.duration;
          updateLibraryStats();
        });

        songs.push(songObj);
        loadedCount++;
        if (loadedCount === audioFiles.length) {
          renderSongList();
        }
      },
      onError: function() {
        const title = file.name.replace(/\.[^/.]+$/, "");
        const songObj = {
          file,
          title,
          artist: "Artista Desconhecido",
          pictureUrl: null,
          url: URL.createObjectURL(file),
          favorite: false,
          duration: 0
        };

        const tempAudio = new Audio(songObj.url);
        tempAudio.addEventListener('loadedmetadata', () => {
          songObj.duration = tempAudio.duration;
          updateLibraryStats();
        });

        songs.push(songObj);
        loadedCount++;
        if (loadedCount === audioFiles.length) {
          renderSongList();
        }
      }
    });
  });
});

// Atualizar contador e tempo total da biblioteca
function updateLibraryStats() {
  const count = songs.length;
  const totalSec = songs.reduce((acc, s) => acc + (isNaN(s.duration) ? 0 : s.duration), 0);
  libraryStats.textContent = `${count} ${count === 1 ? 'música' : 'músicas'} (${formatTime(totalSec)})`;
}

// Renderizar Lista de Músicas com Filtros
function renderSongList() {
  const query = searchInput.value.toLowerCase().trim();
  songListElement.innerHTML = '';

  const filteredSongs = songs.map((song, originalIndex) => ({ song, originalIndex })).filter(({ song }) => {
    const matchesSearch = song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query);
    const matchesFav = isFavFilterActive ? song.favorite : true;
    return matchesSearch && matchesFav;
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
      <button class="fav-btn" title="Favoritar">${song.favorite ? '❤️' : '🤍'}</button>
    `;

    // Clicar no botão de favorito
    const favBtn = li.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      song.favorite = !song.favorite;
      renderSongList();
    });

    // Clicar na música para tocar
    li.addEventListener('click', () => {
      loadAndPlaySong(originalIndex);
    });

    songListElement.appendChild(li);
  });
}

searchInput.addEventListener('input', () => {
  renderSongList();
});

// Filtro de Favoritos
btnFilterFav.addEventListener('click', () => {
  isFavFilterActive = !isFavFilterActive;
  btnFilterFav.classList.toggle('active-filter', isFavFilterActive);
  btnFilterFav.textContent = isFavFilterActive ? '❤️' : '🤍';
  renderSongList();
});

// Modo Aleatório (Shuffle)
btnShuffle.addEventListener('click', () => {
  isShuffle = !isShuffle;
  btnShuffle.classList.toggle('active', isShuffle);
});

// Modo de Repetição (Loop)
btnLoop.addEventListener('click', () => {
  loopMode = (loopMode + 1) % 3;
  if (loopMode === 0) {
    btnLoop.textContent = '🔁';
    btnLoop.classList.remove('active');
    btnLoop.title = 'Repetição: Desligada';
  } else if (loopMode === 1) {
    btnLoop.textContent = '🔁';
    btnLoop.classList.add('active');
    btnLoop.title = 'Repetição: Todas';
  } else if (loopMode === 2) {
    btnLoop.textContent = '🔂';
    btnLoop.classList.add('active');
    btnLoop.title = 'Repetição: Atual';
  }
});

// Mute Rápido
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

// Controles de Áudio e Reprodução
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
  if (songs.length === 0) return -1;
  if (isShuffle) {
    let rand = Math.floor(Math.random() * songs.length);
    if (rand === currentSongIndex && songs.length > 1) {
      rand = (rand + 1) % songs.length;
    }
    return rand;
  } else {
    return (currentSongIndex + 1) % songs.length;
  }
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
    // Repetir a faixa atual
    audioPlayer.currentTime = 0;
    audioPlayer.play();
  } else if (loopMode === 1 || isShuffle || currentSongIndex < songs.length - 1) {
    btnNext.click();
  } else {
    // Parar ao fim da lista se loop estiver desligado
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
