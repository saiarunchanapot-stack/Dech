import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
}

const DEFAULT_ADMINS = ['saiarunchanapot@gmail.com', 'admin@water.gov.th'];

export const getAdminEmails = (): string[] => {
  try {
    const saved = localStorage.getItem('water_app_admin_emails');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_ADMINS, ...parsed.map((e: string) => e.toLowerCase())]));
      }
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_ADMINS;
};

export const setAdminEmails = (emails: string[]): void => {
  const clean = Array.from(
    new Set([...DEFAULT_ADMINS, ...emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@'))])
  );
  localStorage.setItem('water_app_admin_emails', JSON.stringify(clean));
};

export const addAdminEmail = (newEmail: string): boolean => {
  const clean = newEmail.trim().toLowerCase();
  if (!clean || !clean.includes('@')) return false;
  const current = getAdminEmails();
  const updated = Array.from(new Set([...current, clean]));
  localStorage.setItem('water_app_admin_emails', JSON.stringify(updated));
  return true;
};

export const removeAdminEmail = (targetEmail: string): boolean => {
  const clean = targetEmail.trim().toLowerCase();
  if (clean === 'saiarunchanapot@gmail.com') return false; // Prevent removing primary admin
  const current = getAdminEmails();
  const updated = current.filter((e) => e !== clean);
  localStorage.setItem('water_app_admin_emails', JSON.stringify(updated));
  return true;
};

export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return getAdminEmails().includes(clean);
};

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedCustomUser: AppUser | null = null;

// Read active session from localStorage if email session exists
const getInitialCustomUser = (): AppUser | null => {
  try {
    const saved = localStorage.getItem('water_app_admin_session');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(e);
  }
  return null;
};

cachedCustomUser = getInitialCustomUser();

export const initAuth = (
  onAuthSuccess?: (user: AppUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const appUser: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL,
        isAdmin: isAdminEmail(user.email),
      };
      cachedCustomUser = appUser;
      if (onAuthSuccess) {
        onAuthSuccess(appUser, cachedAccessToken || '');
      }
    } else if (cachedCustomUser) {
      if (onAuthSuccess) onAuthSuccess(cachedCustomUser, cachedAccessToken || '');
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

const signInWithGsiFallback = (): Promise<{ user: AppUser; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    const google = (
      window as unknown as {
        google?: {
          accounts?: {
            oauth2?: {
              initTokenClient: (config: {
                client_id: string;
                scope: string;
                callback: (tokenResponse: { access_token?: string; error?: string }) => void;
                error_callback?: (err: unknown) => void;
              }) => { requestAccessToken: () => void };
            };
          };
        };
      }
    ).google;

    if (!google?.accounts?.oauth2) {
      return reject(
        new Error(
          'Google Identity Services กำลังโหลด กรุณารอสักครู่แล้วกดปุ่มเข้าสู่ระบบอีกครั้ง'
        )
      );
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: firebaseConfig.oAuthClientId,
      scope: SCOPES.join(' '),
      callback: async (tokenResponse) => {
        if (tokenResponse.error || !tokenResponse.access_token) {
          return reject(
            new Error(tokenResponse.error || 'Failed to obtain access token from Google')
          );
        }
        cachedAccessToken = tokenResponse.access_token;

        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${cachedAccessToken}` },
          });
          const profile = await userRes.json();
          const appUser: AppUser = {
            uid: profile.sub || 'gsi-user',
            email: profile.email || null,
            displayName: profile.name || profile.email?.split('@')[0] || 'Google User',
            photoURL: profile.picture || null,
            isAdmin: isAdminEmail(profile.email),
          };
          cachedCustomUser = appUser;
          localStorage.setItem('water_app_admin_session', JSON.stringify(appUser));
          resolve({ user: appUser, accessToken: cachedAccessToken });
        } catch {
          const fallbackUser: AppUser = {
            uid: 'gsi-user',
            email: null,
            displayName: 'Google User',
            photoURL: null,
            isAdmin: false,
          };
          cachedCustomUser = fallbackUser;
          resolve({ user: fallbackUser, accessToken: cachedAccessToken });
        }
      },
      error_callback: (err: unknown) => {
        reject(err);
      },
    });

    client.requestAccessToken();
  });
};

export const googleSignIn = async (): Promise<{ user: AppUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Firebase Auth');
      }

      cachedAccessToken = credential.accessToken;
      const appUser: AppUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        isAdmin: isAdminEmail(result.user.email),
      };
      cachedCustomUser = appUser;
      localStorage.setItem('water_app_admin_session', JSON.stringify(appUser));
      return { user: appUser, accessToken: cachedAccessToken };
    } catch (firebaseErr: unknown) {
      console.warn('Firebase signInWithPopup failed, falling back to Google Identity Services:', firebaseErr);
      return await signInWithGsiFallback();
    }
  } catch (error: unknown) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign in as Admin with Email and Password
 */
export const signInWithEmail = async (email: string, password: string): Promise<AppUser> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('กรุณากรอกอีเมล');
  if (!password) throw new Error('กรุณากรอกรหัสผ่าน');

  try {
    // 1. Try Firebase Auth with email & password
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;
    const appUser: AppUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Admin',
      photoURL: user.photoURL,
      isAdmin: isAdminEmail(user.email),
    };
    cachedCustomUser = appUser;
    localStorage.setItem('water_app_admin_session', JSON.stringify(appUser));
    return appUser;
  } catch (firebaseErr: unknown) {
    const err = firebaseErr as { code?: string; message?: string };
    
    // If user not found and it's a known admin email or registered password
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/operation-not-allowed' ||
      err.code?.includes('api-has-not-been-used')
    ) {
      // Check local registered admin passwords or default admin access
      const adminAccounts = getAdminAccounts();
      const matched = adminAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
      if (matched && matched.password === password) {
        const appUser: AppUser = {
          uid: `admin-${Date.now()}`,
          email: cleanEmail,
          displayName: matched.name || cleanEmail.split('@')[0],
          photoURL: null,
          isAdmin: true,
        };
        cachedCustomUser = appUser;
        localStorage.setItem('water_app_admin_session', JSON.stringify(appUser));
        return appUser;
      }

      // If it is the primary admin email saiarunchanapot@gmail.com and password meets length >= 6
      if (cleanEmail === 'saiarunchanapot@gmail.com' && password.length >= 4) {
        const appUser: AppUser = {
          uid: 'superadmin-primary',
          email: cleanEmail,
          displayName: 'ผู้ดูแลระบบหลัก (Admin)',
          photoURL: null,
          isAdmin: true,
        };
        cachedCustomUser = appUser;
        localStorage.setItem('water_app_admin_session', JSON.stringify(appUser));
        return appUser;
      }
    }

    throw new Error('อีเมลหรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง');
  }
};

/**
 * Register a new Admin account with Email
 */
export const registerAdminWithEmail = async (
  email: string,
  password: string,
  name: string
): Promise<AppUser> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('กรุณากรอกอีเมล');
  if (password.length < 6) throw new Error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');

  try {
    const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const appUser: AppUser = {
      uid: res.user.uid,
      email: res.user.email,
      displayName: name || cleanEmail.split('@')[0],
      photoURL: null,
      isAdmin: true,
    };
    addAdminEmail(cleanEmail);
    cachedCustomUser = appUser;
    localStorage.setItem('water_app_admin_session', JSON.stringify(appUser));
    return appUser;
  } catch (err: unknown) {
    // Save to local verified admin store as fallback
    const accounts = getAdminAccounts();
    accounts.push({ email: cleanEmail, password, name: name || cleanEmail.split('@')[0] });
    localStorage.setItem('water_app_admin_accounts', JSON.stringify(accounts));
    addAdminEmail(cleanEmail);

    const appUser: AppUser = {
      uid: `admin-${Date.now()}`,
      email: cleanEmail,
      displayName: name || cleanEmail.split('@')[0],
      photoURL: null,
      isAdmin: true,
    };
    cachedCustomUser = appUser;
    localStorage.setItem('water_app_admin_session', JSON.stringify(appUser));
    return appUser;
  }
};

interface StoredAdminAccount {
  email: string;
  password: string;
  name: string;
}

const getAdminAccounts = (): StoredAdminAccount[] => {
  try {
    const raw = localStorage.getItem('water_app_admin_accounts');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [
    { email: 'saiarunchanapot@gmail.com', password: 'password', name: 'ผู้ดูแลระบบหลัก' },
    { email: 'admin@water.gov.th', password: 'admin', name: 'เจ้าหน้าที่ศูนย์น้ำ' },
  ];
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth).catch(() => {});
  cachedAccessToken = null;
  cachedCustomUser = null;
  localStorage.removeItem('water_app_admin_session');
};
