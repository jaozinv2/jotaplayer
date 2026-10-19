const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const folderInput = document.getElementById('folder-input');
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

// --- CONFIGURAÇÃO DO INDEXEDDB ---
let db;
const dbName = "MusicPlayerDB";
const storeName = "songs";

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

// Extrai metadados do arquivo em forma de Promise
function readMetadata(file) {
  return new Promise((resolve) => {
    if (!jsMediatags) {
      resolve({
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: "Artista Desconhecido",
        pictureUrl: null
      });
      return;
    }

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

        resolve({ title, artist, pictureUrl });
      },
      onError: function() {
        resolve({
          title: file.name.replace(/\.[^/.]+$/, ""),
          artist: "Artista Desconhecido",
          pictureUrl: null
        });
      }
    });
  });
}

// Salvar músicas processadas no IndexedDB
function saveSongsToDB(parsedSongs) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    
    // Limpa a base anterior antes de salvar a nova lista
    store.clear();

    parsedSongs.forEach(item => {
      store.add({
        file: item.file,
        title: item.title,
        artist: item.artist,
        pictureUrl: item.pictureUrl
      });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Carregar músicas salvas do IndexedDB
function loadSongsFromDB() {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => resolve([]);
  });
}

// --- INICIALIZAÇÃO AO ABRIR A PÁGINA ---
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Carregar Tema
  const savedTheme = localStorage.getItem('app-theme');
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    btnThemeToggle.textContent = '🌙 Mudar para Escuro';
  }

  // 2. Carregar Wallpaper
  const savedWallpaper = localStorage.getItem('app-wallpaper');
  if (savedWallpaper) {
    document.body.style.backgroundImage = `url('${savedWallpaper}')`;
  }

  // 3. Inicializar Banco de Dados e Restaurar Músicas
  try {
    await initDB();
    const savedSongs = await loadSongsFromDB();
    if (savedSongs.length > 0) {
      songListElement.innerHTML = '';
      songs = [];
      savedSongs.forEach((item) => {
        addSongToList(item.file, item.title, item.artist, item.pictureUrl);
      });
    }
  } catch (err) {
    console.error("Erro ao carregar banco de dados:", err);
  }
});

// --- NAVEGAÇÃO DE ABAS ---
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// --- AJUSTES: TEMA & WALLPAPER ---
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
        console.warn('Imagem muito grande para guardar no localStorage.');
      }
    };
    reader.readAsDataURL(file);
  }
});

btnResetWallpaper.addEventListener('click', () => {
  document.body.style.backgroundImage = "url('background.jpg')";
  localStorage.removeItem('app-wallpaper');
});

// --- CARREGAR PASTA DE MÚSICAS ---
folderInput.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files);
  const audioFiles = files.filter(file => file.type.startsWith('audio/'));

  if (audioFiles.length === 0) {
    songListElement.innerHTML = '<li class="empty-msg">Nenhum áudio encontrado.</li>';
    return;
  }

  songListElement.innerHTML = '<li class="empty-msg">A carregar e guardar músicas...</li>';
  songs = [];

  // Extrai metadados de todos os arquivos primeiro
  const parsedSongs = [];
  for (const file of audioFiles) {
    const meta = await readMetadata(file);
    parsedSongs.push({
      file,
      title: meta.title,
      artist: meta.artist,
      pictureUrl: meta.pictureUrl
    });
  }

  // Guarda no IndexedDB após o processamento completo
  await saveSongsToDB(parsedSongs);

  // Exibe as músicas salvas na interface
  songListElement.innerHTML = '';
  parsedSongs.forEach((item) => {
    addSongToList(item.file, item.title, item.artist, item.pictureUrl);
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

// --- CONTROLES DO PLAYER ---
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
