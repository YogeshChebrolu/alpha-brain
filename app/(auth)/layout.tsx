import { Brain } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-accent to-purple-700 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-10 h-10 text-white" />
          <span className="text-2xl font-bold text-white">Alpha Brain</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your Second Brain for
            <br />
            Ideas & Investments
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Capture raw intellectual dumps and transform them into actionable
            strategies. Track your investment theses and watch them grow.
          </p>
        </div>

        <p className="text-white/60 text-sm">
          &copy; 2024 Alpha Brain. All rights reserved.
        </p>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
