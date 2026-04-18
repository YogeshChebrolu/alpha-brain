import Header from '@/components/layout/Header';
import BrainASCIIFooter from '@/components/layout/BrainASCIIFooter';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-32">
        {children}
      </main>
      <BrainASCIIFooter />
    </div>
  );
}
