'use client';

import React, { useEffect, useState } from 'react';
import { UserCheck, Plus, Calendar, History, Package, DollarSign, Wallet, ArrowDownRight, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDateIndo, getTodayDateString, formatMultiUnitStock, formatRupiah } from '@/lib/utils';
import { warungStore } from '@/lib/store/warungStore';
import { Product, PersonalUsage, PersonalUsageType } from '@/types';

export default function PemakaianPribadiPage() {
  const [usageType, setUsageType] = useState<PersonalUsageType>('BARANG');
  const [products, setProducts] = useState<Product[]>([]);
  const [usages, setUsages] = useState<PersonalUsage[]>([]);

  // Form State - BARANG
  const [productId, setProductId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Form State - UANG_CASH
  const [amountCash, setAmountCash] = useState<number>(15000);

  // Common Form State
  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');

  const loadData = () => {
    warungStore.initializeDefaultDataIfEmpty();
    const prods = warungStore.getProducts();
    const usgs = warungStore.getPersonalUsages();
    setProducts(prods);
    setUsages(usgs);

    if (prods.length > 0 && !productId) {
      const first = prods[0];
      setProductId(first.id);
      const defaultUnit = first.units.find((u) => u.is_default) || first.units[0];
      setUnitId(defaultUnit?.id || '');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedUnit = selectedProduct?.units.find((u) => u.id === unitId);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find((prod) => prod.id === id);
    const defaultUnit = p?.units.find((u) => u.is_default) || p?.units[0];
    setUnitId(defaultUnit?.id || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (usageType === 'BARANG') {
      if (!selectedProduct || !selectedUnit) return;
      const conversion = selectedUnit.conversion_to_base || 1;
      const quantity_base = quantity * conversion;

      warungStore.addPersonalUsage({
        type: 'BARANG',
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_unit_id: selectedUnit.id,
        unit_name: selectedUnit.unit_name,
        quantity,
        quantity_base,
        date,
        note,
      });

      alert('✅ Pemakaian barang pribadi berhasil dicatat! Stok berkurang tanpa mempengaruhi Omzet/Laba.');
    } else {
      if (amountCash <= 0) {
        alert('Masukkan nominal uang cash yang valid.');
        return;
      }

      warungStore.addPersonalUsage({
        type: 'UANG_CASH',
        amount_cash: amountCash,
        date,
        note: note || 'Ambil uang cash laci untuk beli makan keluar',
      });

      alert(`✅ Pengambilan uang cash laci sebesar ${formatRupiah(amountCash)} berhasil dicatat!`);
    }

    setNote('');
    setQuantity(1);
    setAmountCash(15000);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <UserCheck className="w-7 h-7 text-[#073b2a]" />
          Pencatatan Pemakaian & Kas Pribadi
        </h1>
        <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
          Catat barang yang diambil ATAU **uang cash dari laci warung** (untuk beli makan keluar, dll).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Input Form */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>
              <Plus className="w-4 h-4 text-[#073b2a]" />
              Form Input Pemakaian Pribadi
            </CardTitle>
          </CardHeader>

          {/* Mode Switcher Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setUsageType('BARANG')}
              className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                usageType === 'BARANG'
                  ? 'bg-[#073b2a] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              📦 Ambil Barang Warung
            </button>
            <button
              type="button"
              onClick={() => setUsageType('UANG_CASH')}
              className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                usageType === 'UANG_CASH'
                  ? 'bg-[#073b2a] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              💵 Ambil Uang Cash Laci
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#073b2a]"
              />
            </div>

            {/* Mode BARANG Inputs */}
            {usageType === 'BARANG' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Pilih Produk *</label>
                  <select
                    value={productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#073b2a]"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Sisa Stok: {formatMultiUnitStock(p.current_stock_base, p.base_unit, p.units)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Satuan *</label>
                    <select
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#073b2a]"
                    >
                      {selectedProduct?.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.unit_name} ({u.conversion_to_base} {selectedProduct.base_unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Jumlah *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-[#073b2a]"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Mode UANG_CASH Inputs */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nominal Uang Cash Laci Ditarik (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-sm text-gray-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={500}
                      step={500}
                      required
                      placeholder="15000"
                      value={amountCash}
                      onChange={(e) => setAmountCash(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-lg font-extrabold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-[#073b2a]"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[10000, 15000, 20000, 25000, 50000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmountCash(preset)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] rounded-lg"
                      >
                        Rp{preset / 1000}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Catatan / Keperluan</label>
              <input
                type="text"
                placeholder={
                  usageType === 'BARANG'
                    ? 'Contoh: Merokok saat nunggu toko, Kopi sendiri'
                    : 'Contoh: Beli makan siang Nasi Padang di luar, Bensin motor'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#073b2a]"
              />
            </div>

            {/* Impact Preview Box */}
            <div
              className={`p-3.5 rounded-xl text-xs space-y-1 ${
                usageType === 'BARANG'
                  ? 'bg-purple-50/80 border border-purple-200/80 text-purple-900'
                  : 'bg-emerald-50/80 border border-emerald-200/80 text-emerald-900'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4" />
                {usageType === 'BARANG' ? 'Efek Terhadap Stok Warung:' : 'Efek Terhadap Uang Cash Laci:'}
              </div>
              {usageType === 'BARANG' ? (
                <p>
                  Mengurangi <span className="font-extrabold">{quantity * (selectedUnit?.conversion_to_base || 1)} {selectedProduct?.base_unit}</span> dari stok fisik warung.
                </p>
              ) : (
                <p>
                  Kas laci ditarik <span className="font-extrabold">{formatRupiah(amountCash)}</span> untuk keperluan pribadi (makan/lainnya). Tidak memotong stok barang.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#073b2a] hover:bg-[#0d684a] text-white font-bold rounded-xl text-sm shadow-md shadow-[#073b2a]/20 transition-all flex items-center justify-center gap-2"
            >
              {usageType === 'BARANG' ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <Wallet className="w-4 h-4 text-emerald-400" />}
              {usageType === 'BARANG' ? 'Simpan Pemakaian Barang' : 'Simpan Ambil Uang Laci'}
            </button>
          </form>
        </Card>

        {/* Right Section: Usage Audit Log */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>
              <History className="w-4 h-4 text-[#073b2a]" />
              Riwayat Pemakaian & Uang Laci Ditarik
            </CardTitle>
          </CardHeader>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {usages.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Belum ada pemakaian atau uang laci ditarik.</p>
            ) : (
              usages.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 bg-gray-50/80 border border-gray-200/70 rounded-xl flex items-center justify-between hover:bg-gray-100/80 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {u.type === 'UANG_CASH' ? (
                        <>
                          <span className="font-extrabold text-sm text-emerald-900">
                            💵 Ambil Uang Cash: {formatRupiah(u.amount_cash || 0)}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            UANG LACI
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-sm text-gray-900">📦 {u.product_name}</span>
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            {u.quantity} {u.unit_name}
                          </span>
                        </>
                      )}
                    </div>
                    {u.note && <p className="text-xs text-gray-500 italic mt-0.5">"{u.note}"</p>}
                  </div>
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDateIndo(u.date)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
