import authService from './authService.js';
import userService from './userService.js';
import tmdbService from './tmdbService.js';

class Profile {
    constructor() {
        this.currentUser = null;
        this.initializeAuth();
        this.setupEventListeners();
    }

    async initializeAuth() {
        authService.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            if (user) {
                const authButtons = document.querySelector('.auth-buttons');
                const userProfile = document.querySelector('.user-profile');
                
                authButtons?.classList.add('hidden');
                userProfile?.classList.remove('hidden');
                
                // Kullanıcı profil bilgisini göster
                document.getElementById('userEmailDisplay').textContent = user.email;
                await this.loadUserData();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    setupEventListeners() {
        // Arama fonksiyonu
        const searchForm = document.querySelector('.search-bar');
        const searchInput = document.querySelector('.search-bar input');
        
        searchForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput?.value;
            if (query && query.trim()) {
                window.location.href = `movies.html?search=${encodeURIComponent(query.trim())}`;
            }
        });

        // Arama butonu için dinleyici
        const searchButton = document.querySelector('.search-bar button');
        searchButton?.addEventListener('click', (e) => {
            e.preventDefault();
            const query = searchInput?.value;
            if (query && query.trim()) {
                window.location.href = `movies.html?search=${encodeURIComponent(query.trim())}`;
            }
        });

        // Login modal
        const loginModal = document.getElementById('loginModal');
        const loginBtn = document.getElementById('loginBtn');
        const loginClose = loginModal?.querySelector('.modal-close');
        const loginForm = document.getElementById('loginForm');

        loginBtn?.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'block';
        });
        
        loginClose?.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'none';
        });
        
        loginForm?.addEventListener('submit', this.handleLogin.bind(this));

        // Register modal
        const registerModal = document.getElementById('registerModal');
        const registerBtn = document.getElementById('registerBtn');
        const registerClose = registerModal?.querySelector('.modal-close');
        const registerForm = document.getElementById('registerForm');

        registerBtn?.addEventListener('click', () => {
            if (registerModal) registerModal.style.display = 'block';
        });
        
        registerClose?.addEventListener('click', () => {
            if (registerModal) registerModal.style.display = 'none';
        });
        
        registerForm?.addEventListener('submit', this.handleRegister.bind(this));

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            authService.logout();
        });

        // Modal dışına tıklandığında kapatma
        window.addEventListener('click', (event) => {
            if (event.target === loginModal) loginModal.style.display = 'none';
            if (event.target === registerModal) registerModal.style.display = 'none';
        });
        
        // Dropdown menüler için event listener'lar
        document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
            });
        });
    }

    async handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await authService.login(email, password);
            document.getElementById('loginModal').style.display = 'none';
        } catch (error) {
            alert('Giriş yapılırken bir hata oluştu: ' + error.message);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            await authService.register(email, password);
            document.getElementById('registerModal').style.display = 'none';
        } catch (error) {
            alert('Kayıt olurken bir hata oluştu: ' + error.message);
        }
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            // Kullanıcı istatistiklerini yükle
            const stats = await userService.updateUserStats(
                this.currentUser.uid,
                this.currentUser.email
            );

            document.getElementById('totalRatings').textContent = stats.ratingsCount;
            document.getElementById('totalWatchlist').textContent = stats.listsCount;

            // Değerlendirilen filmleri yükle
            const ratedMovies = await this.getRatedMovies();
            this.displayMovies('ratedMovies', ratedMovies);

            // İzleme listesini yükle
            const watchlist = await userService.getUserList(this.currentUser.uid, 'watchlist');
            this.displayMovies('watchlistMovies', watchlist);

            // Favorileri yükle
            const favorites = await userService.getUserList(this.currentUser.uid, 'favorites');
            this.displayMovies('favoriteMovies', favorites);

        } catch (error) {
            console.error('Kullanıcı verileri yüklenirken hata:', error);
        }
    }

    async getRatedMovies() {
        try {
            const q = await userService.getRatedMovies(this.currentUser.uid);
            return q;
        } catch (error) {
            console.error('Değerlendirilen filmler yüklenirken hata:', error);
            return [];
        }
    }

    displayMovies(containerId, movies) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (movies.length === 0) {
            container.innerHTML = '<p class="no-movies">Henüz film eklenmemiş.</p>';
            return;
        }

        container.innerHTML = movies.map(movie => `
            <div class="profile-movie-card">
                <a href="movie-detail.html?id=${movie.movieId}">
                    <img src="${tmdbService.getImageUrl(movie.moviePoster)}" alt="${movie.movieTitle}">
                    <div class="profile-movie-info">
                        <h3 class="profile-movie-title">${movie.movieTitle}</h3>
                        ${movie.rating ? `
                            <div class="profile-movie-rating">
                                <i class="fas fa-star"></i>
                                ${movie.rating}/10
                            </div>
                        ` : ''}
                    </div>
                </a>
            </div>
        `).join('');
    }
}

new Profile(); 