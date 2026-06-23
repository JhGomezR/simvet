'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { settingsRepo, clinicsRepo } from '@/lib/repositories.clinical';
import { DEFAULT_AI_DISCLAIMER } from '@/lib/types';
import type { Clinic, ClinicalFileType } from '@/lib/types';
import { AiDisclaimer } from '@/components/clinica/ai-disclaimer';
import {
  Loader2,
  Settings,
  Building2,
  ShieldCheck,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// ── Tipos de archivo permitidos ─────────────────────────────
const FILE_TYPES: { id: ClinicalFileType; label: string }[] = [
  { id: 'pdf', label: 'PDF' },
  { id: 'image', label: 'Imagen' },
  { id: 'docx', label: 'Word (DOCX)' },
  { id: 'txt', label: 'Texto (TXT)' },
];

// ── Schema de configuración del sistema ─────────────────────
const settingsSchema = z.object({
  maxUploadMb: z.coerce.number().int().min(1, 'Mínimo 1 MB.').max(500, 'Máximo 500 MB.'),
  allowedFileTypes: z
    .array(z.enum(['pdf', 'image', 'docx', 'txt', 'other']))
    .min(1, 'Selecciona al menos un tipo de archivo.'),
  aiEnabled: z.boolean(),
  semanticSearchEnabled: z.boolean(),
  ttsEnabled: z.boolean(),
  sttEnabled: z.boolean(),
  aiDisclaimer: z.string().min(10, 'El descargo debe tener al menos 10 caracteres.'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

// ── Schema de creación de veterinaria ───────────────────────
const clinicSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  legalId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Correo inválido.').optional().or(z.literal('')),
  city: z.string().optional(),
  active: z.boolean(),
});

type ClinicFormValues = z.infer<typeof clinicSchema>;

export default function ConfiguracionPage() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  // ── Estado de configuración ──
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // ── Estado de veterinarias ──
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [clinicsError, setClinicsError] = useState<string | null>(null);
  const [creatingClinic, setCreatingClinic] = useState(false);

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      maxUploadMb: 10,
      allowedFileTypes: ['pdf', 'image', 'docx', 'txt'],
      aiEnabled: true,
      semanticSearchEnabled: true,
      ttsEnabled: true,
      sttEnabled: true,
      aiDisclaimer: DEFAULT_AI_DISCLAIMER,
    },
  });

  const clinicForm = useForm<ClinicFormValues>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: '',
      legalId: '',
      address: '',
      phone: '',
      email: '',
      city: '',
      active: true,
    },
  });

  // ── Carga inicial de configuración ──
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingSettings(true);
      setSettingsError(null);
      try {
        const data = await settingsRepo.get();
        if (!active) return;
        if (data) {
          settingsForm.reset({
            maxUploadMb: data.maxUploadMb,
            allowedFileTypes: data.allowedFileTypes,
            aiEnabled: data.aiEnabled,
            semanticSearchEnabled: data.semanticSearchEnabled,
            ttsEnabled: data.ttsEnabled,
            sttEnabled: data.sttEnabled,
            aiDisclaimer: data.aiDisclaimer || DEFAULT_AI_DISCLAIMER,
          });
        }
      } catch (err) {
        if (active) {
          setSettingsError(
            err instanceof Error ? err.message : 'No se pudo cargar la configuración.'
          );
        }
      } finally {
        if (active) setLoadingSettings(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Carga de veterinarias ──
  async function loadClinics() {
    setLoadingClinics(true);
    setClinicsError(null);
    try {
      const list = await clinicsRepo.listActive();
      setClinics(list);
    } catch (err) {
      setClinicsError(
        err instanceof Error ? err.message : 'No se pudieron cargar las veterinarias.'
      );
    } finally {
      setLoadingClinics(false);
    }
  }

  useEffect(() => {
    loadClinics();
  }, []);

  // ── Guardar configuración ──
  async function onSaveSettings(data: SettingsFormValues) {
    setSavingSettings(true);
    try {
      await settingsRepo.set('global', {
        maxUploadMb: data.maxUploadMb,
        allowedFileTypes: data.allowedFileTypes,
        aiEnabled: data.aiEnabled,
        semanticSearchEnabled: data.semanticSearchEnabled,
        ttsEnabled: data.ttsEnabled,
        sttEnabled: data.sttEnabled,
        aiDisclaimer: data.aiDisclaimer,
        updatedAt: Date.now(),
        updatedBy: user?.uid,
      });
      toast({
        title: 'Configuración guardada',
        description: 'Los cambios de seguridad y privacidad se aplicaron correctamente.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar la configuración',
        description: err instanceof Error ? err.message : 'Verifica las reglas de Firestore.',
      });
    } finally {
      setSavingSettings(false);
    }
  }

  // ── Crear veterinaria ──
  async function onCreateClinic(data: ClinicFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'No autenticado' });
      return;
    }
    setCreatingClinic(true);
    try {
      await clinicsRepo.create({
        name: data.name,
        legalId: data.legalId || undefined,
        address: data.address || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        city: data.city || undefined,
        active: data.active,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user.uid,
      });
      toast({
        title: 'Veterinaria creada',
        description: `"${data.name}" se registró correctamente.`,
      });
      clinicForm.reset();
      await loadClinics();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al crear la veterinaria',
        description: err instanceof Error ? err.message : 'Verifica las reglas de Firestore.',
      });
    } finally {
      setCreatingClinic(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración del Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Seguridad, privacidad y gestión de veterinarias. Clínica activa:{' '}
            <span className="font-medium">{clinicId}</span>
          </p>
        </div>
      </div>

      {/* ── Configuración de seguridad y privacidad ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Seguridad y Privacidad
          </CardTitle>
          <CardDescription>
            Controla límites de carga, tipos de archivo permitidos y las funciones de IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando configuración…
            </div>
          ) : settingsError ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{settingsError}</span>
            </div>
          ) : (
            <Form {...settingsForm}>
              <form onSubmit={settingsForm.handleSubmit(onSaveSettings)} className="space-y-8">
                {/* Cargas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Cargas de Archivos</h3>
                  <FormField
                    control={settingsForm.control}
                    name="maxUploadMb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tamaño máximo de carga (MB)</FormLabel>
                        <FormControl>
                          <Input type="number" className="max-w-[200px]" {...field} />
                        </FormControl>
                        <FormDescription>
                          Límite por archivo subido a la historia clínica.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={settingsForm.control}
                    name="allowedFileTypes"
                    render={() => (
                      <FormItem>
                        <FormLabel>Tipos de archivo permitidos</FormLabel>
                        <FormDescription>
                          Selecciona los formatos que se pueden adjuntar.
                        </FormDescription>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {FILE_TYPES.map((ft) => (
                            <FormField
                              key={ft.id}
                              control={settingsForm.control}
                              name="allowedFileTypes"
                              render={({ field }) => {
                                const checked = field.value?.includes(ft.id);
                                return (
                                  <FormItem
                                    key={ft.id}
                                    className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(value) => {
                                          if (value) {
                                            field.onChange([...(field.value ?? []), ft.id]);
                                          } else {
                                            field.onChange(
                                              (field.value ?? []).filter((v) => v !== ft.id)
                                            );
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {ft.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Funciones de IA y voz */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Funciones de IA y Voz</h3>
                  {(
                    [
                      {
                        name: 'aiEnabled' as const,
                        label: 'Asistencia con IA',
                        desc: 'Habilita el análisis y extracción asistidos por inteligencia artificial.',
                      },
                      {
                        name: 'semanticSearchEnabled' as const,
                        label: 'Búsqueda semántica',
                        desc: 'Permite buscar casos clínicos similares por significado.',
                      },
                      {
                        name: 'ttsEnabled' as const,
                        label: 'Texto a voz (TTS)',
                        desc: 'Permite leer en voz alta los textos clínicos.',
                      },
                      {
                        name: 'sttEnabled' as const,
                        label: 'Voz a texto (STT)',
                        desc: 'Permite dictar consultas por voz.',
                      },
                    ]
                  ).map((sw) => (
                    <FormField
                      key={sw.name}
                      control={settingsForm.control}
                      name={sw.name}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5 pr-4">
                            <FormLabel className="text-base">{sw.label}</FormLabel>
                            <FormDescription>{sw.desc}</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <Separator />

                {/* Descargo de IA */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Descargo de Responsabilidad de IA</h3>
                  <FormField
                    control={settingsForm.control}
                    name="aiDisclaimer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto del descargo</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormDescription>
                          Este mensaje se muestra junto a cualquier salida generada por IA.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <p className="mb-2 text-sm font-medium text-muted-foreground">Vista previa:</p>
                    <AiDisclaimer message={settingsForm.watch('aiDisclaimer')} />
                  </div>
                </div>

                <Button type="submit" disabled={savingSettings}>
                  {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar configuración
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* ── Gestión de veterinarias ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Veterinarias
          </CardTitle>
          <CardDescription>
            Registra y consulta las veterinarias activas del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Listado */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Veterinarias activas</h3>
            {loadingClinics ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando veterinarias…
              </div>
            ) : clinicsError ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{clinicsError}</span>
              </div>
            ) : clinics.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No hay veterinarias registradas todavía. Crea la primera abajo.
              </div>
            ) : (
              <ul className="divide-y rounded-md border">
                {clinics.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[c.city, c.legalId, c.phone].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                      </p>
                    </div>
                    {c.active ? (
                      <Badge variant="secondary" className="shrink-0 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Activa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 gap-1">
                        <XCircle className="h-3 w-3" /> Inactiva
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Formulario de creación */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Registrar nueva veterinaria</h3>
            <Form {...clinicForm}>
              <form onSubmit={clinicForm.handleSubmit(onCreateClinic)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={clinicForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Veterinaria San Martín" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clinicForm.control}
                    name="legalId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIT / RUT</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: 900.123.456-7" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clinicForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Bogotá" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clinicForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: +57 300 000 0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clinicForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contacto@veterinaria.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clinicForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Calle 123 # 45-67" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={clinicForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5 pr-4">
                        <FormLabel className="text-base">Activa</FormLabel>
                        <FormDescription>
                          Las veterinarias inactivas no aparecen en los listados operativos.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={creatingClinic}>
                  {creatingClinic ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Crear veterinaria
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
