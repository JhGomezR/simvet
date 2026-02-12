import { ProfessorDashboard } from "@/components/profesor/professor-dashboard";
import { cohortPerformanceData, commonErrorsData, studentComparisonData } from "@/lib/data";

export default function ProfessorPage() {
    return (
        <div className="py-6">
            <ProfessorDashboard 
                cohortData={cohortPerformanceData}
                errorData={commonErrorsData}
                studentData={studentComparisonData}
            />
        </div>
    );
}
