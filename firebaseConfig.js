// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAVK5IBpacjzlNRq_p0wPL0kjLxVHubMYY",
  authDomain: "footwear-fossip.firebaseapp.com",
  projectId: "footwear-fossip",
  storageBucket: "footwear-fossip.appspot.com",
  messagingSenderId: "685026133614",
  appId: "1:685026133614:web:bd17afef1bcf56bc93887f",
  measurementId: "G-FZ57W41BR7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export services
export const db = getFirestore(app);
export const auth = getAuth(app);
export { analytics };
