import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// config loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyAstmXpjTtJuM1QHDVOLFcyweEHIFiD2ME",
  authDomain: "controle-de-clientes-41079.firebaseapp.com",
  projectId: "controle-de-clientes-41079",
  storageBucket: "controle-de-clientes-41079.firebasestorage.app",
  messagingSenderId: "928208013161",
  appId: "1:928208013161:web:c1dea4340dea1ace325ff8",
  measurementId: "G-F5ZJDH74WQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust local cache persistence for offline PWA functionality
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Workspace Scopes
[
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/directory.readonly',
  'https://www.googleapis.com/auth/user.addresses.read',
  'https://www.googleapis.com/auth/user.birthday.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.gender.read',
  'https://www.googleapis.com/auth/user.organization.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read'
].forEach(scope => googleProvider.addScope(scope));

// Persistent token cache
const setAccessToken = (token: string | null) => {
  if (token) {
    sessionStorage.setItem('accessToken', token);
  } else {
    sessionStorage.removeItem('accessToken');
  }
};
const getAccessToken = () => sessionStorage.getItem('accessToken');

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { db, auth, googleProvider, getAccessToken, setAccessToken };
export default app;
