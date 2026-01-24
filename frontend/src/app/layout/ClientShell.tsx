import React from "react";

type ClientShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function ClientShell({ children, title, subtitle }: ClientShellProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <header className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-5 py-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              D
            </div>
            <span className="text-xl font-bold tracking-tight">Diba Restaurant</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{title ?? "Reserve a table"}</h1>
            {subtitle ? <p className="text-slate-600 text-lg">{subtitle}</p> : null}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 flex-grow w-full">
        {children}
      </main>

      <footer className="border-t border-slate-100 bg-slate-50 mt-10">
        <div className="max-w-3xl mx-auto px-5 py-8 grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="font-semibold">Visit Us</p>
            <p className="text-slate-600 text-sm leading-relaxed">
              6520 Somerled Ave,<br />
              Montreal, Quebec, H4V 1S8
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Contact</p>
            <p className="text-slate-600 text-sm">
              <a href="tel:+15144859999" className="hover:underline">(514) 485-9999</a>
            </p>
            <p className="text-slate-600 text-sm italic">Bring your own wine 🍷</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-5 py-4 border-t border-slate-100 text-center flex justify-between items-center">
          <p className="text-xs text-slate-400">© 2025 Diba Restaurant. All Reserved.</p>
          <a href="/admin/login" className="text-xs text-slate-300 hover:text-slate-500 transition-colors">Admin</a>
        </div>
      </footer>
    </div>
  );
}

