'use client';

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

const caseFormSchema = z.object({
  // Case info
  name: z.string().min(5, 'El nombre debe tener al menos 5 caracteres.'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres.'),
  difficulty: z.enum(['Básico', 'Intermedio', 'Avanzado']),

  // Patient info
  patientName: z.string().min(2, 'El nombre del paciente es requerido.'),
  species: z.string().min(3, 'La especie es requerida.'),
  age: z.string().min(1, 'La edad es requerida.'),
  weight: z.string().min(1, 'El peso es requerido.'),
  chiefComplaint: z.string().min(10, 'El motivo de consulta es requerido.'),
  triage: z.enum(['Nivel I - Resucitación', 'Nivel II - Emergencia', 'Nivel III - Urgente']),
  imageUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  
  // Initial Vitals
  heartRate: z.coerce.number().int().min(0),
  respiratoryRate: z.coerce.number().int().min(0),
  temperature: z.coerce.number().min(0),
  perfusionStatus: z.enum(['Normal', 'Poor', 'Adequate']),
  consciousnessLevel: z.enum(['Alert', 'Dull', 'Comatose', 'Estuporoso']),

  // Additional factors
  environmentalFactors: z.string().optional(),
  medicalFactors: z.string().optional(),
  otherFactors: z.string().optional(),
});

type CaseFormValues = z.infer<typeof caseFormSchema>;

export function CreateCaseForm() {
  const { toast } = useToast();
  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      name: '',
      description: '',
      difficulty: 'Intermedio',
      patientName: '',
      species: '',
      age: '',
      weight: '',
      chiefComplaint: '',
      triage: 'Nivel II - Emergencia',
      imageUrl: '',
      heartRate: 120,
      respiratoryRate: 30,
      temperature: 38.5,
      perfusionStatus: 'Adequate',
      consciousnessLevel: 'Alert',
      environmentalFactors: '',
      medicalFactors: '',
      otherFactors: '',
    },
  });

  function onSubmit(data: CaseFormValues) {
    console.log(data);
    toast({
      title: 'Caso Clínico Creado',
      description: `El caso "${data.name}" ha sido creado exitosamente.`,
    });
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Nuevo Caso Clínico</CardTitle>
        <CardDescription>
          Complete el formulario para crear una nueva simulación para los estudiantes.
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                          <SelectItem value="Adequate">Adequate</SelectItem>
                          <SelectItem value="Poor">Poor</SelectItem>
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
                          <SelectItem value="Alert">Alert</SelectItem>
                          <SelectItem value="Dull">Dull</SelectItem>
                          <SelectItem value="Estuporoso">Estuporoso</SelectItem>
                          <SelectItem value="Comatose">Comatose</SelectItem>
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
                      <Textarea placeholder="Describa factores ambientales relevantes (ej: vive en departamento, acceso a patio...)" {...field} />
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
                      <Textarea placeholder="Describa historial médico relevante (ej: sufre de alergias, enfermedad crónica...)" {...field} />
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
                      <Textarea placeholder="Cualquier otro factor o información relevante para el caso" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit">Crear Caso Clínico</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
