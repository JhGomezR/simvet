import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  import type { StudentComparisonData } from "@/lib/types";
  
  interface StudentComparisonProps {
    data: StudentComparisonData[];
  }
  
  export function StudentComparison({ data }: StudentComparisonProps) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estudiante</TableHead>
            <TableHead>Casos Completados</TableHead>
            <TableHead>Score Promedio</TableHead>
            <TableHead className="text-right">Desempeño en Triage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">{student.name}</TableCell>
              <TableCell>{student.casesCompleted}</TableCell>
              <TableCell>{student.averageScore}%</TableCell>
              <TableCell className="text-right">{student.triagePerformance}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  