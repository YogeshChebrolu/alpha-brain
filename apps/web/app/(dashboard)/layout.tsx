import Header from '@/components/layout/Header';
import DemoBanner from '@/components/layout/DemoBanner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Banner + header stick together so the demo warning stays visible on scroll */}
      <div className="sticky top-0 z-30">
        <DemoBanner />
        <Header />
      </div>
      <main className="flex-1 container mx-auto px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
