'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { SimulationView } from '@/components/simulacion/simulation-view';
import { casesRepo } from '@/lib/repositories';
import type { ClinicalCase } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function SimulationPage() {
  const params = useParams<{ caseId: string }>();
  const [clinicalCase, setClinicalCase] = useState<ClinicalCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const c = await casesRepo.getById(params.caseId);
        if (!c) {
          setNotFoundState(true);
        } else {
          setClinicalCase(c);
        }
      } catch (err) {
        console.error('Error cargando caso:', err);
        setNotFoundState(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.caseId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFoundState || !clinicalCase) {
    notFound();
  }

  return (
    <div className="py-6">
      <SimulationView clinicalCase={clinicalCase} />
    </div>
  );
}
