import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    getDocs 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import config from './config.js';

// Firebase'i başlat
const app = initializeApp(config.firebase);
const db = getFirestore(app);

class CommentService {
    constructor() {
        this.commentsCollection = collection(db, 'comments');
    }

    async addComment(movieId, userId, userEmail, text) {
        try {
            const comment = {
                movieId,
                userId,
                userEmail,
                text,
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(this.commentsCollection, comment);
            return { id: docRef.id, ...comment };
        } catch (error) {
            console.error('Yorum eklenirken hata:', error);
            throw error;
        }
    }

    async getMovieComments(movieId) {
        try {
            const q = query(
                this.commentsCollection,
                where('movieId', '==', movieId),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const comments = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Yorumları bırakan kullanıcıların derecelendirmelerini getirelim
            for (const comment of comments) {
                try {
                    // Kullanıcının bu filme verdiği puanı getir
                    const ratingQuery = query(
                        collection(db, 'ratings'),
                        where('userId', '==', comment.userId),
                        where('movieId', '==', movieId)
                    );
                    const ratingSnap = await getDocs(ratingQuery);
                    
                    if (!ratingSnap.empty) {
                        comment.userRating = ratingSnap.docs[0].data().rating;
                    }
                } catch (err) {
                    console.error('Kullanıcı derecelendirmesi alınırken hata:', err);
                }
            }
            
            return comments;
        } catch (error) {
            console.error('Yorumlar yüklenirken hata:', error);
            throw error;
        }
    }
}

export default new CommentService(); 