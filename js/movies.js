import tmdbService from './tmdbService.js';
import authService from './authService.js';
import userService from './userService.js';

class MoviesPage {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.movies = [];
        this.params = new URLSearchParams(window.location.search);
        this.type = this.params.get('type');
        this.genre = this.params.get('genre');
        this.search = this.params.get('search');
        this.sortBy = 'popularity.desc';
        this.year = '';
        this.rating = '';

        this.initializeAuth();
        this.setupEventListeners();
        this.setupYearFilter();
        this.updateCategoryTitle();
        this.loadMovies();
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
        // Arama işlevselliği
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

        // Filter event listeners
        document.getElementById('sortFilter')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.currentPage = 1;
            this.loadMovies();
        });

        document.getElementById('yearFilter')?.addEventListener('change', (e) => {
            this.year = e.target.value;
            this.currentPage = 1;
            this.loadMovies();
        });

        document.getElementById('ratingFilter')?.addEventListener('change', (e) => {
            this.rating = e.target.value;
            this.currentPage = 1;
            this.loadMovies();
        });

        // Pagination event listeners
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadMovies();
            }
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                this.loadMovies();
            }
        });

        // Auth event listeners
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('loginModal');
            modal.style.display = 'block';
        });

        document.getElementById('registerBtn')?.addEventListener('click', () => {
            const modal = document.getElementById('registerModal');
            modal.style.display = 'block';
        });

        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            try {
                await authService.logout();
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    setupYearFilter() {
        const yearFilter = document.getElementById('yearFilter');
        if (yearFilter) {
            const currentYear = new Date().getFullYear();
            for (let year = currentYear; year >= 1900; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearFilter.appendChild(option);
            }
        }
    }

    updateCategoryTitle() {
        const titleElement = document.getElementById('categoryTitle');
        if (!titleElement) return;

        let title = 'Movies';
        if (this.search) {
            title = `Search Results for "${this.search}"`;
        } else if (this.type) {
            switch (this.type) {
                case 'popular':
                    title = 'Popular Movies';
                    break;
                case 'top_rated':
                    title = 'Top Rated Movies';
                    break;
                case 'now_playing':
                    title = 'Now Playing';
                    break;
                case 'upcoming':
                    title = 'Coming Soon';
                    break;
                case 'top250':
                    title = 'Top 250 Movies';
                    break;
            }
        } else if (this.genre) {
            const genreNames = {
                '28': 'Action',
                '12': 'Adventure',
                '35': 'Comedy',
                '18': 'Drama',
                '27': 'Horror',
                '878': 'Sci-Fi',
                '10749': 'Romance',
                '53': 'Thriller',
                '16': 'Animation',
                '99': 'Documentary'
            };
            title = `${genreNames[this.genre] || 'Genre'} Movies`;
        }
        titleElement.textContent = title;
    }

    async loadMovies() {
        try {
            const container = document.getElementById('moviesGrid');
            if (!container) return;

            container.innerHTML = '<div class="loading">Loading movies...</div>';

            let response;
            const params = {
                page: this.currentPage,
                sort_by: this.sortBy
            };

            if (this.year) {
                params.year = this.year;
            }

            if (this.search) {
                // Arama işlemi için
                try {
                    console.log(`Processing search for: "${this.search}"`);
                    const searchResults = await tmdbService.searchMovies(this.search);
                    if (searchResults && searchResults.length > 0) {
                        response = {
                            results: searchResults,
                            total_pages: 1 // Arama sonuçları için şimdilik tek sayfa
                        };
                        this.movies = searchResults;
                        this.totalPages = 1;
                    } else {
                        // Sonuç bulunamadı
                        container.innerHTML = `<div class="error">No results found for "${this.search}"</div>`;
                        this.movies = [];
                        this.totalPages = 0;
                        this.updatePagination();
                        return;
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    container.innerHTML = `<div class="error">Error searching for "${this.search}"</div>`;
                    return;
                }
            } else if (this.type === 'top250') {
                response = await tmdbService.fetchTopRatedMovies(params);
                this.movies = response.results.slice(0, 250);
                this.totalPages = Math.ceil(250 / 20);
            } else {
                switch (this.type) {
                    case 'popular':
                        response = await tmdbService.fetchPopularMovies(params);
                        break;
                    case 'top_rated':
                        response = await tmdbService.fetchTopRatedMovies(params);
                        break;
                    case 'now_playing':
                        response = await tmdbService.fetchNowPlaying(params);
                        break;
                    case 'upcoming':
                        response = await tmdbService.fetchUpcoming(params);
                        break;
                    default:
                        if (this.genre) {
                            response = await tmdbService.fetchMoviesByGenre(this.genre, params);
                        } else {
                            response = await tmdbService.fetchPopularMovies(params);
                        }
                }
                
                if (response) {
                    this.movies = response.results;
                    this.totalPages = response.total_pages;
                }
            }

            // Apply rating filter if set
            if (this.rating) {
                this.movies = this.movies.filter(movie => movie.vote_average >= parseFloat(this.rating));
            }

            this.displayMovies();
            this.updatePagination();
        } catch (error) {
            console.error('Error loading movies:', error);
            const container = document.getElementById('moviesGrid');
            if (container) {
                container.innerHTML = '<div class="error">Failed to load movies. Please try again later.</div>';
            }
        }
    }

    displayMovies() {
        const container = document.getElementById('moviesGrid');
        if (!container) return;

        container.innerHTML = '';
        this.movies.forEach(movie => {
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
            console.log(`[Movies] ${movieId} ID'li film için CineBolt puanı yükleniyor...`);
            const { average, count } = await userService.getMovieRating(movieId);
            console.log(`[Movies] ${movieId} ID'li film için puanlama sonucu:`, { average, count });
            
            // DOM elementlerini güncelle
            const ratingElement = document.getElementById(`cinebolt-rating-${movieId}`);
            const countElement = document.getElementById(`cinebolt-count-${movieId}`);
            
            if (ratingElement && countElement) {
                console.log(`[Movies] ${movieId} ID'li film için DOM elementleri bulundu`);
                
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
                console.warn(`[Movies] ${movieId} ID'li film için DOM elementleri bulunamadı:`, {
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
                        console.log(`[Movies] ${movieId} ID'li film için DOM elementleri ikinci denemede bulundu`);
                        retryRatingElement.textContent = count > 0 ? average.toFixed(1) : '--';
                        retryCountElement.textContent = count > 0 ? `(${count})` : '';
                        
                        if (count === 0) {
                            const parent = retryRatingElement.closest('.cinebolt-rating');
                            if (parent) {
                                parent.style.opacity = '0.5';
                            }
                        }
                    } else {
                        console.error(`[Movies] ${movieId} ID'li film için DOM elementleri ikinci denemede de bulunamadı`);
                    }
                }, 500);
            }
        } catch (error) {
            console.error(`[Movies] ${movieId} ID'li film için CineBolt puanı yüklenirken hata:`, error);
        }
    }

    updatePagination() {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const currentPageSpan = document.getElementById('currentPage');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage === this.totalPages;
        }
        if (currentPageSpan) {
            currentPageSpan.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MoviesPage();
}); 