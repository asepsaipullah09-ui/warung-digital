'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { Product } from '@/types';

export function Header() {
  const [isCompleted, setIsCompleted] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  const refreshStatus = async () => {
    if (!supabase || !isSupabaseConfigured) return;

    const [{ data: productRows }, { data: movementRows }, { data: opnameRows }] =
      await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('stock_movements')
          .select('product_id, quantity_base, movement_type'),
        supabase
          .from('daily_stock_opnames')
          .select('date')
          .eq('date', new Date().toISOString().slice(0, 10))
          .limit(1),
      ]);

    const stockMap = new Map<string, number>();
    for (const movement of movementRows ?? []) {
      const current = stockMap.get(movement.product_id) ?? 0;
      stockMap.set(
        movement.product_id,
        current + Number(movement.quantity_base ?? 0)
      );
    }

    const mappedProducts = (productRows ?? []).map((product) => ({
      ...product,
      current_stock_base: stockMap.get(product.id) ?? 0,
    })) as Product[];

    setProducts(mappedProducts);
    setIsCompleted((opnameRows ?? []).length > 0);
  };

  useEffect(() => {
    void refreshStatus();
    const interval = setInterval(() => void refreshStatus(), 3000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut listener (Cmd+F / Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header className="bg-white border-b border-gray-200/70 sticky top-0 z-30 px-3 sm:px-4 md:px-8 py-3 flex items-center justify-between gap-2 sm:gap-4 shadow-2xs">
        <div className="flex-1 max-w-md hidden sm:block">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full bg-gray-50 hover:bg-gray-100/80 border border-gray-200 text-gray-500 flex items-center justify-between px-3.5 py-2 rounded-xl text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-gray-400">⌕</span>
              <span>Cari produk, stok, atau rekap...</span>
            </div>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded-md text-[10px] font-mono text-gray-400 shadow-2xs">
              ⌘ F
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <Link
            href="/barang-masuk"
            className="hidden sm:flex items-center gap-1.5 bg-[#073b2a] hover:bg-[#0d684a] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>+ Barang Masuk</span>
          </Link>

          {isCompleted ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Rekap Selesai</span>
            </div>
          ) : (
            <Link
              href="/rekap-malam"
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-300 transition-colors animate-pulse"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Belum Rekap</span>
            </Link>
          )}

          <button aria-label="Notifikasi" className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors relative">
            <Bell className="w-4 h-4" />
            {!isCompleted && (
              <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1.5 right-1.5"></span>
            )}
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-8 h-8 rounded-full bg-[#073b2a] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              A
            </div>
            <div className="hidden xl:block text-left">
              <h4 className="text-xs font-bold text-gray-900 leading-none">Pak Asep</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Pemilik Warung</p>
            </div>
          </div>
        </div>
      </header>

      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Pencarian Cepat Warung"
      >
        <div className="space-y-3">
          <div className="relative">
            <span className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">⌕</span>
            <input
              type="text"
              autoFocus
              placeholder="Tulis nama produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pt-2">
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Tidak ada hasil ditemukan.</p>
            ) : (
              searchResults.map((p) => (
                <Link
                  key={p.id}
                  href="/stok"
                  onClick={() => setIsSearchOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 text-xs transition-colors"
                >
                  <span className="font-bold text-gray-900">{p.name}</span>
                  <span className="text-emerald-700 font-semibold">
                    Stok: {p.current_stock_base} {p.base_unit}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
