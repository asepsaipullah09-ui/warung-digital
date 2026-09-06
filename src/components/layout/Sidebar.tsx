'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, Moon, UserCheck, Boxes, History, BarChart3, Settings, Store, Smartphone, ChevronRight, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

export const navGroups = [
  { title: 'MENU UTAMA', items: [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Rekap Malam', href: '/rekap-malam', icon: Moon, badge: 'Penting' },
    { label: 'Barang Masuk', href: '/barang-masuk', icon: ShoppingBag },
    { label: 'Pemakaian Pribadi', href: '/pemakaian-pribadi', icon: UserCheck },
    { label: 'Kas / Laci', href: '/kas', icon: Wallet },
  ]},
  { title: 'STOK & MASTER', items: [
    { label: 'Master Barang', href: '/barang', icon: Package },
    { label: 'Stok Realtime', href: '/stok', icon: Boxes },
  ]},
  { title: 'ANALISIS & UTILITIES', items: [
    { label: 'Riwayat Audit', href: '/riwayat', icon: History },
    { label: 'Laporan Keuangan', href: '/laporan', icon: BarChart3 },
    { label: 'Pengaturan Database', href: '/pengaturan', icon: Settings },
  ]},
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileAppModalOpen, setIsMobileAppModalOpen] = useState(false);
  return <>
    <aside className="hidden md:flex flex-col w-64 border-r border-gray-200/70 bg-white h-screen sticky top-0 shrink-0 z-20">
      <div className="p-5 flex items-center justify-between border-b border-gray-100 shrink-0"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#073b2a] text-emerald-400 flex items-center justify-center shadow-md shadow-[#073b2a]/20"><Store className="w-5 h-5" /></div><div><h1 className="font-extrabold text-gray-900 text-lg tracking-tight leading-none">WarungKu</h1><p className="text-[11px] text-gray-400 font-medium mt-1">Management Suite</p></div></div></div>
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">{navGroups.map((group, gIdx) => <div key={gIdx} className="space-y-1"><h3 className="px-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-2">{group.title}</h3>{group.items.map((item) => { const Icon = item.icon; const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/')); return <Link key={item.href} href={item.href} className={cn('flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 relative group', isActive ? 'bg-[#073b2a] text-white font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}><div className="flex items-center gap-3"><Icon className={cn('w-4 h-4 transition-colors', isActive ? 'text-emerald-400' : 'text-gray-400 group-hover:text-gray-600')} /><span>{item.label}</span></div>{item.badge && <span className={cn('text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full', isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-100 text-amber-800')}>{item.badge}</span>}</Link>; })}</div>)}</nav>
      <div className="p-3 border-t border-gray-100 bg-gray-50/50 shrink-0"><div className="bg-gradient-to-br from-[#073b2a] to-[#0d684a] text-white p-4 rounded-2xl shadow-md relative overflow-hidden"><div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 mb-2"><Smartphone className="w-4 h-4" /></div><h4 className="font-bold text-xs">Versi HP & Tablet</h4><p className="text-[11px] text-emerald-100/80 mt-0.5 leading-snug">Akses cepat saat keliling warung.</p><button onClick={() => setIsMobileAppModalOpen(true)} className="mt-3 w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#073b2a] font-extrabold rounded-xl text-[11px] transition-colors flex items-center justify-center gap-1 shadow-sm">Mode HP / PWA <ChevronRight className="w-3.5 h-3.5" /></button></div></div>
    </aside>
    <Modal isOpen={isMobileAppModalOpen} onClose={() => setIsMobileAppModalOpen(false)} title="Dukungan Perangkat HP & Mobile"><div className="space-y-4 text-xs text-gray-600"><div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3"><Smartphone className="w-8 h-8 text-emerald-700 shrink-0" /><div><h4 className="font-bold text-sm text-emerald-900">Aplikasi Web Sangat Responsive</h4><p className="text-emerald-800 text-[11px]">Aplikasi ini sudah dioptimalkan 100% untuk layar smartphone (iOS & Android).</p></div></div><div className="space-y-2"><h5 className="font-bold text-gray-900">Cara Tambah ke Layar Utama HP (PWA):</h5><ol className="list-decimal list-inside space-y-1 text-gray-700"><li>Buka URL aplikasi di browser Chrome atau Safari HP.</li><li>Klik menu browser (titik tiga atau tombol Share).</li><li>Pilih <strong>"Add to Home Screen" / "Tambah ke Layar Utama"</strong>.</li><li>Aplikasi akan terpasang di HP seperti aplikasi Android/iOS native!</li></ol></div><div className="pt-3 border-t border-gray-100 flex justify-end"><button onClick={() => setIsMobileAppModalOpen(false)} className="px-4 py-2 bg-[#073b2a] text-white font-bold text-xs rounded-xl">Tutup</button></div></div></Modal>
  </>;
}
