import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LBMTGST — LifeBridge MedTech GST/ERP',
  description: 'LifeBridge MedTech GST + ERP system on the shared Supabase platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
