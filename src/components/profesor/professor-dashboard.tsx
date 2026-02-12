"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CohortAnalysis } from "./cohort-analysis";
import { CommonErrorsAnalysis } from "./common-errors-analysis";
import { StudentComparison } from "./student-comparison";
import type { CohortPerformanceData, CommonErrorData, StudentComparisonData } from "@/lib/types";

interface ProfessorDashboardProps {
    cohortData: CohortPerformanceData[];
    errorData: CommonErrorData[];
    studentData: StudentComparisonData[];
}

export function ProfessorDashboard({ cohortData, errorData, studentData }: ProfessorDashboardProps) {
  return (
    <Tabs defaultValue="cohort">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
        <TabsTrigger value="cohort">Desempeño por Cohorte</TabsTrigger>
        <TabsTrigger value="errors">Mapa de Errores</TabsTrigger>
        <TabsTrigger value="comparison">Comparativa</TabsTrigger>
        <TabsTrigger value="longitudinal">Evolución Semestral</TabsTrigger>
      </TabsList>
      <TabsContent value="cohort">
        <Card>
          <CardHeader>
            <CardTitle>Desempeño por Cohorte</CardTitle>
            <CardDescription>Visualización del puntaje promedio de la cohorte a lo largo del tiempo.</CardDescription>
          </CardHeader>
          <CardContent>
            <CohortAnalysis data={cohortData} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="errors">
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Errores Frecuentes</CardTitle>
            <CardDescription>Identificación de los errores más comunes y sus posibles causas.</CardDescription>
          </CardHeader>
          <CardContent>
            <CommonErrorsAnalysis data={errorData} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="comparison">
        <Card>
          <CardHeader>
            <CardTitle>Comparativa entre Estudiantes</CardTitle>
            <CardDescription>Análisis comparativo del rendimiento individual de los estudiantes.</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentComparison data={studentData} />
          </CardContent>
        </Card>
      </TabsContent>
       <TabsContent value="longitudinal">
        <Card>
          <CardHeader>
            <CardTitle>Evolución Longitudinal por Semestre</CardTitle>
            <CardDescription>Seguimiento del progreso de los estudiantes a lo largo de varios semestres (Próximamente).</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Funcionalidad en desarrollo.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
