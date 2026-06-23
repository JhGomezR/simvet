/**
 * scripts/seed-data.ts
 *
 * Migra los datos mock de src/lib/data.ts a Firestore.
 * Adicionalmente publica un caso clínico ampliado de referencia
 * (Shock Hipovolémico Canino) usando el modelo de Fase 3.
 *
 * USO:
 *   npx tsx scripts/seed-data.ts
 *
 * REQUISITOS:
 *   - service-account.json en la raíz del proyecto
 *   - Firestore habilitado en studio-5218936034-c34f1
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SEED_AUTHOR_EMAIL = 'jhgomez89@gmail.com';

async function main() {
  // Cargar service account
  const serviceAccountPath = resolve(process.cwd(), 'service-account.json');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  } catch {
    console.error('❌ No encontré service-account.json. Descárgalo de Firebase Console primero.');
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const db = getFirestore();
  const { getAuth } = await import('firebase-admin/auth');
  const auth = getAuth();

  // Buscar el admin para usarlo como authorUid del caso seed
  let authorUid = 'system';
  try {
    const adminUser = await auth.getUserByEmail(SEED_AUTHOR_EMAIL);
    authorUid = adminUser.uid;
    console.log(`✅ Usando admin ${SEED_AUTHOR_EMAIL} (uid: ${authorUid}) como autor`);
  } catch {
    console.log(`⚠ Admin ${SEED_AUTHOR_EMAIL} no encontrado, usando authorUid='system'.`);
    console.log('   Corre primero: npm run seed:admin');
  }

  const now = Date.now();

  // ============================================================
  // CASO 1 — Shock Hipovolémico Canino (modelo ampliado completo)
  // ============================================================
  const caso1 = {
    name: 'Shock Hipovolémico Canino',
    description:
      'Canino de 25 kg politraumatizado por accidente automovilístico. Presenta signos de shock hipovolémico descompensado.',
    difficulty: 'Intermedio',
    status: 'published',
    authorUid,
    patient: {
      id: 'P001',
      name: 'Rocky',
      species: 'Canino',
      breed: 'Labrador Retriever',
      age: '5 años',
      weightKg: 25,
      sex: 'Macho castrado',
      chiefComplaint: 'Atropellamiento hace 30 min, decaimiento severo y dificultad respiratoria',
      triage: 'Nivel I - Resucitación',
    },
    initialVitals: {
      heartRate: 180,
      respiratoryRate: 40,
      temperature: 37.2,
      systolicBP: 70,
      diastolicBP: 40,
      spO2: 88,
      capillaryRefillTime: 4,
      mucousColor: 'Pálidas',
      lactate: 6.5,
      perfusionStatus: 'Pobre',
      consciousnessLevel: 'Estuporoso',
    },
    anamnesis: [
      {
        id: 'a1',
        text: '¿Cuándo y cómo ocurrió el accidente?',
        ownerResponse:
          'Hace unos 30 minutos. Un carro lo embistió en la calle. Quedó tirado un momento y luego se levantó tambaleándose.',
        relevance: 'alta',
        category: 'historial',
      },
      {
        id: 'a2',
        text: '¿Ha vomitado o defecado sangre?',
        ownerResponse: 'No, pero he visto que respira muy raro y como que se queja.',
        relevance: 'alta',
        category: 'sintomas',
      },
      {
        id: 'a3',
        text: '¿Tiene el esquema de vacunación al día?',
        ownerResponse: 'Sí, lo vacuné hace 3 meses con la polivalente y la antirrábica.',
        relevance: 'media',
        category: 'vacunas',
      },
      {
        id: 'a4',
        text: '¿Toma alguna medicación o tiene enfermedades previas?',
        ownerResponse: 'No toma nada. Sólo el antipulgas mensual. Es sano de toda la vida.',
        relevance: 'media',
        category: 'historial',
      },
      {
        id: 'a5',
        text: '¿Vive en casa o en patio? ¿Tiene acceso a tóxicos?',
        ownerResponse: 'Vive con nosotros en la casa, no come nada raro.',
        relevance: 'baja',
        category: 'ambiente',
      },
      {
        id: 'a6',
        text: '¿Cuándo fue su última comida?',
        ownerResponse: 'Esta mañana, hace unas 4 horas, comió su ración normal.',
        relevance: 'media',
        category: 'alimentacion',
      },
    ],
    physicalExam: [
      {
        id: 'pe1',
        system: 'cardiovascular',
        technique: 'Auscultación cardíaca',
        finding: 'Taquicardia sinusal a 180 lpm, ruidos cardíacos apagados.',
        isAbnormal: true,
        relevance: 'alta',
      },
      {
        id: 'pe2',
        system: 'cardiovascular',
        technique: 'Palpación de pulso femoral',
        finding: 'Pulso femoral débil y filiforme, presión sistólica estimada 60-70 mmHg.',
        isAbnormal: true,
        relevance: 'alta',
      },
      {
        id: 'pe3',
        system: 'cardiovascular',
        technique: 'Evaluación de mucosas y TRC',
        finding: 'Mucosas pálidas, TRC > 3 segundos.',
        isAbnormal: true,
        relevance: 'alta',
      },
      {
        id: 'pe4',
        system: 'respiratorio',
        technique: 'Auscultación pulmonar',
        finding: 'Crepitaciones difusas en hemitórax derecho, hipoventilación basal.',
        isAbnormal: true,
        relevance: 'alta',
      },
      {
        id: 'pe5',
        system: 'digestivo',
        technique: 'Palpación abdominal',
        finding: 'Dolor a la palpación en cuadrante craneal derecho, distensión leve.',
        isAbnormal: true,
        relevance: 'alta',
      },
      {
        id: 'pe6',
        system: 'neurologico',
        technique: 'Evaluación neurológica básica',
        finding: 'Estuporoso, responde solo a estímulos dolorosos. Reflejos pupilares conservados.',
        isAbnormal: true,
        relevance: 'media',
      },
      {
        id: 'pe7',
        system: 'musculoesqueletico',
        technique: 'Palpación de extremidades',
        finding: 'Dolor en miembro posterior izquierdo, sin crepitación ósea evidente.',
        isAbnormal: true,
        relevance: 'media',
      },
    ],
    diagnosticTests: [
      {
        id: 't1',
        name: 'Hemograma completo',
        category: 'hematologia',
        costPoints: 5,
        timeMinutes: 10,
        results: [
          { parameter: 'Hematocrito', value: 28, unit: '%', referenceRange: '37-55%', flag: 'bajo' },
          { parameter: 'Hemoglobina', value: 9.2, unit: 'g/dL', referenceRange: '12-18 g/dL', flag: 'bajo' },
          { parameter: 'Leucocitos', value: 18000, unit: '/µL', referenceRange: '6000-17000/µL', flag: 'alto' },
          { parameter: 'Plaquetas', value: 220000, unit: '/µL', referenceRange: '200000-500000/µL', flag: 'normal' },
        ],
        interpretation:
          'Anemia regenerativa compatible con hemorragia aguda. Leucocitosis por estrés/dolor.',
      },
      {
        id: 't2',
        name: 'Ecografía FAST abdominal',
        category: 'imagen',
        costPoints: 8,
        timeMinutes: 5,
        results: [
          {
            parameter: 'Líquido libre abdominal',
            value: 'Positivo - cuadrante craneal derecho',
            flag: 'crítico',
          },
        ],
        interpretation:
          'Líquido libre compatible con hemoabdomen. Indicación de cirugía urgente.',
      },
      {
        id: 't3',
        name: 'Radiografía de tórax',
        category: 'imagen',
        costPoints: 7,
        timeMinutes: 15,
        results: [
          { parameter: 'Campos pulmonares', value: 'Contusión pulmonar bilateral', flag: 'alto' },
          { parameter: 'Silueta cardíaca', value: 'Normal', flag: 'normal' },
          { parameter: 'Fracturas costales', value: 'No evidentes', flag: 'normal' },
        ],
        interpretation: 'Contusión pulmonar moderada secundaria al trauma.',
      },
      {
        id: 't4',
        name: 'Gasometría arterial',
        category: 'gasometria',
        costPoints: 6,
        timeMinutes: 5,
        results: [
          { parameter: 'pH', value: 7.28, referenceRange: '7.35-7.45', flag: 'bajo' },
          { parameter: 'Lactato', value: 6.5, unit: 'mmol/L', referenceRange: '<2.5 mmol/L', flag: 'crítico' },
          { parameter: 'PaO2', value: 72, unit: 'mmHg', referenceRange: '>80 mmHg', flag: 'bajo' },
        ],
        interpretation: 'Acidosis metabólica con lactato elevado, signo de hipoperfusión tisular.',
      },
      {
        id: 't5',
        name: 'Bioquímica sanguínea básica',
        category: 'bioquimica',
        costPoints: 6,
        timeMinutes: 20,
        results: [
          { parameter: 'BUN', value: 35, unit: 'mg/dL', referenceRange: '7-27 mg/dL', flag: 'alto' },
          { parameter: 'Creatinina', value: 1.4, unit: 'mg/dL', referenceRange: '0.5-1.5 mg/dL', flag: 'normal' },
          { parameter: 'Glucosa', value: 145, unit: 'mg/dL', referenceRange: '70-110 mg/dL', flag: 'alto' },
        ],
        interpretation: 'Azotemia prerrenal por hipoperfusión. Hiperglucemia por estrés.',
      },
    ],
    differentials: [
      {
        id: 'd1',
        diagnosis: 'Shock hipovolémico hemorrágico (hemoabdomen post-trauma)',
        probabilityInitial: 70,
        isCorrect: true,
        confirmBy: ['t1', 't2', 't4'],
      },
      {
        id: 'd2',
        diagnosis: 'Shock distributivo séptico',
        probabilityInitial: 10,
        isCorrect: false,
        ruleOutBy: ['historial agudo trauma'],
      },
      {
        id: 'd3',
        diagnosis: 'Shock cardiogénico',
        probabilityInitial: 5,
        isCorrect: false,
        ruleOutBy: ['t3'],
      },
      {
        id: 'd4',
        diagnosis: 'Neumotórax traumático',
        probabilityInitial: 15,
        isCorrect: false,
        ruleOutBy: ['t3'],
      },
    ],
    finalDiagnosis: 'Shock hipovolémico hemorrágico por hemoabdomen secundario a trauma cerrado',
    treatmentPlan: [
      {
        id: 'tx1',
        name: 'Oxigenoterapia (mascarilla o flow-by)',
        category: 'oxigeno',
        route: 'IN',
        frequency: 'Continua',
        expectedEffect: { vitals: { spO2: 96, respiratoryRate: 30 } },
        isRecommended: true,
      },
      {
        id: 'tx2',
        name: 'Acceso venoso doble (cefálicas) + bolo de cristaloides',
        category: 'fluidos',
        drug: 'Lactato de Ringer',
        doseMgPerKg: 0, // se mide en ml/kg
        route: 'IV',
        frequency: 'Bolo 20 ml/kg en 15 min, reevaluar',
        expectedEffect: { vitals: { heartRate: 140, systolicBP: 90, perfusionStatus: 'Adecuada' } },
        isRecommended: true,
      },
      {
        id: 'tx3',
        name: 'Analgesia opioide',
        category: 'farmaco',
        drug: 'Metadona',
        doseMgPerKg: 0.2,
        route: 'IV',
        frequency: 'Cada 4-6 h',
        expectedEffect: { description: 'Reduce dolor, mejora confort.' },
        isRecommended: true,
      },
      {
        id: 'tx4',
        name: 'Transfusión de glóbulos rojos empaquetados',
        category: 'soporte',
        route: 'IV',
        frequency: '10-15 ml/kg en 4 h',
        expectedEffect: { vitals: { heartRate: 120 } },
        isRecommended: true,
      },
      {
        id: 'tx5',
        name: 'Cirugía exploratoria abdominal (laparotomía)',
        category: 'cirugia',
        frequency: 'Urgente tras estabilización',
        expectedEffect: { description: 'Control quirúrgico del foco hemorrágico.' },
        isRecommended: true,
      },
    ],
    idealPathway: [
      'Vía Aérea', 'Respiración', 'Circulación',
      'tx1', 'tx2',
      'pe1', 'pe2', 'pe3', 'pe4',
      'a1', 'a2',
      't2', 't1', 't4',
      'd1',
      'tx3', 'tx4', 'tx5',
    ],
    rubric: {
      triageWeight: 15,
      anamnesisWeight: 10,
      examWeight: 20,
      diagnosisWeight: 25,
      treatmentWeight: 25,
      communicationWeight: 5,
    },
    environmentalFactors: 'Animal urbano, acceso a calle. Riesgo de atropellamiento alto.',
    medicalFactors: 'Vacunación al día, sin antecedentes patológicos.',
    otherFactors: 'Propietario alerta y cooperativo. Capacidad económica para procedimientos quirúrgicos.',
    createdAt: now,
    updatedAt: now,
  };

  // Usamos un ID fijo '1' para retrocompatibilidad con la ruta /simulacion/1 existente
  await db.collection('cases').doc('1').set(caso1);
  console.log(`✅ Caso seed publicado: "${caso1.name}"`);

  // ============================================================
  // Caso 2 — más simple, para tener variedad
  // ============================================================
  const caso2 = {
    name: 'Obstrucción Uretral en Felino',
    description:
      'Felino macho de 4 años, sin orinar hace 36 horas, decaído. Diagnóstico clásico de FLUTD obstructiva.',
    difficulty: 'Intermedio',
    status: 'published',
    authorUid,
    patient: {
      id: 'P002',
      name: 'Milo',
      species: 'Felino',
      breed: 'Mestizo',
      age: '4 años',
      weightKg: 5.2,
      sex: 'Macho castrado',
      chiefComplaint: 'No orina hace 36 horas, decaído, llora cuando intenta orinar',
      triage: 'Nivel II - Emergencia',
    },
    initialVitals: {
      heartRate: 100, // bradicardia por hipercalemia
      respiratoryRate: 32,
      temperature: 36.5,
      systolicBP: 110,
      spO2: 94,
      capillaryRefillTime: 3,
      mucousColor: 'Pálidas',
      perfusionStatus: 'Adecuada',
      consciousnessLevel: 'Apagado',
    },
    finalDiagnosis: 'Obstrucción uretral con hipercalemia secundaria',
    rubric: {
      triageWeight: 15,
      anamnesisWeight: 10,
      examWeight: 20,
      diagnosisWeight: 25,
      treatmentWeight: 25,
      communicationWeight: 5,
    },
    createdAt: now,
    updatedAt: now,
  };
  await db.collection('cases').doc('2').set(caso2);
  console.log(`✅ Caso seed publicado: "${caso2.name}"`);

  console.log('\n✅ Seed de datos completado.\n');
  console.log('Datos creados:');
  console.log('  - cases/1: Shock Hipovolémico Canino (modelo ampliado completo)');
  console.log('  - cases/2: Obstrucción Uretral en Felino (modelo básico)');
  console.log('\nLas cohortes y errores comunes se calcularán dinámicamente desde "attempts".');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
