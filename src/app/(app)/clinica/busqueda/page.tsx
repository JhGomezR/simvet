'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Search,
  Loader2,
  AlertCircle,
  FileText,
  PawPrint,
  Sparkles,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { AiDisclaimer } from '@/components/clinica/ai-disclaimer';
import {
  semanticSearchAction,
  type SemanticSearchResponse,
} from '@/app/actions/semantic-search';
import type { SemanticSearchResult } from '@/lib/types';

const searchFormSchema = z.object({
  query: z
    .string()
    .min(5, 'Describe los signos o síntomas a buscar (mín. 5 caracteres).'),
});

type SearchFormValues = z.infer<typeof searchFormSchema>;

/** Convierte la distancia COSINE (menor = más similar) en un % de similitud aprox. */
function similarityPercent(distance: number): number {
  const sim = (1 - distance) * 100;
  return Math.max(0, Math.min(100, Math.round(sim)));
}

export default function BusquedaSemanticaPage() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: { query: '' },
  });

  async function onSubmit(data: SearchFormValues) {
    setSearching(true);
    setErrorMsg(null);
    try {
      const res: SemanticSearchResponse = await semanticSearchAction({
        query: data.query,
        clinicId,
      });
      setHasSearched(true);

      if (!res.ok) {
        setResults([]);
        setErrorMsg(
          res.error ??
            'La búsqueda semántica no está disponible en este momento.'
        );
        return;
      }

      setResults(res.results);
    } catch (err) {
      setHasSearched(true);
      setResults([]);
      const message =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al buscar.';
      setErrorMsg(message);
      toast({
        variant: 'destructive',
        title: 'Error en la búsqueda',
        description: message,
      });
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" />
          Búsqueda Semántica de Historias Clínicas
        </h1>
        <p className="text-muted-foreground">
          Encuentra casos clínicos similares describiendo signos, síntomas o
          diagnósticos en lenguaje natural.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Describe el caso a buscar</CardTitle>
          <CardDescription>
            La IA buscará historias clínicas con contenido parecido a tu
            descripción.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consulta</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Ej: perro con vómito, fiebre y diarrea de varios días"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Escribe en lenguaje natural. Cuanto más detalle, mejores
                      resultados.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={searching}>
                {searching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Buscar casos similares
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Aviso de IA responsable */}
      <AiDisclaimer />

      {/* Estado de error (incluye ok:false por falta de credenciales) */}
      {errorMsg && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No se pudo completar la búsqueda</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Estado de carga */}
      {searching && (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Buscando historias clínicas similares...</span>
        </div>
      )}

      {/* Estado vacío (búsqueda hecha, sin error, sin resultados) */}
      {!searching && hasSearched && !errorMsg && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <Search className="h-8 w-8" />
            <p className="font-medium">No se encontraron casos similares</p>
            <p className="text-sm">
              Intenta describir el caso con otros términos o más detalle.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {!searching && results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {results.length}{' '}
            {results.length === 1
              ? 'caso similar encontrado'
              : 'casos similares encontrados'}
          </h2>
          {results.map((r) => {
            const sim = similarityPercent(r.distance);
            const ex = r.extraction;
            const summary =
              ex?.summary ??
              (ex?.diagnosis && ex.diagnosis.length > 0
                ? ex.diagnosis.join(', ')
                : r.chunkText);
            return (
              <Card key={r.documentId}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {ex?.patientName
                        ? ex.patientName
                        : 'Historia clínica'}
                      {ex?.species && (
                        <span className="text-sm font-normal text-muted-foreground">
                          · {ex.species}
                          {ex.breed ? ` (${ex.breed})` : ''}
                        </span>
                      )}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {sim}% similitud
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {summary}
                  </p>

                  {ex?.symptoms && ex.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ex.symptoms.map((s, i) => (
                        <Badge key={i} variant="outline">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {r.petId && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/clinica/mascotas/${r.petId}`}>
                        <PawPrint className="mr-2 h-4 w-4" />
                        Ver mascota
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
