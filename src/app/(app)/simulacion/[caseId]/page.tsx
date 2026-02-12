import { clinicalCases } from "@/lib/data";
import { SimulationView } from "@/components/simulacion/simulation-view";
import { notFound } from "next/navigation";

export default function SimulationPage({ params }: { params: { caseId: string } }) {
  const clinicalCase = clinicalCases[params.caseId];

  if (!clinicalCase) {
    notFound();
  }

  return (
    <div className="py-6">
        <SimulationView clinicalCase={clinicalCase} />
    </div>
  );
}
