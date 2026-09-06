import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WarungKu - Manajemen Stok & Laba Warung',
  description: 'Aplikasi Manajemen Stok Warung Digital, Barang Masuk, Rekap Malam & Perhitungan Laba Otomatis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-[#f3f5f8] text-slate-900 antialiased h-screen overflow-hidden flex flex-col md:flex-row`}>
        {/* Independent Desktop Sidebar */}
        <Sidebar />

        {/* Independent Main Content Column */}
        <div className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0 pb-16 md:pb-0">
          <Header />
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </body>
    </html>
  );
}
