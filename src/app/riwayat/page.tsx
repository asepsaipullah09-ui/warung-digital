'use client';

import React, { useEffect, useState } from 'react';
import { History, ShoppingBag, Moon, UserCheck, RefreshCw, Calendar, Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatDateIndo, formatRupiah } from '@/lib/utils';
import { warungStore } from '@/lib/store/warungStore';
import { Purchase, DailyStockOpname, PersonalUsage, StockAdjustment } from '@/types';

export default function RiwayatPage() {
  const [activeTab, setActiveTab] = useState<'MASUK' | 'REKAP' | 'PRIBADI' | 'KOREKSI'>('REKAP');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [opnames, setOpnames] = useState<DailyStockOpname[]>([]);
  const [usages, setUsages] = useState<PersonalUsage[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);

  const [selectedOpname, setSelectedOpname] = useState<DailyStockOpname | null>(null);

  const loadData = () => {
    warungStore.initializeDefaultDataIfEmpty();
    setPurchases(warungStore.getPurchases());
    setOpnames(warungStore.getDailyOpnames());
    setUsages(warungStore.getPersonalUsages());
    setAdjustments(warungStore.getStockAdjustments());
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="w-6 h-6 text-emerald-600" />
          Riwayat & Audit Log Traksaksi
        </h1>
        <p className="text-sm text-gray-500">
          Lihat rekam jejak lengkap barang masuk, opname malam, pemakaian pribadi, dan koreksi stok.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('REKAP')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'REKAP'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Moon className="w-4 h-4" />
          Rekap Malam ({opnames.length})
        </button>

        <button
          onClick={() => setActiveTab('MASUK')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'MASUK'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Barang Masuk ({purchases.length})
        </button>

        <button
          onClick={() => setActiveTab('PRIBADI')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'PRIBADI'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Pemakaian Pribadi ({usages.length})
        </button>

        <button
          onClick={() => setActiveTab('KOREKSI')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'KOREKSI'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Koreksi Stok ({adjustments.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'REKAP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opnames.length === 0 ? (
            <Card className="col-span-full text-center py-12 text-gray-400">Belum ada riwayat rekap malam.</Card>
          ) : (
            opnames.map((op) => (
              <Card key={op.id} className="hover:border-emerald-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                  <div>
                    <h3 className="font-bold text-base text-gray-900">{formatDateIndo(op.date)}</h3>
                    <span className="text-xs text-gray-400">{op.items.length} jenis produk direkap</span>
                  </div>
                  <Badge variant="emerald">COMPLETED</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-2.5 rounded-xl mb-3">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Omzet</span>
                    <span className="font-bold text-emerald-700 text-sm">{formatRupiah(op.total_omzet || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Modal</span>
                    <span className="font-semibold text-gray-700 text-sm">{formatRupiah(op.total_modal || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase">Laba</span>
                    <span className="font-extrabold text-blue-700 text-sm">{formatRupiah(op.total_laba || 0)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOpname(op)}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Lihat Detail Per Produk
                </button>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'MASUK' && (
        <div className="space-y-3">
          {purchases.length === 0 ? (
            <Card className="text-center py-12 text-gray-400">Belum ada riwayat barang masuk.</Card>
          ) : (
            purchases.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-sm text-gray-900">{formatDateIndo(p.date)}</span>
                  </div>
                  <span className="font-extrabold text-emerald-800 text-base">{formatRupiah(p.total_cost)}</span>
                </div>
                {p.note && <p className="text-xs text-gray-500 italic mb-2">"{p.note}"</p>}
                <div className="space-y-1">
                  {p.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                      <span className="font-semibold">{it.product_name}</span>
                      <span>
                        {it.quantity} {it.unit_name} (@ {formatRupiah(it.cost_price)}) = <strong>{formatRupiah(it.subtotal)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'PRIBADI' && (
        <div className="space-y-3">
          {usages.length === 0 ? (
            <Card className="text-center py-12 text-gray-400">Belum ada pemakaian pribadi.</Card>
          ) : (
            usages.map((u) => (
              <Card key={u.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{u.product_name}</h4>
                  <p className="text-xs text-purple-700 font-semibold mt-0.5">
                    Jumlah: {u.quantity} {u.unit_name} ({u.quantity_base} base unit)
                  </p>
                  {u.note && <p className="text-xs text-gray-500 italic mt-0.5">"{u.note}"</p>}
                </div>
                <span className="text-xs text-gray-400">{formatDateIndo(u.date)}</span>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'KOREKSI' && (
        <div className="space-y-3">
          {adjustments.length === 0 ? (
            <Card className="text-center py-12 text-gray-400">Belum ada riwayat koreksi stok.</Card>
          ) : (
            adjustments.map((adj) => (
              <Card key={adj.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{adj.product_name}</h4>
                  <p className="text-xs text-amber-700 font-semibold mt-0.5">
                    Koreksi ({adj.adjustment_type}): {adj.quantity_base} unit base
                  </p>
                  <p className="text-xs text-gray-500 italic">Alasan: "{adj.reason}"</p>
                </div>
                <span className="text-xs text-gray-400">{formatDateIndo(adj.date)}</span>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Detail Modal for Opname */}
      <Modal
        isOpen={Boolean(selectedOpname)}
        onClose={() => setSelectedOpname(null)}
        title={`Detail Rekap Malam: ${selectedOpname ? formatDateIndo(selectedOpname.date) : ''}`}
        maxWidth="2xl"
      >
        {selectedOpname && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center bg-gray-50 p-3 rounded-xl">
              <div>
                <span className="text-xs text-gray-400 block uppercase">Total Omzet</span>
                <span className="font-extrabold text-emerald-700">{formatRupiah(selectedOpname.total_omzet || 0)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block uppercase">Total Modal</span>
                <span className="font-bold text-gray-700">{formatRupiah(selectedOpname.total_modal || 0)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block uppercase">Total Laba</span>
                <span className="font-extrabold text-blue-700">{formatRupiah(selectedOpname.total_laba || 0)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">Produk</th>
                    <th className="p-2.5">Sistem</th>
                    <th className="p-2.5">Fisik</th>
                    <th className="p-2.5">Pakai Sendiri</th>
                    <th className="p-2.5">Terjual</th>
                    <th className="p-2.5 text-right">Omzet</th>
                    <th className="p-2.5 text-right">Laba</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedOpname.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2.5 font-bold text-gray-900">{it.product_name}</td>
                      <td className="p-2.5 text-gray-500">{it.system_stock_base}</td>
                      <td className="p-2.5 font-bold text-gray-900">{it.physical_stock_base}</td>
                      <td className="p-2.5 text-purple-700">{it.personal_use_base}</td>
                      <td className="p-2.5 font-bold text-emerald-800">{it.calculated_sales_base}</td>
                      <td className="p-2.5 text-right font-semibold">{formatRupiah(it.selling_amount)}</td>
                      <td className="p-2.5 text-right font-bold text-blue-700">{formatRupiah(it.profit_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
