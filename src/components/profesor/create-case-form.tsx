'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { casesRepo } from '@/lib/repositories';
import type { ClinicalCase } from '@/lib/types';

const caseFormSchema = z.object({
  name: z.string().min(5, 'El nombre debe tener al menos 5 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  difficulty: z.enum(['Básico', 'Intermedio', 'Avanzado']),
  patientName: z.string().min(2, 'El nombre del paciente es requerido.'),
  species: z.string().min(3, 'La especie es requerida.'),
  age: z.string().min(1, 'La edad es requerida.'),
  weight: z.string().min(1, 'El peso es requerido.'),
  chiefComplaint: z.string().min(10, 'El motivo de consulta es requerido.'),
  triage: z.enum(['Nivel I - Resucitación', 'Nivel II - Emergencia', 'Nivel III - Urgente']),
  imageUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  heartRate: z.coerce.number().int().min(0),
  respiratoryRate: z.coerce.number().int().min(0),
  temperature: z.coerce.number().min(0),
  perfusionStatus: z.enum(['Normal', 'Adecuada', 'Pobre', 'Crítica']),
  consciousnessLevel: z.enum(['Alerta', 'Apagado', 'Estuporoso', 'Comatoso']),
  environmentalFactors: z.string().optional(),
  medicalFactors: z.string().optional(),
  otherFactors: z.string().optional(),
  publishImmediately: z.boolean().optional(),
});

type CaseFormValues = z.infer<typeof caseFormSchema>;

interface CreateCaseFormProps {
  initialCase?: ClinicalCase | null;
}

function toDefaultValues(initialCase?: ClinicalCase | null): CaseFormValues {
  return {
    name: initialCase?.name ?? '',
    description: initialCase?.description ?? '',
    difficulty: initialCase?.difficulty ?? 'Intermedio',
    patientName: initialCase?.patient.name ?? '',
    species: initialCase?.patient.species ?? '',
    age: initialCase?.patient.age ?? '',
    weight: initialCase?.patient.weightKg ? String(initialCase.patient.weightKg) : '',
    chiefComplaint: initialCase?.patient.chiefComplaint ?? '',
    triage: initialCase?.patient.triage ?? 'Nivel II - Emergencia',
    imageUrl: initialCase?.patient.imageUrl ?? '',
    heartRate: initialCase?.initialVitals.heartRate ?? 120,
    respiratoryRate: initialCase?.initialVitals.respiratoryRate ?? 30,
    temperature: initialCase?.initialVitals.temperature ?? 38.5,
    perfusionStatus: initialCase?.initialVitals.perfusionStatus ?? 'Adecuada',
    consciousnessLevel: initialCase?.initialVitals.consciousnessLevel ?? 'Alerta',
    environmentalFactors: initialCase?.environmentalFactors ?? '',
    medicalFactors: initialCase?.medicalFactors ?? '',
    otherFactors: initialCase?.otherFactors ?? '',
    publishImmediately: (initialCase?.status ?? 'published') === 'published',
  };
}

export function CreateCaseForm({ initialCase }: CreateCaseFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const isEditing = Boolean(initialCase);

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: toDefaultValues(initialCase),
  });

  useEffect(() => {
    form.reset(toDefaultValues(initialCase));
  }, [form, initialCase]);

  async function onSubmit(data: CaseFormValues) {
    if (!user || !profile || (profile.role !== 'professor' && profile.role !== 'admin')) {
      toast({
        variant: 'destructive',
        title: isEditing ? 'No tienes permisos para editar casos' : 'No tienes permisos para crear casos',
      });
      return;
    }

    setSubmitting(true);
    try {
      const weightNum = parseFloat(data.weight.replace(/[^\d.]/g, '')) || 0;
      const payload = {
        name: data.name,
        description: data.description,
        difficulty: data.difficulty,
        status: data.publishImmediately ? 'published' : 'draft',
        authorUid: initialCase?.authorUid ?? user.uid,
        patient: {
          id: initialCase?.patient.id ?? `P${Date.now()}`,
          name: data.patientName,
          species: data.species,
          age: data.age,
          weightKg: weightNum,
          chiefComplaint: data.chiefComplaint,
          imageUrl: data.imageUrl || undefined,
          triage: data.triage,
          breed: initialCase?.patient.breed,
          sex: initialCase?.patient.sex,
        },
        initialVitals: {
          ...initialCase?.initialVitals,
          heartRate: data.heartRate,
          respiratoryRate: data.respiratoryRate,
          temperature: data.temperature,
          perfusionStatus: data.perfusionStatus,
          consciousnessLevel: data.consciousnessLevel,
        },
        environmentalFactors: data.environmentalFactors || undefined,
        medicalFactors: data.medicalFactors || undefined,
        otherFactors: data.otherFactors || undefined,
      } satisfies Omit<ClinicalCase, 'id'>;

      if (initialCase) {
        await casesRepo.update(initialCase.id, payload);
      } else {
        await casesRepo.create(payload);
      }

      toast({
        title: initialCase ? 'Caso clínico actualizado' : 'Caso clínico creado',
        description: `"${data.name}" ${data.publishImmediately ? 'publicado' : 'guardado como borrador'}.`,
      });
      router.push('/profesor');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: isEditing ? 'Error al actualizar el caso' : 'Error al guardar el caso',
        description: err instanceof Error ? err.message : 'Verifica las reglas de Firestore',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Caso Clínico' : 'Crear Nuevo Caso Clínico'}</CardTitle>
        <CardDescription>
          {isEditing
            ? 'Ajusta los datos del caso antes de publicarlo o dejarlo en borrador.'
            : 'Complete el formulario para crear una nueva simulación para los estudiantes.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información del Caso</h3>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Caso</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Shock Hipovolémico Canino" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describa brevemente el escenario clínico" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dificultad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un nivel de dificultad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Básico">Básico</SelectItem>
                        <SelectItem value="Intermedio">Intermedio</SelectItem>
                        <SelectItem value="Avanzado">Avanzado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información del Paciente</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="patientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Paciente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Rocky" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especie</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Canino" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 5 años" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 25 kg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="chiefComplaint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de Consulta</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describa el motivo de consulta principal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="triage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel de Triage</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione el nivel de triage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Nivel I - Resucitación">Nivel I - Resucitación</SelectItem>
                        <SelectItem value="Nivel II - Emergencia">Nivel II - Emergencia</SelectItem>
                        <SelectItem value="Nivel III - Urgente">Nivel III - Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de la Imagen del Paciente (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Signos Vitales Iniciales</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="heartRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frec. Cardíaca (lpm)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="respiratoryRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frec. Respiratoria (rpm)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperatura (°C)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="perfusionStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de Perfusión</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado de perfusión" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Adecuada">Adecuada</SelectItem>
                          <SelectItem value="Pobre">Pobre</SelectItem>
                          <SelectItem value="Crítica">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="consciousnessLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel de Conciencia</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un nivel de conciencia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Alerta">Alerta</SelectItem>
                          <SelectItem value="Apagado">Apagado</SelectItem>
                          <SelectItem value="Estuporoso">Estuporoso</SelectItem>
                          <SelectItem value="Comatoso">Comatoso</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Factores Adicionales</h3>
              <FormField
                control={form.control}
                name="environmentalFactors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factores Ambientales</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="medicalFactors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factores Médicos</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otherFactors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Otros Factores</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar cambios' : 'Crear y publicar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  form.setValue('publishImmediately', false);
                  void form.handleSubmit(onSubmit)();
                }}
              >
                Guardar como borrador
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
