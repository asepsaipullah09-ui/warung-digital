'use client';

import React, { useEffect, useState } from 'react';
import { Boxes, Search, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMultiUnitStock, formatRupiah } from '@/lib/utils';
import { warungStore } from '@/lib/store/warungStore';
import { Product } from '@/types';

export default function StokPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AMAN' | 'MENIPIS' | 'HABIS'>('ALL');

  const loadData = () => {
    warungStore.initializeDefaultDataIfEmpty();
    setProducts(warungStore.getProducts());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    let status = 'AMAN';
    if (p.current_stock_base === 0) status = 'HABIS';
    else if (p.current_stock_base <= p.minimum_stock) status = 'MENIPIS';

    const matchesStatus = statusFilter === 'ALL' || statusFilter === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Boxes className="w-6 h-6 text-emerald-600" />
          Kondisi Stok Realtime
        </h1>
        <p className="text-sm text-gray-500">
          Monitor jumlah fisik barang dalam satuan dasar dan format konversi manusia (contoh: 9 bungkus + 9 batang).
        </p>
      </div>

      {/* Search & Filter Controls */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                statusFilter === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('AMAN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                statusFilter === 'AMAN' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Stok Aman
            </button>
            <button
              onClick={() => setStatusFilter('MENIPIS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                statusFilter === 'MENIPIS' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Stok Menipis
            </button>
            <button
              onClick={() => setStatusFilter('HABIS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                statusFilter === 'HABIS' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Stok Habis
            </button>
          </div>
        </div>
      </Card>

      {/* Stock Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase">
              <tr>
                <th className="p-4">Produk</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Stok Base</th>
                <th className="p-4">Tampilan Satuan Mudah Dibaca</th>
                <th className="p-4">Minimum</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Tidak ada data stok produk.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  let statusVariant: 'emerald' | 'amber' | 'red' = 'emerald';
                  let statusText = 'Aman';
                  if (p.current_stock_base === 0) {
                    statusVariant = 'red';
                    statusText = 'Habis';
                  } else if (p.current_stock_base <= p.minimum_stock) {
                    statusVariant = 'amber';
                    statusText = 'Menipis';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4 font-bold text-gray-900">{p.name}</td>
                      <td className="p-4 text-xs text-gray-500">{p.category_name}</td>
                      <td className="p-4 font-extrabold text-gray-900">
                        {p.current_stock_base} <span className="font-normal text-xs text-gray-500">{p.base_unit}</span>
                      </td>
                      <td className="p-4 font-semibold text-emerald-800">
                        {formatMultiUnitStock(p.current_stock_base, p.base_unit, p.units)}
                      </td>
                      <td className="p-4 text-xs text-gray-500">
                        {p.minimum_stock} {p.base_unit}
                      </td>
                      <td className="p-4">
                        <Badge variant={statusVariant}>{statusText}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
