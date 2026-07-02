import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type Case } from "@/lib/types";

interface CaseHistoryTableProps {
  cases: Case[];
}

export function CaseHistoryTable({ cases }: CaseHistoryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Caso Clínico</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Puntaje</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map((caseItem) => (
          <TableRow key={caseItem.id} className="transition-colors hover:bg-slate-50/80">
            <TableCell className="font-medium text-slate-900">{caseItem.name}</TableCell>
            <TableCell className="text-muted-foreground">{caseItem.date}</TableCell>
            <TableCell>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white/70">
                {caseItem.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Badge
                variant={caseItem.score > 85 ? "default" : "secondary"}
                className={
                  caseItem.score > 85
                    ? 'rounded-full bg-emerald-600 px-3 py-1'
                    : 'rounded-full bg-amber-500 px-3 py-1 text-slate-900'
                }
              >
                {caseItem.score}%
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

