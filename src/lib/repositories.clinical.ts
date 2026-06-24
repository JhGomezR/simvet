/**
 * Repositorios de SimVet Clinical — gestión veterinaria (datos reales).
 *
 * Centraliza el acceso a Firestore para las nuevas colecciones clínicas.
 * Se mantiene separado de `repositories.ts` (dominio de simulación) para
 * dejar claro el límite entre datos REALES y datos SIMULADOS.
 *
 * Patrón: una fábrica genérica `makeRepo` cubre el CRUD común; cada dominio
 * añade sólo las queries específicas que necesita.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
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
  Clinic,
  Owner,
  Pet,
  Consultation,
  Vaccination,
  Deworming,
  Prescription,
  LabExam,
  ClinicalDocument,
  DocumentChunk,
  SystemSettings,
} from './types';

// ── Helpers ─────────────────────────────────────────────────

type WithId = { id: string };

function snapToData<T extends WithId>(snap: { id: string; data: () => unknown }): T {
  return { id: snap.id, ...(snap.data() as object) } as T;
}

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

/**
 * Fábrica de repositorio CRUD genérico para una colección de nivel raíz.
 * `T` debe incluir `id`, `createdAt`, `updatedAt`.
 */
function makeRepo<T extends WithId & { createdAt?: number; updatedAt?: number }>(
  collectionName: string
) {
  const col = () => collection(db, collectionName);

  return {
    collectionName,

    async getById(id: string): Promise<T | null> {
      const snap = await getDoc(doc(db, collectionName, id));
      if (!snap.exists()) return null;
      return snapToData<T>(snap as never);
    },

    async list(constraints: QueryConstraint[] = []): Promise<T[]> {
      const snap = await getDocs(query(col(), ...constraints));
      return snap.docs.map((d) => snapToData<T>(d as never));
    },

    /** Lista todos los documentos de una clínica, ordenados por creación desc. */
    async listByClinic(clinicId: string, max?: number): Promise<T[]> {
      const constraints: QueryConstraint[] = [
        where('clinicId', '==', clinicId),
        orderBy('createdAt', 'desc'),
      ];
      if (max) constraints.push(fbLimit(max));
      return this.list(constraints);
    },

    async create(data: Omit<T, 'id'>): Promise<string> {
      const now = Date.now();
      const ref = await addDoc(col(), stripUndefined({
        ...data,
        createdAt: (data as { createdAt?: number }).createdAt ?? now,
        updatedAt: now,
      }));
      return ref.id;
    },

    /** Crea (o sobreescribe) con un id explícito. Útil para singletons. */
    async set(id: string, data: Omit<T, 'id'>): Promise<void> {
      const now = Date.now();
      await setDoc(doc(db, collectionName, id), stripUndefined({
        ...data,
        updatedAt: now,
      }));
    },

    async update(id: string, data: Partial<T>): Promise<void> {
      await updateDoc(doc(db, collectionName, id), stripUndefined({
        ...data,
        updatedAt: Date.now(),
      }));
    },

    async remove(id: string): Promise<void> {
      await deleteDoc(doc(db, collectionName, id));
    },
  };
}

// ── Repos por dominio ───────────────────────────────────────

export const clinicsRepo = {
  ...makeRepo<Clinic>('clinics'),
  async listActive(): Promise<Clinic[]> {
    return this.list([where('active', '==', true), orderBy('name', 'asc')]);
  },
};

export const ownersRepo = {
  ...makeRepo<Owner>('owners'),
  async searchByName(clinicId: string, term: string): Promise<Owner[]> {
    // Firestore no soporta full-text; se filtra en cliente sobre la lista.
    const all = await this.listByClinic(clinicId);
    const t = term.toLowerCase();
    return all.filter(
      (o) =>
        o.firstName.toLowerCase().includes(t) ||
        o.lastName.toLowerCase().includes(t) ||
        (o.idDocument ?? '').toLowerCase().includes(t)
    );
  },
};

export const petsRepo = {
  ...makeRepo<Pet>('pets'),
  async listByOwner(ownerId: string): Promise<Pet[]> {
    return this.list([where('ownerId', '==', ownerId), orderBy('createdAt', 'desc')]);
  },
};

export const consultationsRepo = {
  ...makeRepo<Consultation>('consultations'),
  async listByPet(petId: string, max = 50): Promise<Consultation[]> {
    return this.list([where('petId', '==', petId), orderBy('date', 'desc'), fbLimit(max)]);
  },
  async listByVet(vetUid: string, max = 50): Promise<Consultation[]> {
    return this.list([where('vetUid', '==', vetUid), orderBy('date', 'desc'), fbLimit(max)]);
  },
};

export const vaccinationsRepo = {
  ...makeRepo<Vaccination>('vaccinations'),
  async listByPet(petId: string): Promise<Vaccination[]> {
    return this.list([where('petId', '==', petId), orderBy('appliedDate', 'desc')]);
  },
};

export const dewormingsRepo = {
  ...makeRepo<Deworming>('dewormings'),
  async listByPet(petId: string): Promise<Deworming[]> {
    return this.list([where('petId', '==', petId), orderBy('appliedDate', 'desc')]);
  },
};

export const prescriptionsRepo = {
  ...makeRepo<Prescription>('prescriptions'),
  async listByPet(petId: string): Promise<Prescription[]> {
    return this.list([where('petId', '==', petId), orderBy('date', 'desc')]);
  },
};

export const labExamsRepo = {
  ...makeRepo<LabExam>('labExams'),
  async listByPet(petId: string): Promise<LabExam[]> {
    return this.list([where('petId', '==', petId), orderBy('requestedDate', 'desc')]);
  },
};

export const clinicalDocumentsRepo = {
  ...makeRepo<ClinicalDocument>('clinicalDocuments'),
  async listByPet(petId: string): Promise<ClinicalDocument[]> {
    return this.list([where('petId', '==', petId), orderBy('uploadedAt', 'desc')]);
  },
};

export const documentChunksRepo = {
  ...makeRepo<DocumentChunk & { updatedAt?: number }>('documentChunks'),
  async listByDocument(documentId: string): Promise<DocumentChunk[]> {
    return this.list([where('documentId', '==', documentId), orderBy('index', 'asc')]) as Promise<
      DocumentChunk[]
    >;
  },
};

/** Configuración global del sistema (documento singleton `global`). */
export const settingsRepo = {
  ...makeRepo<SystemSettings>('systemSettings'),
  SINGLETON_ID: 'global',
  async get(): Promise<SystemSettings | null> {
    return this.getById('global');
  },
};
