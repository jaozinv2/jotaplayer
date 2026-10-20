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
const seekBar = document.getElementById('seek-bar');
const volumeBar = document.getElementById('volume-bar');
const currentTimeEl = document.getElementById('current-time');
const durationTimeEl = document.getElementById('duration-time');
const glassContainer = document.querySelector('.glass-container');

const btnThemeToggle = document.getElementById('btn-theme-toggle');
const wallpaperInput = document.getElementById('wallpaper-input');
const btnResetWallpaper = document.getElementById('btn-reset-wallpaper');

const jsMediatags = window.jsmediatags;
let songs = [];
let currentSongIndex = -1;

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
});

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

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

        songs.push({ file, title, artist, pictureUrl, url: URL.createObjectURL(file) });
        loadedCount++;
        if (loadedCount === audioFiles.length) {
          renderSongList();
        }
      },
      onError: function() {
        const title = file.name.replace(/\.[^/.]+$/, "");
        songs.push({ file, title, artist: "Artista Desconhecido", pictureUrl: null, url: URL.createObjectURL(file) });
        loadedCount++;
        if (loadedCount === audioFiles.length) {
          renderSongList();
        }
      }
    });
  });
});

function renderSongList() {
  const query = searchInput.value.toLowerCase().trim();
  songListElement.innerHTML = '';

  const filteredSongs = songs.map((song, originalIndex) => ({ song, originalIndex })).filter(({ song }) => {
    return song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query);
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
    `;

    li.addEventListener('click', () => {
      loadAndPlaySong(originalIndex);
    });

    songListElement.appendChild(li);
  });
}

searchInput.addEventListener('input', () => {
  renderSongList();
});

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
