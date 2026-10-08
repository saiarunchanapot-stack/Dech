import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { auth } from './auth';
import { WaterRequest } from '../types';

const DB_ID = 'ai-studio-waterrequestcris-c127e634-1fe7-4d45-a64a-60223f2b7374';
export const db = getFirestore(auth.app, DB_ID);

export interface SystemSettings {
  notifyEmail: string;
  notifyAllAdmins?: boolean;
  adminEmails?: string[];
  spreadsheetId: string;
  spreadsheetUrl: string;
  systemName: string;
  emergencyContacts: { id: string; name: string; number: string; category: string }[];
}

export const DEFAULT_SETTINGS: SystemSettings = {
  notifyEmail: 'saiarunchanapot@gmail.com',
  notifyAllAdmins: true,
  adminEmails: ['saiarunchanapot@gmail.com', 'admin@water.gov.th'],
  spreadsheetId: '',
  spreadsheetUrl: '',
  systemName: 'ศูนย์รับแจ้งปัญหาความต้องการน้ำ',
  emergencyContacts: [
    { id: '1', name: 'การประปานครหลวง (กปน.)', number: '1125', category: 'น้ำประปา' },
    { id: '2', name: 'การประปาส่วนภูมิภาค (กปภ.)', number: '1662', category: 'น้ำประปา' },
    { id: '3', name: 'แพทย์ฉุกเฉิน / กู้ชีพ', number: '1669', category: 'ฉุกเฉิน' },
    { id: '4', name: 'ดับเพลิง / กู้ภัย', number: '199', category: 'ฉุกเฉิน' },
    { id: '5', name: 'เหตุด่วนเหตุร้าย (ตำรวจ)', number: '191', category: 'ฉุกเฉิน' },
    { id: '6', name: 'อุบัติเหตุทางน้ำ', number: '1196', category: 'ทางน้ำ' },
  ],
};

export async function fetchFirestoreRequests(): Promise<WaterRequest[]> {
  try {
    const colRef = collection(db, 'water_requests');
    const snapshot = await getDocs(colRef);
    const list: WaterRequest[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as WaterRequest);
    });
    return list;
  } catch (e) {
    console.warn('Firestore fetch failed, using local cache:', e);
    return [];
  }
}

export async function saveRequestToFirestore(req: WaterRequest): Promise<void> {
  try {
    const docRef = doc(db, 'water_requests', req.id);
    await setDoc(docRef, req, { merge: true });
  } catch (e) {
    console.warn('Firestore save failed:', e);
  }
}

export async function deleteRequestFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'water_requests', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.warn('Firestore delete failed:', e);
  }
}

export async function clearAllRequestsFromFirestore(): Promise<void> {
  try {
    const colRef = collection(db, 'water_requests');
    const snapshot = await getDocs(colRef);
    const promises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(promises);
  } catch (e) {
    console.warn('Firestore clear failed:', e);
  }
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  try {
    const docRef = doc(db, 'settings', 'config');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SETTINGS, ...snap.data() } as SystemSettings;
    }
  } catch (e) {
    console.warn('Fetch settings from firestore failed, reading local:', e);
  }

  try {
    const saved = localStorage.getItem('water_app_system_settings');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }

  return DEFAULT_SETTINGS;
}

export async function saveSystemSettingsToFirestore(settings: SystemSettings): Promise<void> {
  localStorage.setItem('water_app_system_settings', JSON.stringify(settings));
  try {
    const docRef = doc(db, 'settings', 'config');
    await setDoc(docRef, settings, { merge: true });
  } catch (e) {
    console.warn('Save settings to firestore failed:', e);
  }
}
