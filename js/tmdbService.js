import config from './config.js';

class TMDBService {
    constructor() {
        this.apiKey = config.tmdb.apiKey;
        this.baseUrl = config.tmdb.baseUrl;
        this.imageBaseUrl = config.tmdb.imageBaseUrl;
        this.genres = {
            action: 28,
            adventure: 12,
            comedy: 35,
            drama: 18,
            horror: 27,
            sciFi: 878,
            romance: 10749,
            thriller: 53,
            animation: 16,
            documentary: 99
        };
    }

    async fetchTrendingMovies() {
        const response = await fetch(`${this.baseUrl}/trending/movie/week?api_key=${this.apiKey}&language=en-US`);
        const data = await response.json();
        return data.results;
    }

    async fetchTopRatedMovies(params = {}) {
        try {
            const queryParams = new URLSearchParams({
                api_key: this.apiKey,
                language: 'en-US',
                page: params.page || 1
            });

            const response = await fetch(`${this.baseUrl}/movie/top_rated?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch top rated movies');
            return await response.json();
        } catch (error) {
            console.error('Error fetching top rated movies:', error);
            return { results: [], total_pages: 0 };
        }
    }

    async fetchMovieDetails(movieId) {
        try {
            if (!movieId) {
                console.error('fetchMovieDetails called with invalid movieId:', movieId);
                throw new Error('Invalid movie ID');
            }
            
            console.log(`Fetching movie details for ID: ${movieId}`);
            const url = `${this.baseUrl}/movie/${movieId}?api_key=${this.apiKey}&append_to_response=credits,videos&language=en-US`;
            console.log(`URL: ${url}`);
            
            // API anahtarını doğrula
            if (!this.apiKey || this.apiKey.length < 10) {
                console.error('Invalid API key:', this.apiKey);
                throw new Error('Invalid API key configuration');
            }
            
            // Tüm URL komponenetlerini kontrol et
            if (!this.baseUrl || !this.baseUrl.startsWith('http')) {
                console.error('Invalid base URL:', this.baseUrl);
                throw new Error('Invalid base URL configuration');
            }
            
            // Doğrudan fetch API testini yap
            console.log('Direct fetch test starting...');
            let response;
            try {
                response = await fetch(url);
                console.log('Response received:', response.status, response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Failed to fetch movie details: ${response.status} ${response.statusText}`, errorText);
                    throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
                }
            } catch (fetchError) {
                console.error('Fetch operation failed:', fetchError);
                throw new Error(`Network error: ${fetchError.message}`);
            }
            
            // JSON parse
            let data;
            try {
                data = await response.json();
                console.log('JSON parsing successful, data received:', data);
            } catch (jsonError) {
                console.error('JSON parsing failed:', jsonError);
                throw new Error('Failed to parse API response');
            }
            
            // Veri doğrulama
            if (!data || !data.id) {
                console.error('Received invalid data:', data);
                throw new Error('Invalid data received from API');
            }
            
            console.log('Movie data successfully fetched:', data.title);
            return data;
        } catch (error) {
            console.error('Error in fetchMovieDetails:', error);
            throw error;
        }
    }

    async searchMovies(query) {
        try {
            console.log(`Searching movies for query: "${query}"`);
            const queryParams = new URLSearchParams({
                api_key: this.apiKey,
                query: query,
                language: 'en-US',
                page: 1,
                include_adult: false
            });

            const url = `${this.baseUrl}/search/movie?${queryParams}`;
            console.log(`Search URL: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Search API request failed: ${response.status} ${response.statusText}`);
                throw new Error(`Search API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Found ${data.results.length} movies for query "${query}"`);
            return data.results;
        } catch (error) {
            console.error('Error searching movies:', error);
            return [];
        }
    }

    async fetchNowPlaying(params = {}) {
        try {
            const queryParams = new URLSearchParams({
                api_key: this.apiKey,
                language: 'en-US',
                page: params.page || 1
            });

            const response = await fetch(`${this.baseUrl}/movie/now_playing?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch now playing movies');
            return await response.json();
        } catch (error) {
            console.error('Error fetching now playing movies:', error);
            return { results: [], total_pages: 0 };
        }
    }

    async fetchUpcoming(params = {}) {
        try {
            const queryParams = new URLSearchParams({
                api_key: this.apiKey,
                language: 'en-US',
                page: params.page || 1
            });

            const response = await fetch(`${this.baseUrl}/movie/upcoming?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch upcoming movies');
            return await response.json();
        } catch (error) {
            console.error('Error fetching upcoming movies:', error);
            return { results: [], total_pages: 0 };
        }
    }

    async fetchMoviesByGenre(genreId, params = {}) {
        try {
            const queryParams = new URLSearchParams({
                api_key: this.apiKey,
                language: 'en-US',
                with_genres: genreId,
                page: params.page || 1,
                sort_by: params.sort_by || 'popularity.desc'
            });

            if (params.year) {
                queryParams.append('primary_release_year', params.year);
            }

            const response = await fetch(`${this.baseUrl}/discover/movie?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch movies by genre');
            return await response.json();
        } catch (error) {
            console.error('Error fetching movies by genre:', error);
            return { results: [], total_pages: 0 };
        }
    }

    async fetchBackdropForHero() {
        const response = await fetch(`${this.baseUrl}/trending/movie/day?api_key=${this.apiKey}&language=en-US`);
        const data = await response.json();
        const movie = data.results[0];
        return {
            backdrop_path: movie.backdrop_path,
            title: movie.title
        };
    }

    async fetchPopularMovies(params = {}) {
        try {
            const queryParams = new URLSearchParams({
                api_key: this.apiKey,
                language: 'en-US',
                page: params.page || 1
            });

            const response = await fetch(`${this.baseUrl}/movie/popular?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch popular movies');
            return await response.json();
        } catch (error) {
            console.error('Error fetching popular movies:', error);
            return { results: [], total_pages: 0 };
        }
    }

    getImageUrl(path, size = 'w500') {
        if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
        return `${this.imageBaseUrl}/${size}${path}`;
    }

    getBackdropUrl(path, size = 'original') {
        if (!path) return 'https://via.placeholder.com/1920x1080?text=No+Backdrop';
        return `${this.imageBaseUrl}/${size}${path}`;
    }
}

export default new TMDBService(); 