import { studentData, caseHistory } from "@/lib/data";
import { StatCard } from "@/components/dashboard/stat-card";
import { CaseHistoryTable } from "@/components/dashboard/case-history-table";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, BarChart, GraduationCap, Percent } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Nivel Actual" 
          value={studentData.level}
          icon={GraduationCap}
        />
        <StatCard 
          title="Score Promedio" 
          value={`${studentData.averageScore}%`}
          icon={Percent}
        />
        <StatCard 
          title="Desempeño en Triage" 
          value={`${studentData.triagePerformance}%`}
          icon={Activity}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Progreso Académico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentData.academicProgress}%</div>
            <Progress value={studentData.academicProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Casos Completados</CardTitle>
          <CardDescription>Revisa tu desempeño en simulaciones anteriores.</CardDescription>
        </CardHeader>
        <CardContent>
          <CaseHistoryTable cases={caseHistory} />
        </CardContent>
      </Card>
    </div>
  );
}
