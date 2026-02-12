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
          <TableHead className="text-right">Puntaje</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map((caseItem) => (
          <TableRow key={caseItem.id}>
            <TableCell className="font-medium">{caseItem.name}</TableCell>
            <TableCell>{caseItem.date}</TableCell>
            <TableCell className="text-right">
                <Badge variant={caseItem.score > 85 ? "default" : "secondary"} className={caseItem.score > 85 ? 'bg-green-600' : 'bg-amber-500'}>
                    {caseItem.score}%
                </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
