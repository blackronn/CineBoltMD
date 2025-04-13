import tmdbService from './tmdbService.js';
import authService from './authService.js';
import commentService from './commentService.js';
import userService from './userService.js';

class MovieDetail {
    constructor() {
        this.movieId = new URLSearchParams(window.location.search).get('id');
        this.currentUser = null;
        this.movieDetails = null;
        
        if (!this.movieId) {
            this.showApiError('No movie ID provided in the URL');
            return;
        }
        
        this.initializeAuth();
        this.setupEventListeners();
        this.loadMovieDetails();
        this.loadComments();
    }

    async initializeAuth() {
        // AuthState değişikliklerini dinle
        const handleAuthChange = (user) => {
            console.log('Auth state changed:', user);
            this.currentUser = user;
            const authButtons = document.querySelector('.auth-buttons');
            const userProfile = document.querySelector('.user-profile');
            const commentForm = document.querySelector('.comment-form');
            const listButtons = document.querySelectorAll('.list-btn');
            const userRating = document.querySelector('.user-rating');

            if (user) {
                console.log('User is logged in:', user.email);
                if (authButtons) authButtons.classList.add('hidden');
                if (userProfile) userProfile.classList.remove('hidden');
                if (commentForm) commentForm.style.display = 'block';
                listButtons.forEach(btn => btn.style.display = 'flex');
                if (userRating) userRating.style.display = 'block';
                this.loadUserRating();
                this.loadUserListStatus();
            } else {
                console.log('User is not logged in');
                if (authButtons) authButtons.classList.remove('hidden');
                if (userProfile) userProfile.classList.add('hidden');
                if (commentForm) commentForm.style.display = 'none';
                listButtons.forEach(btn => btn.style.display = 'none');
                if (userRating) userRating.style.display = 'none';
            }
        };
        
        // Auth durumunu dinlemeye başla
        authService.onAuthStateChanged(handleAuthChange);
        
        // İlk yükleme için mevcut kullanıcıyı kontrol et
        this.checkInitialUser();
    }

    async checkInitialUser() {
        const currentUser = authService.auth.currentUser;
        if (currentUser) {
            console.log('Current user found on page load:', currentUser.email);
            this.currentUser = currentUser;
            const authButtons = document.querySelector('.auth-buttons');
            const userProfile = document.querySelector('.user-profile');
            const commentForm = document.querySelector('.comment-form');
            const listButtons = document.querySelectorAll('.list-btn');
            const userRating = document.querySelector('.user-rating');
            
            if (authButtons) authButtons.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');
            if (commentForm) commentForm.style.display = 'block';
            listButtons.forEach(btn => btn.style.display = 'flex');
            if (userRating) userRating.style.display = 'block';
            await this.loadUserRating();
            await this.loadUserListStatus();
        }
    }

    setupEventListeners() {
        // Auth event listeners
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                document.getElementById('loginModal').style.display = 'block';
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                document.getElementById('registerModal').style.display = 'block';
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await authService.logout();
                } catch (error) {
                    console.error('Logout error:', error);
                }
            });
        }

        // Rating stars event listener
        const stars = document.querySelectorAll('.star-rating i');
        stars.forEach(star => {
            star.addEventListener('click', async () => {
                if (!this.currentUser) {
                    alert('You must be logged in to rate movies.');
                    return;
                }
                const rating = parseInt(star.dataset.rating);
                await this.rateMovie(rating);
            });

            star.addEventListener('mouseover', () => {
                const rating = parseInt(star.dataset.rating);
                this.updateStarDisplay(rating, true);
            });

            star.addEventListener('mouseout', () => {
                this.loadUserRating();
            });
        });

        // List buttons event listeners
        const watchlistBtn = document.getElementById('addToWatchlist');
        const favoritesBtn = document.getElementById('addToFavorites');
        
        if (watchlistBtn) {
            watchlistBtn.addEventListener('click', () => {
                if (!this.currentUser) {
                    alert('You must be logged in to add to watchlist.');
                    return;
                }
                this.toggleUserList('watchlist');
            });
        }

        if (favoritesBtn) {
            favoritesBtn.addEventListener('click', () => {
                if (!this.currentUser) {
                    alert('You must be logged in to add to favorites.');
                    return;
                }
                this.toggleUserList('favorites');
            });
        }

        // Comment form
        const commentForm = document.getElementById('commentForm');
        const commentText = document.getElementById('commentText');

        if (commentForm && commentText) {
            console.log('Comment form elements found');
            
            commentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Form submitted');
                
                const user = authService.currentUser;
                console.log('Current user:', user);

                if (!user) {
                    alert('You must be logged in to comment.');
                    return;
                }

                const text = commentText.value.trim();
                if (!text) {
                    alert('Please write a comment.');
                    return;
                }

                try {
                    console.log('Adding comment:', {
                        movieId: this.movieId,
                        userId: user.uid,
                        userEmail: user.email,
                        text: text
                    });

                    await this.addComment(text);
                    commentText.value = '';
                    await this.loadComments();
                    console.log('Comment added successfully');
                } catch (error) {
                    console.error('Error adding comment:', error);
                    alert('Error adding comment: ' + error.message);
                }
            });
        } else {
            console.error('Comment form elements not found');
        }

        // Modal close buttons
        const closeButtons = document.querySelectorAll('.modal-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    async loadMovieDetails() {
        try {
            console.log('Loading movie details for ID:', this.movieId);
            
            // Test API bağlantısı
            const testURL = `https://api.themoviedb.org/3/movie/550?api_key=beec1a28a7193de3e734708765adec83`;
            console.log('Testing API connection with hard-coded URL:', testURL);
            
            try {
                const testResponse = await fetch(testURL);
                if (!testResponse.ok) {
                    console.error('API test failed:', testResponse.status, testResponse.statusText);
                    this.showApiError(`API test failed: ${testResponse.status} ${testResponse.statusText}`);
                    return;
                } else {
                    const testData = await testResponse.json();
                    console.log('API test successful:', testData.title);
                }
            } catch (testError) {
                console.error('API test error:', testError);
                this.showApiError(`API test error: ${testError.message}`);
                return;
            }
            
            // Asıl film detaylarını yükle
            this.movieDetails = await tmdbService.fetchMovieDetails(this.movieId);
            console.log('Movie details loaded:', this.movieDetails);
            
            if (!this.movieDetails) {
                throw new Error('Movie details are empty');
            }
            
            this.displayMovieDetails();
            await this.loadMovieRatings();
        } catch (error) {
            console.error('Error loading movie details:', error);
            this.showApiError(`Error loading movie details: ${error.message}`);
        }
    }

    async loadMovieRatings() {
        try {
            const { average, count } = await userService.getMovieRating(this.movieId);
            document.getElementById('averageRating').textContent = average.toFixed(1);
            document.getElementById('totalRatings').textContent = count;
        } catch (error) {
            console.error('Error loading movie ratings:', error);
        }
    }

    async loadUserRating() {
        if (!this.currentUser) return;
        
        try {
            const rating = await userService.getUserRating(this.movieId, this.currentUser.uid);
            if (rating) {
                this.updateStarDisplay(rating);
                document.getElementById('userRatingText').textContent = `Your Rating: ${rating}/10`;
            } else {
                this.updateStarDisplay(0);
                document.getElementById('userRatingText').textContent = 'Not rated yet';
            }
        } catch (error) {
            console.error('Error loading user rating:', error);
        }
    }

    async loadUserListStatus() {
        if (!this.currentUser || !this.movieId) {
            console.log('loadUserListStatus: Kullanıcı veya film ID mevcut değil', {
                currentUser: this.currentUser ? 'var' : 'yok',
                movieId: this.movieId
            });
            return;
        }

        try {
            console.log(`Kullanıcı listelerini kontrol ediliyor: userId=${this.currentUser.uid}, movieId=${this.movieId}`);
            
            console.log('İzleme listesi yükleniyor...');
            const watchlist = await userService.getUserList(this.currentUser.uid, 'watchlist');
            console.log('İzleme listesi yüklendi:', watchlist);
            
            console.log('Favoriler listesi yükleniyor...');
            const favorites = await userService.getUserList(this.currentUser.uid, 'favorites');
            console.log('Favoriler listesi yüklendi:', favorites);

            const isInWatchlist = watchlist.some(item => item.movieId === this.movieId);
            const isInFavorites = favorites.some(item => item.movieId === this.movieId);
            console.log('Film durumu:', { isInWatchlist, isInFavorites });

            const watchlistBtn = document.getElementById('addToWatchlist');
            const favoritesBtn = document.getElementById('addToFavorites');
            
            if (!watchlistBtn || !favoritesBtn) {
                console.error('Liste butonları bulunamadı');
                return;
            }

            watchlistBtn.classList.toggle('active', isInWatchlist);
            favoritesBtn.classList.toggle('active', isInFavorites);

            watchlistBtn.innerHTML = `<i class="fas fa-bookmark"></i> ${isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}`;
            favoritesBtn.innerHTML = `<i class="fas fa-heart"></i> ${isInFavorites ? 'In Favorites' : 'Add to Favorites'}`;
        } catch (error) {
            console.error('Kullanıcı liste durumu yüklenirken hata:', error);
            console.error('Hata detayları:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
        }
    }

    async rateMovie(rating) {
        try {
            await userService.rateMovie(
                this.movieId,
                this.currentUser.uid,
                this.currentUser.email,
                rating,
                this.movieDetails
            );
            
            this.updateStarDisplay(rating);
            document.getElementById('userRatingText').textContent = `Your Rating: ${rating}/10`;
            await this.loadMovieRatings();
        } catch (error) {
            console.error('Error rating movie:', error);
            alert('Error rating movie. Please try again.');
        }
    }

    async toggleUserList(listType) {
        try {
            if (!this.currentUser) {
                alert('Bu işlemi gerçekleştirmek için giriş yapmalısınız.');
                return;
            }
            
            if (!this.movieDetails) {
                alert('Film detayları yüklenemedi. Lütfen sayfayı yenileyin.');
                return;
            }
            
            console.log('Liste işlemi başlatılıyor:', {
                listType,
                userId: this.currentUser.uid,
                movieId: this.movieId,
                movieTitle: this.movieDetails.title
            });
            
            try {
                const userLists = await userService.getUserList(this.currentUser.uid, listType);
                console.log('Mevcut liste alındı:', userLists);
                
                const isInList = userLists.some(item => item.movieId === this.movieId);
                console.log('Film listede mi:', isInList);

                if (isInList) {
                    console.log('Film listeden kaldırılıyor...');
                    await userService.removeFromUserList(this.currentUser.uid, this.movieId, listType);
                    console.log('Film başarıyla listeden kaldırıldı');
                    alert(`Film ${listType === 'watchlist' ? 'izleme listenizden' : 'favorilerinizden'} kaldırıldı.`);
                } else {
                    console.log('Film listeye ekleniyor:', {
                        userId: this.currentUser.uid,
                        email: this.currentUser.email,
                        movieId: this.movieId,
                        movieTitle: this.movieDetails.title,
                        listType: listType
                    });
                    
                    // Filmi listeye ekle
                    await userService.addToUserList(
                        this.currentUser.uid,
                        this.currentUser.email,
                        this.movieId,
                        this.movieDetails,
                        listType
                    );
                    console.log('Film başarıyla listeye eklendi');
                    alert(`Film ${listType === 'watchlist' ? 'izleme listenize' : 'favorilerinize'} eklendi.`);
                }

                // UI'yi güncelle
                await this.loadUserListStatus();
            } catch (innerError) {
                console.error('Liste işlemi iç hata:', innerError);
                alert(`Liste işlemi sırasında bir hata oluştu: ${innerError.message}`);
            }
        } catch (error) {
            console.error('Liste işlemi ana hata:', error);
            alert(`İşlem sırasında bir hata oluştu: ${error.message}`);
        }
    }

    updateStarDisplay(rating, isHover = false) {
        const stars = document.querySelectorAll('.star-rating i');
        stars.forEach(star => {
            const starRating = parseInt(star.dataset.rating);
            if (starRating <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    async loadComments() {
        try {
            const comments = await commentService.getMovieComments(this.movieId);
            this.displayComments(comments);
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    async addComment(text) {
        const user = authService.currentUser;
        if (!user) throw new Error('User not logged in');

        return await commentService.addComment(
            this.movieId,
            user.uid,
            user.email,
            text
        );
    }

    displayMovieDetails() {
        // Background
        document.querySelector('.movie-backdrop').style.backgroundImage = 
            `url('${tmdbService.getBackdropUrl(this.movieDetails.backdrop_path)}')`;

        // Poster
        document.getElementById('moviePoster').src = tmdbService.getImageUrl(this.movieDetails.poster_path);
        document.getElementById('moviePoster').alt = this.movieDetails.title;

        // Title and meta info
        document.getElementById('movieTitle').textContent = this.movieDetails.title;
        
        // TMDB Rating
        const tmdbRating = document.createElement('div');
        tmdbRating.className = 'rating';
        tmdbRating.innerHTML = `
            <i class="fas fa-star" style="color: #FFD700;"></i>
            <span>${this.movieDetails.vote_average.toFixed(1)}</span>
            <span class="vote-count">(${this.movieDetails.vote_count.toLocaleString()} votes)</span>
        `;
        document.querySelector('.movie-meta').insertBefore(tmdbRating, document.querySelector('.rating-section'));

        document.getElementById('movieYear').textContent = new Date(this.movieDetails.release_date).getFullYear();
        document.getElementById('movieDuration').textContent = `${this.movieDetails.runtime} minutes`;

        // Genres
        const genresContainer = document.getElementById('movieGenres');
        genresContainer.innerHTML = this.movieDetails.genres
            .map(genre => `<span class="genre-tag">${genre.name}</span>`)
            .join('');

        // Overview
        document.getElementById('movieOverview').textContent = this.movieDetails.overview;

        // Cast
        if (this.movieDetails.credits?.cast) {
            const castContainer = document.getElementById('castList');
            castContainer.innerHTML = this.movieDetails.credits.cast
                .slice(0, 6)
                .map(actor => `
                    <div class="cast-item">
                        <img src="${actor.profile_path 
                            ? tmdbService.getImageUrl(actor.profile_path, 'w185')
                            : 'https://via.placeholder.com/185x185'}" 
                            alt="${actor.name}">
                        <div class="actor-name">${actor.name}</div>
                        <div class="character-name">${actor.character}</div>
                    </div>
                `).join('');
        }

        // Trailer
        if (this.movieDetails.videos?.results) {
            const trailer = this.movieDetails.videos.results.find(
                video => video.site === 'YouTube' && video.type === 'Trailer'
            );
            if (trailer) {
                const trailerContainer = document.getElementById('trailerContainer');
                trailerContainer.innerHTML = `
                    <div class="trailer-container">
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/${trailer.key}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                        </iframe>
                    </div>
                `;
            }
        }
    }

    displayComments(comments) {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment.!</div>';
            return;
        }

        commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-user">${comment.userEmail}</span>
                    ${comment.userRating ? `
                        <span class="comment-rating">
                            <i class="fas fa-star" style="color: #FFD700;"></i> ${comment.userRating}/10
                        </span>
                    ` : ''}
                    <span class="comment-date">${new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="comment-content">${comment.text}</div>
            </div>
        `).join('');
    }

    showApiError(message) {
        console.error('API Error:', message);
        const errorElement = document.getElementById('api-error');
        const errorMessage = document.getElementById('error-message');
        
        if (errorElement && errorMessage) {
            errorMessage.textContent = message;
            errorElement.style.display = 'block';
            
            // Hide loading content
            const movieContent = document.querySelector('.movie-content');
            if (movieContent) {
                movieContent.style.display = 'none';
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MovieDetail();
}); 