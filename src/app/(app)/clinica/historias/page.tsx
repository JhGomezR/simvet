'use client';
/**
 * Historias clínicas con IA (núcleo del producto).
 *
 * Flujo:
 *  1) (Opcional) selección de mascota de la clínica.
 *  2) Subida de archivo (PDF/imagen/DOCX/TXT) a Firebase Storage.
 *  3) Creación del ClinicalDocument (processingStatus: 'pending').
 *  4) Procesamiento IA (processDocumentAction) → extracción estructurada.
 *  5) Render de la extracción + campos faltantes + <AiDisclaimer/>.
 *  6) Generación de simulación (generateSimulationAction) → casesRepo.create.
 *
 * Pestaña "Dictar por voz": crea una historia desde un dictado (source: 'dictation').
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Loader2,
  Mic,
  MicOff,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useSpeechToText } from '@/hooks/use-speech';
import { AiDisclaimer } from '@/components/clinica/ai-disclaimer';

import { petsRepo, clinicalDocumentsRepo } from '@/lib/repositories.clinical';
import { casesRepo } from '@/lib/repositories';
import { processDocumentAction } from '@/app/actions/process-document';
import { generateSimulationAction } from '@/app/actions/generate-simulation';
import type {
  Pet,
  ClinicalDocument,
  ClinicalExtraction,
  ClinicalFileType,
} from '@/lib/types';

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ACCEPTED_TYPES: Record<string, ClinicalFileType> = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  'text/plain': 'txt',
};

type SimLevel = 'Básico' | 'Intermedio' | 'Avanzado';

function fileTypeFromMime(mime: string): ClinicalFileType {
  return ACCEPTED_TYPES[mime] ?? 'other';
}

function readAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

// ── Render de listas de la extracción ──────────────────────────
function ExtractionList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function ExtractionField({ title, value }: { title: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function buildClinicalTextFromDocument(doc: ClinicalDocument): string {
  return (
    doc.extraction?.summary?.trim() ||
    [
      doc.extraction?.symptoms?.join(', '),
      doc.extraction?.diagnosis?.join(', '),
      doc.extraction?.treatment?.join(', '),
      doc.extraction?.evolution,
      doc.extractedText,
    ]
      .filter(Boolean)
      .join('. ')
  );
}

export default function HistoriasIAPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  // ── Estado de mascotas ──
  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);

  // ── Estado de procesamiento ──
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ClinicalExtraction | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [manualClinicalText, setManualClinicalText] = useState('');

  // ── Generación de simulación ──
  const [level, setLevel] = useState<SimLevel>('Intermedio');
  const [generating, setGenerating] = useState(false);

  // ── Dictado por voz ──
  const { listening, transcript, supported, start, stop, reset, setTranscript } =
    useSpeechToText('es-CO');

  useEffect(() => {
    let active = true;
    (async () => {
      setPetsLoading(true);
      setPetsError(null);
      try {
        const list = await petsRepo.listByClinic(clinicId);
        if (active) setPets(list);
      } catch (err) {
        if (active)
          setPetsError(
            err instanceof Error ? err.message : 'No se pudieron cargar las mascotas.'
          );
      } finally {
        if (active) setPetsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clinicId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await clinicalDocumentsRepo.listByClinic(clinicId, 12);
        if (active) setDocuments(list);
      } catch (err) {
        console.error('No se pudieron cargar las historias clínicas:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [clinicId]);

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId),
    [pets, selectedPetId]
  );

  const petId = selectedPetId || undefined;

  function resetResults() {
    setExtraction(null);
    setRawText('');
    setManualClinicalText('');
    setActionError(null);
    setActiveDocumentId(null);
  }

  function useDocumentAsBase(doc: ClinicalDocument) {
    setActiveDocumentId(doc.id);
    setExtraction(doc.extraction ?? null);
    setRawText(doc.extractedText ?? '');
    setManualClinicalText(buildClinicalTextFromDocument(doc));
    setActionError(null);
    toast({
      title: 'Historia seleccionada',
      description: 'Esta historia quedó como base activa para generar la simulación.',
    });
  }

  async function refreshDocuments() {
    try {
      const list = await clinicalDocumentsRepo.listByClinic(clinicId, 12);
      setDocuments(list);
    } catch (err) {
      console.error('No se pudo refrescar la lista de historias:', err);
    }
  }

  // ── 2-5: Subida + procesamiento del archivo ──
  async function handleFile(file: File) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Debes iniciar sesión.' });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({
        variant: 'destructive',
        title: 'Archivo demasiado grande',
        description: 'El tamaño máximo permitido es 20 MB.',
      });
      return;
    }
    const fileType = fileTypeFromMime(file.type);
    if (fileType === 'other') {
      toast({
        variant: 'destructive',
        title: 'Tipo de archivo no soportado',
        description: 'Sube un PDF, imagen, DOCX o TXT.',
      });
      return;
    }

    resetResults();
    setProcessing(true);
    try {
      // Subir a Firebase Storage
      const storagePath = `clinical/${clinicId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const storageUrl = await getDownloadURL(storageRef);

      // Crear el documento clínico (pending)
      const documentId = await clinicalDocumentsRepo.create({
        clinicId,
        petId,
        fileName: file.name,
        fileType,
        storageUrl,
        storagePath,
        sizeBytes: file.size,
        uploadedBy: user.uid,
        uploadedAt: Date.now(),
        processingStatus: 'pending',
        source: 'upload',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user.uid,
      });

      // Convertir a data URI y procesar con IA
      const dataUri = await readAsDataUri(file);
      const result = await processDocumentAction({
        documentId,
        clinicId,
        petId,
        fileType,
        dataUri,
        contentType: file.type,
      });

      if (!result.ok) {
        setActionError(result.error ?? 'No se pudo procesar el documento.');
        toast({
          variant: 'destructive',
          title: 'Error al procesar',
          description: result.error ?? 'Intenta nuevamente.',
        });
        return;
      }

      setExtraction(result.extraction ?? null);
      setRawText(result.rawText);
      setManualClinicalText(result.rawText);
      setActiveDocumentId(documentId);
      await refreshDocuments();
      toast({
        title: 'Historia procesada',
        description: 'La extracción con IA está lista para revisión.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir o procesar el archivo.';
      setActionError(msg);
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setProcessing(false);
    }
  }

  // ── Procesamiento del dictado ──
  async function handleDictation() {
    if (!user) {
      toast({ variant: 'destructive', title: 'Debes iniciar sesión.' });
      return;
    }
    const text = transcript.trim();
    if (text.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Dictado muy corto',
        description: 'Dicta al menos una frase con la información clínica.',
      });
      return;
    }

    resetResults();
    setProcessing(true);
    try {
      const documentId = await clinicalDocumentsRepo.create({
        clinicId,
        petId,
        fileName: `Dictado ${new Date().toLocaleString('es-CO')}`,
        fileType: 'txt',
        storageUrl: '',
        storagePath: '',
        sizeBytes: text.length,
        uploadedBy: user.uid,
        uploadedAt: Date.now(),
        processingStatus: 'pending',
        source: 'dictation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user.uid,
      });

      const result = await processDocumentAction({
        documentId,
        clinicId,
        petId,
        fileType: 'txt',
        rawText: text,
      });

      if (!result.ok) {
        setActionError(result.error ?? 'No se pudo procesar el dictado.');
        toast({
          variant: 'destructive',
          title: 'Error al procesar',
          description: result.error ?? 'Intenta nuevamente.',
        });
        return;
      }

      setExtraction(result.extraction ?? null);
      setRawText(result.rawText);
      setManualClinicalText(result.rawText);
      setActiveDocumentId(documentId);
      await refreshDocuments();
      toast({
        title: 'Dictado procesado',
        description: 'La extracción con IA está lista para revisión.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el dictado.';
      setActionError(msg);
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setProcessing(false);
    }
  }

  // ── 6: Generar simulación a partir de la extracción ──
  async function handleGenerateSimulation() {
    if (!user) {
      toast({ variant: 'destructive', title: 'Debes iniciar sesión.' });
      return;
    }
    const clinicalText =
      manualClinicalText.trim() ||
      extraction?.summary?.trim() ||
      [
        extraction?.symptoms?.join(', '),
        extraction?.diagnosis?.join(', '),
        extraction?.treatment?.join(', '),
        extraction?.evolution,
      ]
        .filter(Boolean)
        .join('. ') ||
      rawText;

    if (!clinicalText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Sin contenido clínico',
        description: 'Procesa una historia antes de generar la simulación.',
      });
      return;
    }

    setGenerating(true);
    try {
      const res = await generateSimulationAction({
        clinicalText,
        level,
        sourceDocumentId: activeDocumentId ?? undefined,
        sourcePetId: petId,
      });
      if (!res.ok || !res.case) {
        toast({
          variant: 'destructive',
          title: 'Error al generar la simulación',
          description: res.error ?? 'Intenta nuevamente.',
        });
        return;
      }

      const caseId = await casesRepo.create({
        ...res.case,
        authorUid: user.uid,
        status: 'draft',
      });

      toast({
        title: 'Simulación generada',
        description: res.error
          ? 'El caso se guardó como borrador usando una generación de respaldo.'
          : 'El caso se guardó como borrador.',
      });
      router.push(`/simulacion/${caseId}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al generar la simulación',
        description: err instanceof Error ? err.message : 'Intenta nuevamente.',
      });
    } finally {
      setGenerating(false);
    }
  }

  // ── Selector de mascota (compartido entre pestañas) ──
  const petSelector = (
    <div className="space-y-2">
      <Label htmlFor="pet-select">Mascota (opcional)</Label>
      {petsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando mascotas...
        </div>
      ) : petsError ? (
        <p className="text-sm text-destructive">{petsError}</p>
      ) : (
        <Select
          value={selectedPetId || 'none'}
          onValueChange={(v) => setSelectedPetId(v === 'none' ? '' : v)}
        >
          <SelectTrigger id="pet-select">
            <SelectValue placeholder="Sin asociar a una mascota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin asociar</SelectItem>
            {pets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} {p.species ? `· ${p.species}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {pets.length === 0 && !petsLoading && !petsError && (
        <p className="text-xs text-muted-foreground">
          No hay mascotas registradas en la clínica. Puedes continuar sin asociar.
        </p>
      )}
      {selectedPet && (
        <p className="text-xs text-muted-foreground">
          Se asociará a <span className="font-medium">{selectedPet.name}</span>.
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Stethoscope className="h-6 w-6" /> Historias clínicas con IA
        </h1>
        <p className="text-muted-foreground">
          Sube o dicta una historia clínica y deja que la IA extraiga la información y genere
          una simulación.
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="mr-2 h-4 w-4" /> Subir archivo
          </TabsTrigger>
          <TabsTrigger value="dictation">
            <Mic className="mr-2 h-4 w-4" /> Dictar por voz
          </TabsTrigger>
        </TabsList>

        {/* ── Subir archivo ── */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Subir historia clínica</CardTitle>
              <CardDescription>
                Formatos aceptados: PDF, imagen, DOCX o TXT. Tamaño máximo 20 MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {petSelector}

              <div className="space-y-2">
                <Label htmlFor="file-input">Archivo</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,application/pdf,image/*,text/plain"
                  disabled={processing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = '';
                  }}
                />
              </div>

              {processing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Subiendo y procesando con IA...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Dictar por voz ── */}
        <TabsContent value="dictation">
          <Card>
            <CardHeader>
              <CardTitle>Dictar historia clínica</CardTitle>
              <CardDescription>
                Dicta la información del paciente y la IA la estructurará automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {petSelector}

              {!supported ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    El reconocimiento de voz no está disponible en este navegador. Puedes escribir
                    la historia manualmente abajo.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {listening ? (
                    <Button type="button" variant="destructive" onClick={stop}>
                      <MicOff className="mr-2 h-4 w-4" /> Detener
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={start}>
                      <Mic className="mr-2 h-4 w-4" /> Dictar
                    </Button>
                  )}
                  {listening && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      Escuchando...
                    </span>
                  )}
                  <Button type="button" variant="ghost" onClick={reset} disabled={!transcript}>
                    Limpiar
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="dictation-text">Transcripción</Label>
                <Textarea
                  id="dictation-text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="El texto dictado aparecerá aquí. También puedes escribir o corregir manualmente."
                  className="min-h-[140px]"
                />
              </div>

              <Button
                type="button"
                onClick={() => void handleDictation()}
                disabled={processing || transcript.trim().length < 10}
              >
                {processing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Procesar dictado con IA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Historias recientes de la clínica</CardTitle>
          <CardDescription>
            Puedes cargar varias historias y reutilizarlas como base para nuevos análisis y simulaciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay historias clínicas registradas en esta clínica.
            </p>
          ) : (
            documents.map((doc) => {
              const linkedPet = doc.petId ? pets.find((pet) => pet.id === doc.petId) : null;
              return (
                <div key={doc.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {linkedPet ? `${linkedPet.name} · ` : 'Sin mascota asociada · '}
                        {new Date(doc.createdAt).toLocaleString('es-CO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeDocumentId === doc.id && <Badge>Base activa</Badge>}
                      <Badge variant={doc.processingStatus === 'completed' ? 'default' : 'secondary'}>
                        {doc.processingStatus}
                      </Badge>
                    </div>
                  </div>
                  {doc.extraction?.summary && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {doc.extraction.summary}
                    </p>
                  )}
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => useDocumentAsBase(doc)}
                    >
                      Usar como base de simulación
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── Error de procesamiento ── */}
      {actionError && (
        <Card className="border-destructive">
          <CardContent className="flex items-start gap-2 pt-6 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{actionError}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Resultado de la extracción ── */}
      {extraction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Extracción de la IA
            </CardTitle>
            <CardDescription>
              Revisa y valida la información extraída antes de generar la simulación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AiDisclaimer />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ExtractionField title="Especie" value={extraction.species} />
              <ExtractionField title="Raza" value={extraction.breed} />
              <ExtractionField title="Paciente" value={extraction.patientName} />
              <ExtractionField title="Propietario" value={extraction.ownerName} />
              <ExtractionField title="Edad" value={extraction.age} />
              <ExtractionField title="Sexo" value={extraction.sex} />
              <ExtractionField title="Peso" value={extraction.weight} />
            </div>

            <ExtractionList title="Síntomas" items={extraction.symptoms} />
            <ExtractionList title="Antecedentes" items={extraction.antecedents} />
            <ExtractionList title="Diagnóstico" items={extraction.diagnosis} />
            <ExtractionList title="Tratamiento" items={extraction.treatment} />
            <ExtractionList title="Medicamentos" items={extraction.medications} />
            <ExtractionField title="Evolución" value={extraction.evolution} />
            <ExtractionField title="Resumen" value={extraction.summary} />

            {/* Campos faltantes */}
            {extraction.missingFields && extraction.missingFields.length > 0 ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700/60 dark:bg-amber-950/40">
                <h4 className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4" /> Campos faltantes por completar
                </h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {extraction.missingFields.map((f, i) => (
                    <Badge key={i} variant="outline" className="border-amber-400 text-amber-900 dark:text-amber-200">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> No se detectaron campos faltantes.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="manual-clinical-text">Base clínica para la simulación</Label>
              <Textarea
                id="manual-clinical-text"
                value={manualClinicalText}
                onChange={(e) => setManualClinicalText(e.target.value)}
                placeholder="Aquí puedes completar o corregir el texto base que usará la simulación cuando la IA no logre interpretar todo el documento."
                className="min-h-[140px]"
              />
              <p className="text-xs text-muted-foreground">
                Este texto se usará como fuente principal para generar la simulación y alimentar el razonamiento del caso.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Generar simulación ── */}
      {extraction && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Generar simulación
            </CardTitle>
            <CardDescription>
              Crea un caso de simulación a partir de esta historia clínica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 sm:max-w-xs">
              <Label htmlFor="level-select">Nivel de dificultad</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as SimLevel)}>
                <SelectTrigger id="level-select">
                  <SelectValue placeholder="Selecciona un nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Básico">Básico</SelectItem>
                  <SelectItem value="Intermedio">Intermedio</SelectItem>
                  <SelectItem value="Avanzado">Avanzado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="button" onClick={() => void handleGenerateSimulation()} disabled={generating}>
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generar simulación
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
