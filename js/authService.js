import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import config from './config.js';

// Initialize Firebase
const app = initializeApp(config.firebase);
const auth = getAuth(app);

class AuthService {
    constructor() {
        this.auth = auth;
        this.currentUser = null;
    }

    async register(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return userCredential.user;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
        } catch (error) {
            throw this.handleError(error);
        }
    }

    onAuthStateChanged(callback) {
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            callback(user);
        });
    }

    handleError(error) {
        let message = 'An error occurred';
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = 'This email is already registered';
                break;
            case 'auth/invalid-email':
                message = 'Invalid email address';
                break;
            case 'auth/operation-not-allowed':
                message = 'Email/password accounts are not enabled';
                break;
            case 'auth/weak-password':
                message = 'Password is too weak';
                break;
            case 'auth/user-not-found':
                message = 'User not found';
                break;
            case 'auth/wrong-password':
                message = 'Incorrect password';
                break;
        }
        return { code: error.code, message };
    }
}

export default new AuthService(); 