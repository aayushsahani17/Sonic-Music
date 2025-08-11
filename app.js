setInterval(() => {
    fetch('https://sonix-s830.onrender.com/api/health')
         .then(response => console.log("Pinged Render backend:", response.status))
         .catch(error => console.error("Error pinging Render:", error));
}, 300000);

document.addEventListener('DOMContentLoaded', function () {
    const user = JSON.parse(sessionStorage.getItem('user'));
    console.log('Current user:', user);

    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userProfile = document.getElementById('userProfile');
    const usernameDisplay = document.getElementById('usernameDisplay');

    if (user && user.id) {
        console.log('User is logged in with ID:', user.id);
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        userProfile.style.display = 'flex';
        usernameDisplay.textContent = user.username;

        fetchUserPlaylists(user.id);

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                sessionStorage.removeItem('user');
                window.location.href = 'login.html';
            });
        }

        setupPlaylistCreation(user);
    } else {
        console.log('No user logged in or missing user ID');
        loginBtn.style.display = 'inline-block';
        signupBtn.style.display = 'inline-block';
        userProfile.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    function openDrawer() {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Open drawer when clicking menu button
    mobileMenuBtn.addEventListener('click', openDrawer);

    // Close drawer when clicking overlay
    overlay.addEventListener('click', closeDrawer);

    // Close drawer when clicking a playlist or home button
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 1024) { // Only on mobile
            if (e.target.closest('#favoritesBtn') || 
                e.target.closest('button[data-playlist-id]') ||
                e.target.closest('#createPlaylist')) {
                closeDrawer();
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) { // lg breakpoint
            closeDrawer();
        }
    });
}); 

let currentlyPlayingSong = null;
let allSongs = [];
let showingFavorites = false;
let currentPlaylist = null;

async function fetchSongs() {
    document.getElementById('loading').classList.remove('hidden');
    try {
     
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (user) {
            try {
                const response = await fetch(`https://sonix-s830.onrender.com/api/playlists/user/${user.id}`, {
                    headers: {
                        'accept': '*/*'
                    }
                });
                const data = await response.json();
                if (response.ok && data.length > 0) {
                    window.favoritePlaylist = data[0];
                }
            } catch (error) {
                console.error('Error fetching favorite playlist:', error);
            }
        }

        
        const response = await fetch('https://sonix-s830.onrender.com/api/songs');
        if (!response.ok) {
            throw new Error('Failed to fetch songs');
        }

        allSongs = await response.json();
        allSongs = shuffleArray(allSongs);
        displaySongs(allSongs);
    } catch (error) {
        console.error('Error fetching songs:', error);
        document.getElementById('message').textContent = 'Failed to load songs. Please try again later.';
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

function shuffleArray(songs) {
    for (let i = songs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [songs[i], songs[j]] = [songs[j], songs[i]];
    }
    return songs;
}

function displaySongs(songs) {
    const songList = document.getElementById('songsList');
    songList.innerHTML = '';

    if (songs.length === 0) {
        songList.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <p>${showingFavorites ? 'No favorite songs yet' : 'No songs found'}</p>
            </div>
        `;
        return;
    }

    songs.forEach(song => {
        const songItem = document.createElement('div');
        songItem.className = 'bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 group p-4';

        const songId = `song-${song.title.replace(/\s+/g, '-')}`;
        const heartButtonId = `heart-${song.id}`;
        const plusButtonId = `plus-${song.id}`;
        const playlistDropdownId = `playlist-dropdown-${song.id}`;

        songItem.innerHTML = `
        <div>
            <div class="relative" onclick="playSong('${song.songUrl}', '${song.title.replace(/'/g, "\\'")}', '${song.artistName.replace(/'/g, "\\'")}', '${song.previewImg}', '${songId}')">
                <img src="${song.previewImg}" alt="${song.title}" class="w-full h-40 aspect-square object-cover">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button id="${songId}-playBtn" class="bg-purple-500 text-white p-4 rounded-full hover:bg-purple-600 transform hover:scale-110 transition-all">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
            <h2 class="text-lg font-bold truncate">${song.title}</h2>
            <p class="text-gray-400 text-sm truncate mb-2">${song.artistName}</p>
            <div class="flex items-center justify-between">
                <span class="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">${song.genre}</span>
                <div class="flex gap-3">
                    <button id="${heartButtonId}" class="text-gray-400 hover:text-purple-500 transition" 
                        onclick="event.stopPropagation(); toggleFav('${song.id}')">
                        <i class="fas fa-heart"></i>
                    </button>
                    <div class="relative">
                        <button id="${plusButtonId}" class="text-gray-400 hover:text-purple-500 transition"
                            onclick="event.stopPropagation();">
                            <i class="fas fa-plus"></i>
                        </button>
                        
                    </div>
                </div>
            </div>
        </div>
        `;
        songList.appendChild(songItem);
    });

    // Update heart icons after displaying songs
    updateHeartIcons();
}

function updateHeartIcons() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) return;

    // First, reset all heart buttons to default state
    document.querySelectorAll('[id^="heart-"]').forEach(button => {
        button.classList.remove('text-purple-600');
        button.classList.add('text-gray-400', 'hover:text-purple-500');
    });
    
    // Then, set the favorited state for songs in favorites
    if (window.favoritePlaylist && window.favoritePlaylist.playlistSongs) {
        window.favoritePlaylist.playlistSongs.forEach(songId => {
            const heartButton = document.getElementById(`heart-${songId}`);
            if (heartButton) {
                heartButton.classList.remove('text-gray-400', 'hover:text-purple-500');
                heartButton.classList.add('text-purple-600');
            }
        });
    }
}

function playSong(url, title, artist, imgSrc, songId) {
    document.getElementById('currentSongTitle').textContent = title;
    document.getElementById('currentArtist').textContent = artist;
    document.getElementById('currentSongImg').src = imgSrc;
    document.getElementById('current-song').src = url;
}

function searchSongs(event) {
    const searchInput = event.target.value.toLowerCase();
    const filteredSongs = allSongs.filter(song => 
        song.title.toLowerCase().includes(searchInput) ||
        song.artistName.toLowerCase().includes(searchInput) ||
        song.genre.toLowerCase().includes(searchInput)
    );
    displaySongs(filteredSongs);
}

function toggleFavorites() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) {
        alert("Please log in to view home");
        return;
    }

    showingFavorites = !showingFavorites;
    currentPlaylist = null;
    const favoritesBtn = document.getElementById('favoritesBtn');
    
    if (showingFavorites) {
        // Show all songs (home view)
        displaySongs(allSongs);
        favoritesBtn.classList.add('bg-white/10');
        // Remove selection from playlist buttons
        document.querySelectorAll('button[data-playlist-id]').forEach(button => {
            button.classList.remove('bg-white/10');
        });
    } else {
        // Show all songs
        displaySongs(allSongs);
        favoritesBtn.classList.remove('bg-white/10');
    }
}

function selectPlaylist(playlist) {
    showingFavorites = false;
    currentPlaylist = playlist;
    const favoritesBtn = document.getElementById('favoritesBtn');
    favoritesBtn.classList.remove('bg-white/10');

    // Show songs from the selected playlist
    const playlistSongs = allSongs.filter(song => 
        playlist.playlistSongs.includes(song.id)
    );
    displaySongs(playlistSongs);
}

function goHome() {
    // Show all songs
    displaySongs(allSongs);
    showingFavorites = false;
    currentPlaylist = null;
    
    // Remove selected state from all playlist buttons
    document.querySelectorAll('button[data-playlist-id]').forEach(button => {
        button.classList.remove('bg-white/10');
    });
}

async function showPlaylistDropdown(dropdownId, songId) {
    // Close all other dropdowns first
    document.querySelectorAll('[id^="playlist-dropdown-"]').forEach(dropdown => {
        if (dropdown.id !== dropdownId) {
            dropdown.classList.add('hidden');
        }
    });
    
    // Toggle the clicked dropdown
    const dropdown = document.getElementById(dropdownId);
    const playlistList = document.getElementById(`playlist-list-${songId}`);
    
    // If dropdown is hidden, populate and show it
    if (dropdown.classList.contains('hidden')) {
        await populatePlaylistDropdown(songId);
        dropdown.classList.remove('hidden');
    } else {
        dropdown.classList.add('hidden');
    }
}

async function populatePlaylistDropdown(songId) {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user) {
        alert('Please log in to add songs to playlists');
        return;
    }

    try {
        const response = await fetch(`https://sonix-s830.onrender.com/api/playlists/user/${user.id}`, {
            headers: {
                'accept': '*/*'
            }
        });

        const playlists = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to fetch playlists: ${playlists.message || 'Unknown error'}`);
        }

        const playlistList = document.getElementById(`playlist-list-${songId}`);
        if (!playlistList) return;

        playlistList.innerHTML = playlists.map(playlist => `
            <button onclick="event.stopPropagation(); addToPlaylist('${songId}', '${playlist.id}')" 
                class="w-full text-left px-3 py-2 hover:bg-gray-700 transition">
                <div class="flex items-center gap-2">
                    <i class="fas fa-music text-purple-500"></i>
                    <span class="truncate">${playlist.playlistName}</span>
                </div>
            </button>
        `).join('');
    } catch (error) {
        console.error('Error populating playlist dropdown:', error);
        alert('Failed to load playlists. Please try again.');
    }
}

async function addToPlaylist(songId, playlistId) {
    try {
        const response = await fetch(`https://sonix-s830.onrender.com/api/playlists/${playlistId}/songs/${songId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'accept': '*/*'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to add song to playlist: ${await response.text()}`);
        }

        // Close the dropdown
        const dropdown = document.getElementById(`playlist-dropdown-${songId}`);
        if (dropdown) {
            dropdown.classList.add('hidden');
        }

        // Show success message
        alert('Song added to playlist successfully!');
    } catch (error) {
        console.error('Error adding song to playlist:', error);
        alert('Failed to add song to playlist: ' + error.message);
    }
}

// Call fetchSongs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchSongs();
    // Add search event listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchSongs);
    }
    // Add favorites button click handler
    const favoritesBtn = document.getElementById('favoritesBtn');
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', toggleFavorites);
    }
});

// Add mobile search functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filteredSongs = allSongs.filter(song => 
                song.title.toLowerCase().includes(searchTerm) ||
                song.artistName.toLowerCase().includes(searchTerm) ||
                song.genre.toLowerCase().includes(searchTerm)
            );
            displaySongs(filteredSongs);
        });
    }
});
