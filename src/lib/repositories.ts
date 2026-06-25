/**
 * Repositories — helpers tipados sobre Firestore.
 * Centraliza las queries para que los componentes no manipulen Firestore directamente.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  ClinicalCase,
  Attempt,
  UserProfile,
  Case,
} from './types';

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefined(entryValue)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

// ============================================================
// CASES
// ============================================================

export const casesRepo = {
  async getById(caseId: string): Promise<ClinicalCase | null> {
    const snap = await getDoc(doc(db, 'cases', caseId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as ClinicalCase;
  },

  async listPublished(opts?: { difficulty?: string; limit?: number }): Promise<ClinicalCase[]> {
    const constraints: QueryConstraint[] = [where('status', '==', 'published')];
    if (opts?.difficulty) constraints.push(where('difficulty', '==', opts.difficulty));
    constraints.push(orderBy('createdAt', 'desc'));
    if (opts?.limit) constraints.push(fbLimit(opts.limit));
    const snap = await getDocs(query(collection(db, 'cases'), ...constraints));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClinicalCase));
  },

  async listByAuthor(authorUid: string): Promise<ClinicalCase[]> {
    const snap = await getDocs(
      query(
        collection(db, 'cases'),
        where('authorUid', '==', authorUid),
        orderBy('updatedAt', 'desc')
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClinicalCase));
  },

  async create(data: Omit<ClinicalCase, 'id'>): Promise<string> {
    const now = Date.now();
    const ref = await addDoc(collection(db, 'cases'), stripUndefined({
      ...data,
      createdAt: now,
      updatedAt: now,
    }));
    return ref.id;
  },

  async update(caseId: string, data: Partial<ClinicalCase>): Promise<void> {
    await updateDoc(doc(db, 'cases', caseId), stripUndefined({
      ...data,
      updatedAt: Date.now(),
    }));
  },

  async remove(caseId: string): Promise<void> {
    await deleteDoc(doc(db, 'cases', caseId));
  },
};

// ============================================================
// ATTEMPTS
// ============================================================

export const attemptsRepo = {
  async getById(attemptId: string): Promise<Attempt | null> {
    const snap = await getDoc(doc(db, 'attempts', attemptId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Attempt;
  },

  async listByStudent(studentUid: string, limit = 20): Promise<Attempt[]> {
    const snap = await getDocs(
      query(
        collection(db, 'attempts'),
        where('studentUid', '==', studentUid),
        orderBy('startedAt', 'desc'),
        fbLimit(limit)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Attempt));
  },

  async create(data: Omit<Attempt, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'attempts'), data);
    return ref.id;
  },

  async update(attemptId: string, data: Partial<Attempt>): Promise<void> {
    await updateDoc(doc(db, 'attempts', attemptId), data);
  },

  async asHistoryItems(studentUid: string): Promise<Case[]> {
    const attempts = await this.listByStudent(studentUid);
    return attempts.map((a) => ({
      id: a.id,
      name: a.caseId, // El nombre real se rellena después con join al caso
      date: new Date(a.startedAt).toISOString().slice(0, 10),
      score: a.finalScore ?? 0,
      status: a.status === 'completed' ? 'Completado' : 'En progreso',
    }));
  },
};

// ============================================================
// USERS
// ============================================================

export const usersRepo = {
  async getProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  },

  async listAll(): Promise<UserProfile[]> {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => d.data() as UserProfile);
  },

  async listStudents(): Promise<UserProfile[]> {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
    return snap.docs.map((d) => d.data() as UserProfile);
  },

  async updateRole(uid: string, role: 'student' | 'professor' | 'admin'): Promise<void> {
    await updateDoc(doc(db, 'users', uid), { role, updatedAt: Date.now() });
  },
};
