'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { CreateCaseForm } from '@/components/profesor/create-case-form';
import { casesRepo } from '@/lib/repositories';
import type { ClinicalCase } from '@/lib/types';

export default function EditCasePage() {
  const params = useParams<{ caseId: string }>();
  const [clinicalCase, setClinicalCase] = useState<ClinicalCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await casesRepo.getById(params.caseId);
        if (!result) {
          setMissing(true);
          return;
        }
        setClinicalCase(result);
      } catch (err) {
        console.error('Error cargando el caso:', err);
        setMissing(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.caseId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (missing || !clinicalCase) {
    notFound();
  }

  return (
    <div className="py-6">
      <CreateCaseForm initialCase={clinicalCase} />
    </div>
  );
}
