import tmdbService from './tmdbService.js';
import authService from './authService.js';
import userService from './userService.js';

class App {
    constructor() {
        this.initializeAuth();
        this.setupEventListeners();
        this.loadMovies();
        this.setupScrollButtons();
        this.setupAuthForms();
        this.setupHeroSection();
    }

    initializeAuth() {
        authService.onAuthStateChanged((user) => {
            const authButtons = document.querySelector('.auth-buttons');
            const userProfile = document.querySelector('.user-profile');
            
            if (user) {
                authButtons?.classList.add('hidden');
                userProfile?.classList.remove('hidden');
            } else {
                authButtons?.classList.remove('hidden');
                userProfile?.classList.add('hidden');
            }
        });
    }

    setupEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        // Arama fonksiyonu
        const searchForm = document.querySelector('.search-bar');
        const searchInput = document.querySelector('.search-bar input');
        
        searchForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = searchInput?.value;
            if (query && query.trim()) {
                window.location.href = `movies.html?search=${encodeURIComponent(query.trim())}`;
            }
        });

        // Ayrıca arama butonu için dinleyici ekleyelim
        const searchButton = document.querySelector('.search-bar button');
        searchButton?.addEventListener('click', (e) => {
            e.preventDefault();
            const query = searchInput?.value;
            if (query && query.trim()) {
                window.location.href = `movies.html?search=${encodeURIComponent(query.trim())}`;
            }
        });

        // Navbar menü event listener'ları
        document.querySelectorAll('.dropdown-content a, .nav-links > a:not(.dropdown-trigger)').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href && href !== '#') {
                    window.location.href = href;
                }
            });
        });

        // Dropdown trigger'ları için event listener
        document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
            });
        });

        // Top 250 linki
        const top250Link = document.getElementById('top250Link');
        top250Link?.addEventListener('click', (e) => {
            window.location.href = 'movies.html?type=top250';
        });

        // Auth butonları
        loginBtn?.addEventListener('click', () => {
            document.getElementById('loginModal').style.display = 'block';
        });

        registerBtn?.addEventListener('click', () => {
            document.getElementById('registerModal').style.display = 'block';
        });

        logoutBtn?.addEventListener('click', async () => {
            try {
                await authService.logout();
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    async loadMovies() {
        try {
            // Load trending movies
            const trendingMovies = await tmdbService.fetchTrendingMovies();
            this.displayMovieRow('trending-movies', trendingMovies);

            // Load top rated movies
            const topRatedResponse = await tmdbService.fetchTopRatedMovies();
            this.displayMovieRow('top-rated-movies', topRatedResponse.results);

            // Load upcoming movies
            const upcomingResponse = await tmdbService.fetchUpcoming();
            this.displayMovieRow('upcoming-movies', upcomingResponse.results);

            // Load action movies
            const actionMovies = await tmdbService.fetchMoviesByGenre(tmdbService.genres.action);
            this.displayMovieRow('action-movies', actionMovies.results);

            // Load drama movies
            const dramaMovies = await tmdbService.fetchMoviesByGenre(tmdbService.genres.drama);
            this.displayMovieRow('drama-movies', dramaMovies.results);

        } catch (error) {
            console.error('Error loading movies:', error);
        }
    }

    async setupHeroSection() {
        try {
            const movie = await tmdbService.fetchBackdropForHero();
            const heroSection = document.getElementById('hero-section');
            if (heroSection && movie.backdrop_path) {
                heroSection.style.backgroundImage = `url('${tmdbService.getBackdropUrl(movie.backdrop_path)}')`;
            }
        } catch (error) {
            console.error('Error setting hero backdrop:', error);
        }
    }

    displayMovieRow(containerId, movies) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        movies.forEach(movie => {
            const card = this.createMovieCard(movie);
            container.appendChild(card);
        });
    }

    createMovieCard(movie) {
        const imageUrl = movie.poster_path 
            ? tmdbService.getImageUrl(movie.poster_path)
            : 'https://via.placeholder.com/300x450';

        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.movieId = movie.id;
        
        // TMDB rating bilgisini oluştur
        const tmdbRating = `
            <div class="rating tmdb-rating">
                <i class="fas fa-star"></i>
                <span>${movie.vote_average.toFixed(1)}</span>
                <span class="vote-count">(${movie.vote_count.toLocaleString()})</span>
            </div>
        `;
        
        // CineBolt rating bilgisini ekle - bu kısım asenkron olarak güncellenecek
        const cineboltRating = `
            <div class="rating cinebolt-rating">
                <img src="assets/images/vfs2.png" alt="CineBolt Rating" class="rating-logo" width="12" height="12">
                <span id="cinebolt-rating-${movie.id}" style="margin-left:3px;">--</span>
                <span class="vote-count" id="cinebolt-count-${movie.id}"></span>
            </div>
        `;

        card.innerHTML = `
            <img src="${imageUrl}" alt="${movie.title}">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>${new Date(movie.release_date).getFullYear()}</p>
                <div class="ratings-container">
                    ${tmdbRating}
                    ${cineboltRating}
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            window.location.href = `movie-detail.html?id=${movie.id}`;
        });
        
        // CineBolt puanlarını asenkron olarak yükle
        setTimeout(() => {
            this.loadCineBoltRating(movie.id);
        }, 100);

        return card;
    }
    
    async loadCineBoltRating(movieId) {
        try {
            console.log(`[Main] ${movieId} ID'li film için CineBolt puanı yükleniyor...`);
            const { average, count } = await userService.getMovieRating(movieId);
            console.log(`[Main] ${movieId} ID'li film için puanlama sonucu:`, { average, count });
            
            // DOM elementlerini güncelle
            const ratingElement = document.getElementById(`cinebolt-rating-${movieId}`);
            const countElement = document.getElementById(`cinebolt-count-${movieId}`);
            
            if (ratingElement && countElement) {
                console.log(`[Main] ${movieId} ID'li film için DOM elementleri bulundu`);
                
                // Puanlama varsa puanı, yoksa -- göster
                ratingElement.textContent = count > 0 ? average.toFixed(1) : '--';
                
                // Oy sayısını göster (sadece 0'dan büyükse)
                countElement.textContent = count > 0 ? `(${count})` : '';
                
                // Puanlama yoksa CineBolt rating bölümünü soluk göster
                if (count === 0) {
                    const parent = ratingElement.closest('.cinebolt-rating');
                    if (parent) {
                        parent.style.opacity = '0.5';
                    }
                }
                
                // Güncellemeyi görselleştirmek için hafif bir vurgu efekti
                const card = ratingElement.closest('.movie-card');
                if (card) {
                    card.style.transition = 'box-shadow 0.3s ease';
                    card.style.boxShadow = '0 0 8px #00d4ff';
                    setTimeout(() => {
                        card.style.boxShadow = '';
                    }, 1000);
                }
            } else {
                console.warn(`[Main] ${movieId} ID'li film için DOM elementleri bulunamadı:`, {
                    ratingElementExists: !!ratingElement,
                    countElementExists: !!countElement,
                    ratingElementId: `cinebolt-rating-${movieId}`,
                    countElementId: `cinebolt-count-${movieId}`
                });
                
                // Alternatif olarak tekrar deneyelim (asenkron yükleme sorunları için)
                setTimeout(() => {
                    const retryRatingElement = document.getElementById(`cinebolt-rating-${movieId}`);
                    const retryCountElement = document.getElementById(`cinebolt-count-${movieId}`);
                    
                    if (retryRatingElement && retryCountElement) {
                        console.log(`[Main] ${movieId} ID'li film için DOM elementleri ikinci denemede bulundu`);
                        retryRatingElement.textContent = count > 0 ? average.toFixed(1) : '--';
                        retryCountElement.textContent = count > 0 ? `(${count})` : '';
                        
                        if (count === 0) {
                            const parent = retryRatingElement.closest('.cinebolt-rating');
                            if (parent) {
                                parent.style.opacity = '0.5';
                            }
                        }
                    } else {
                        console.error(`[Main] ${movieId} ID'li film için DOM elementleri ikinci denemede de bulunamadı`);
                    }
                }, 500);
            }
        } catch (error) {
            console.error(`[Main] ${movieId} ID'li film için CineBolt puanı yüklenirken hata:`, error);
        }
    }

    setupScrollButtons() {
        document.querySelectorAll('.movie-section').forEach(section => {
            const movieRow = section.querySelector('.movie-row');
            const leftBtn = section.querySelector('.scroll-left');
            const rightBtn = section.querySelector('.scroll-right');

            if (movieRow && leftBtn && rightBtn) {
                leftBtn.addEventListener('click', () => {
                    movieRow.scrollBy({
                        left: -400,
                        behavior: 'smooth'
                    });
                });

                rightBtn.addEventListener('click', () => {
                    movieRow.scrollBy({
                        left: 400,
                        behavior: 'smooth'
                    });
                });
            }
        });
    }

    setupAuthForms() {
        // Login form handler
        const loginForm = document.getElementById('loginForm');
        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                await authService.login(email, password);
                document.getElementById('loginModal').style.display = 'none';
                loginForm.reset();
            } catch (error) {
                alert(error.message);
            }
        });

        // Register form handler
        const registerForm = document.getElementById('registerForm');
        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            try {
                await authService.register(email, password);
                document.getElementById('registerModal').style.display = 'none';
                registerForm.reset();
            } catch (error) {
                alert(error.message);
            }
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});