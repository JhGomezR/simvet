import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { UniversityLogo } from "@/components/icons";
import { studentData } from "@/lib/data";
import { PageHeader } from "@/components/page-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-card sm:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-lg"
          >
            <UniversityLogo className="h-8 w-8" />
            <span className="">SimVet</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
            <MainNav />
        </div>
      </aside>
      <div className="flex flex-col sm:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card px-6">
            <PageHeader />
            <div className="sm:hidden">
              {/* Placeholder for mobile nav trigger */}
            </div>
            <UserNav student={studentData} />
        </header>
        <main className="flex-1 gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
        </main>
      </div>
    </div>
  );
}
