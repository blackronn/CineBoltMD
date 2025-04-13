import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    setDoc,
    limit
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import config from './config.js';

// Firebase'i başlat
const app = initializeApp(config.firebase);
const db = getFirestore(app);

class UserService {
    constructor() {
        this.ratingsCollection = collection(db, 'ratings');
        this.userListsCollection = collection(db, 'userLists');
        this.userStatsCollection = collection(db, 'userStats');
    }

    // Film puanlama
    async rateMovie(movieId, userId, userEmail, rating, movieDetails) {
        try {
            const q = query(
                this.ratingsCollection,
                where('movieId', '==', movieId),
                where('userId', '==', userId)
            );
            
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                // Yeni puan ekle
                await addDoc(this.ratingsCollection, {
                    movieId,
                    userId,
                    userEmail,
                    rating,
                    movieTitle: movieDetails.title,
                    moviePoster: movieDetails.poster_path,
                    createdAt: new Date().toISOString()
                });
            } else {
                // Mevcut puanı güncelle
                await updateDoc(snapshot.docs[0].ref, {
                    rating,
                    updatedAt: new Date().toISOString()
                });
            }

            // Kullanıcı istatistiklerini güncelle
            await this.updateUserStats(userId, userEmail);
            
            return true;
        } catch (error) {
            console.error('Rating eklenirken hata:', error);
            throw error;
        }
    }

    // Film için ortalama puan ve toplam rating sayısı
    async getMovieRating(movieId) {
        try {
            console.log(`getMovieRating çağrıldı: movieId=${movieId}`);
            
            if (!movieId) {
                console.error('getMovieRating için geçersiz movieId');
                return { average: 0, count: 0 };
            }
            
            const q = query(
                this.ratingsCollection,
                where('movieId', '==', movieId.toString())
            );
            
            console.log('Firestore sorgusu oluşturuldu, sorgu çalıştırılıyor...');
            const snapshot = await getDocs(q);
            console.log(`Sorgu sonucu: ${snapshot.size} belge bulundu`);
            
            const ratings = snapshot.docs.map(doc => {
                const data = doc.data();
                console.log(`Rating belgesi: `, data);
                
                // Rating değerinin sayı olduğundan emin ol
                const rating = parseFloat(data.rating);
                return isNaN(rating) ? 0 : rating;
            });
            
            if (ratings.length === 0) {
                console.log(`${movieId} ID'li film için puanlama bulunamadı`);
                return { average: 0, count: 0 };
            }
            
            const sum = ratings.reduce((a, b) => a + b, 0);
            const average = sum / ratings.length;
            const result = {
                average: parseFloat(average.toFixed(1)),
                count: ratings.length
            };
            
            console.log(`${movieId} ID'li film için sonuç:`, result);
            return result;
        } catch (error) {
            console.error('Film puanı alınırken hata:', error);
            console.error('Hata detayları:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            return { average: 0, count: 0 };
        }
    }

    // Kullanıcının puanını alma
    async getUserRating(movieId, userId) {
        try {
            const q = query(
                this.ratingsCollection,
                where('movieId', '==', movieId),
                where('userId', '==', userId)
            );
            
            const snapshot = await getDocs(q);
            return snapshot.empty ? null : snapshot.docs[0].data().rating;
        } catch (error) {
            console.error('Kullanıcı puanı alınırken hata:', error);
            throw error;
        }
    }

    // Kullanıcının listesine film ekleme
    async addToUserList(userId, userEmail, movieId, movieDetails, listType = 'watchlist') {
        try {
            console.log(`addToUserList çağrıldı:`, { 
                userId, 
                userEmail, 
                movieId, 
                movieDetails: movieDetails ? { 
                    id: movieDetails.id,
                    title: movieDetails.title
                } : 'undefined', 
                listType 
            });
            
            if (!userId) throw new Error('userId parametresi gerekli');
            if (!movieId) throw new Error('movieId parametresi gerekli');
            if (!movieDetails) throw new Error('movieDetails parametresi gerekli');
            if (!movieDetails.title) throw new Error('movieDetails.title gerekli');
            
            const listItemId = `${userId}_${movieId}_${listType}`;
            console.log(`Belge ID: ${listItemId}`);
            
            const listItemRef = doc(this.userListsCollection, listItemId);
            
            const data = {
                userId,
                userEmail,
                movieId,
                movieTitle: movieDetails.title,
                moviePoster: movieDetails.poster_path || null,
                listType,
                addedAt: new Date().toISOString()
            };
            
            console.log('Veri yazılıyor:', data);
            await setDoc(listItemRef, data);
            console.log('Veri başarıyla yazıldı');

            return true;
        } catch (error) {
            console.error('Film listeye eklenirken hata:', error);
            console.error('Hata detayları:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            throw error;
        }
    }

    // Kullanıcının listesinden film silme
    async removeFromUserList(userId, movieId, listType = 'watchlist') {
        try {
            console.log(`removeFromUserList çağrıldı:`, { userId, movieId, listType });
            
            if (!userId) throw new Error('userId parametresi gerekli');
            if (!movieId) throw new Error('movieId parametresi gerekli');
            
            // Öncelikle belgeyi bulmaya çalışalım
            const q = query(
                this.userListsCollection,
                where('userId', '==', userId),
                where('movieId', '==', movieId),
                where('listType', '==', listType)
            );
            
            console.log('Belgeyi arıyoruz...');
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                console.log('Silinecek belge bulunamadı');
                return false;
            }
            
            // İlk eşleşen belgeyi sil
            const docRef = snapshot.docs[0].ref;
            console.log(`Belge bulundu, siliniyor: ${docRef.path}`);
            await deleteDoc(docRef);
            console.log('Belge başarıyla silindi');
            
            return true;
        } catch (error) {
            console.error('Film listeden silinirken hata:', error);
            console.error('Hata detayları:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            throw error;
        }
    }

    // Kullanıcının film listesini getirme
    async getUserList(userId, listType = 'watchlist') {
        try {
            console.log(`getUserList çağrıldı: userId=${userId}, listType=${listType}`);
            
            if (!userId) {
                throw new Error('userId boş veya tanımsız');
            }
            
            console.log('Query oluşturuluyor...');
            const q = query(
                this.userListsCollection,
                where('userId', '==', userId),
                where('listType', '==', listType),
                orderBy('addedAt', 'desc')
            );
            
            console.log('Sorgu çalıştırılıyor...');
            const snapshot = await getDocs(q);
            console.log(`Sonuç: ${snapshot.size} belge bulundu`);
            
            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('Kullanıcı listesi alınırken hata:', error);
            console.error('Hata detayları:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            throw error;
        }
    }

    // Kullanıcı istatistiklerini güncelleme
    async updateUserStats(userId, userEmail) {
        try {
            const userStatsRef = doc(this.userStatsCollection, userId);
            
            // Kullanıcının tüm ratinglerini al
            const ratingsQuery = query(
                this.ratingsCollection,
                where('userId', '==', userId)
            );
            const ratingsSnapshot = await getDocs(ratingsQuery);
            const ratingsCount = ratingsSnapshot.size;

            // Kullanıcının tüm listelerini al
            const listsQuery = query(
                this.userListsCollection,
                where('userId', '==', userId)
            );
            const listsSnapshot = await getDocs(listsQuery);
            const listsCount = listsSnapshot.size;

            // İstatistikleri güncelle
            await setDoc(userStatsRef, {
                userId,
                userEmail,
                ratingsCount,
                listsCount,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            return {
                ratingsCount,
                listsCount
            };
        } catch (error) {
            console.error('Kullanıcı istatistikleri güncellenirken hata:', error);
            throw error;
        }
    }

    // Toplam site istatistiklerini alma
    async getSiteStats() {
        try {
            const ratingsSnapshot = await getDocs(this.ratingsCollection);
            const totalRatings = ratingsSnapshot.size;

            return {
                totalRatings
            };
        } catch (error) {
            console.error('Site istatistikleri alınırken hata:', error);
            throw error;
        }
    }

    // Kullanıcının değerlendirdiği filmleri getirme
    async getRatedMovies(userId) {
        try {
            const q = query(
                this.ratingsCollection,
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('Değerlendirilen filmler alınırken hata:', error);
            throw error;
        }
    }

    // En aktif kullanıcıları getir (en çok yorum ve derecelendirme yapanlar)
    async getTopUsers(limit = 5) {
        try {
            const statsSnapshot = await getDocs(this.userStatsCollection);
            const users = statsSnapshot.docs.map(doc => doc.data());
            
            // Toplam aktivite puanına göre sıralama (yorum + derecelendirme)
            users.sort((a, b) => {
                const aActivity = (a.ratingsCount || 0) + (a.commentsCount || 0);
                const bActivity = (b.ratingsCount || 0) + (b.commentsCount || 0);
                return bActivity - aActivity;
            });
            
            return users.slice(0, limit);
        } catch (error) {
            console.error('Top kullanıcılar alınırken hata:', error);
            return [];
        }
    }

    // Diğer kullanıcıların profilini görüntüle
    async getUserProfile(userId) {
        try {
            // Kullanıcı istatistiklerini getir
            const userStatsRef = doc(this.userStatsCollection, userId);
            const userStats = await getDoc(userStatsRef);
            
            if (!userStats.exists()) {
                throw new Error('Kullanıcı bulunamadı');
            }
            
            // Kullanıcının derecelendirmelerini getir
            const ratingsQuery = query(
                this.ratingsCollection,
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(10)
            );
            
            const ratingsSnapshot = await getDocs(ratingsQuery);
            const ratings = ratingsSnapshot.docs.map(doc => doc.data());
            
            // Kullanıcının favori ve izleme listelerini getir
            const watchlistQuery = query(
                this.userListsCollection,
                where('userId', '==', userId),
                where('listType', '==', 'watchlist'),
                limit(10)
            );
            
            const favoritesQuery = query(
                this.userListsCollection,
                where('userId', '==', userId),
                where('listType', '==', 'favorites'),
                limit(10)
            );
            
            const [watchlistSnapshot, favoritesSnapshot] = await Promise.all([
                getDocs(watchlistQuery),
                getDocs(favoritesQuery)
            ]);
            
            const watchlist = watchlistSnapshot.docs.map(doc => doc.data());
            const favorites = favoritesSnapshot.docs.map(doc => doc.data());
            
            return {
                ...userStats.data(),
                ratings,
                watchlist,
                favorites
            };
        } catch (error) {
            console.error('Kullanıcı profili alınırken hata:', error);
            throw error;
        }
    }
}

export default new UserService(); 