'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Moon, Boxes, Menu, X, ShoppingBag, UserCheck, History, BarChart3, Settings, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const primaryItems = [
    { label: 'Beranda', href: '/', icon: LayoutDashboard },
    { label: 'Barang', href: '/barang', icon: Package },
    { label: 'Rekap', href: '/rekap-malam', icon: Moon, isPrimaryAction: true },
    { label: 'Stok', href: '/stok', icon: Boxes },
  ];
  const moreItems = [
    { label: 'Kas / Laci', href: '/kas', icon: Wallet, desc: 'Saldo, kas masuk & keluar' },
    { label: 'Barang Masuk', href: '/barang-masuk', icon: ShoppingBag, desc: 'Catat belanja grosir' },
    { label: 'Pemakaian Pribadi', href: '/pemakaian-pribadi', icon: UserCheck, desc: 'Barang yang dipakai sendiri' },
    { label: 'Riwayat', href: '/riwayat', icon: History, desc: 'Log barang masuk, opname & koreksi' },
    { label: 'Laporan', href: '/laporan', icon: BarChart3, desc: 'Omzet, laba & grafik produk' },
    { label: 'Pengaturan', href: '/pengaturan', icon: Settings, desc: 'Supabase & data backup' },
  ];
  return <>
    {isMenuOpen && <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"><div className="bg-white rounded-t-2xl p-5 border-t border-gray-100 shadow-2xl max-h-[85vh] overflow-y-auto"><div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100"><h3 className="font-bold text-gray-900 text-base">Menu Lainnya</h3><button onClick={() => setIsMenuOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button></div><div className="grid grid-cols-1 gap-2">{moreItems.map((item) => { const Icon = item.icon; const isActive = pathname === item.href; return <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} className={cn('flex items-center gap-3.5 p-3.5 rounded-xl transition-all', isActive ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100')}><div className={cn('p-2 rounded-lg', isActive ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 shadow-xs')}><Icon className="w-5 h-5" /></div><div><div className="text-sm font-medium">{item.label}</div><div className="text-xs text-gray-400 font-normal">{item.desc}</div></div></Link>; })}</div></div></div>}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-1.5 sm:px-3 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">{primaryItems.map((item) => { const Icon = item.icon; const isActive = pathname === item.href; if (item.isPrimaryAction) return <Link key={item.href} href={item.href} className="flex flex-col items-center -mt-5 relative z-10"><div className="w-13 h-13 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 ring-4 ring-white active:scale-95 transition-transform"><Moon className="w-6 h-6 fill-emerald-600" /></div><span className="text-[11px] font-bold text-emerald-700 mt-0.5">Rekap</span></Link>; return <Link key={item.href} href={item.href} className={cn('flex flex-col items-center py-1 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-colors', isActive ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900')}><Icon className={cn('w-5 h-5 mb-0.5', isActive ? 'text-emerald-600' : 'text-gray-400')} /><span>{item.label}</span></Link>; })}<button aria-label="Buka menu lainnya" onClick={() => setIsMenuOpen(!isMenuOpen)} className={cn('flex flex-col items-center py-1 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-medium transition-colors', isMenuOpen ? 'text-emerald-600 font-bold' : 'text-gray-500 hover:text-gray-900')}><Menu className="w-5 h-5 mb-0.5 text-gray-400" /><span>Lainnya</span></button></div>
  </>;
}
