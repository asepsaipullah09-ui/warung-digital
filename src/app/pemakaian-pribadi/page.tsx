'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  UserCheck,
  Plus,
  Calendar,
  History,
  Package,
  Wallet,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Trash2,
} from 'lucide-react';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  formatDateIndo,
  getTodayDateString,
  formatMultiUnitStock,
  formatRupiah,
} from '@/lib/utils';

import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

type UsageType = 'BARANG' | 'UANG_CASH';

type Product = {
  id: string;
  name: string;
  base_unit: string;
  minimum_stock: number;
  image_url?: string | null;
  category_id?: string | null;
  is_active: boolean;
};

type ProductUnit = {
  id: string;
  product_id: string;
  unit_name: string;
  conversion_to_base: number;
  cost_price: number;
  selling_price: number;
  is_default: boolean;
};

type ProductWithUnits = Product & {
  units: ProductUnit[];
  current_stock_base: number;
};

type PersonalUsage = {
  id: string;
  type: UsageType;
  product_id: string | null;
  product_unit_id: string | null;
  quantity: number;
  quantity_base: number;
  amount_cash: number;
  date: string;
  note: string | null;
  created_at: string;
  product_name?: string;
  unit_name?: string;
};

type StockMovement = {
  product_id: string | null;
  quantity_base: number;
  movement_type: string;
  date: string;
};

function calculateStock(productId: string, movements: StockMovement[]): number {
  return movements
    .filter((movement) => movement.product_id === productId)
    .reduce((total, movement) => {
      const quantity = Number(movement.quantity_base || 0);

      switch (movement.movement_type) {
        case 'PURCHASE':
          return total + quantity;
        case 'SALE':
          return total - Math.abs(quantity);
        case 'PERSONAL_USE':
          return total - Math.abs(quantity);
        case 'ADJUSTMENT':
          return total + quantity;
        default:
          return total;
      }
    }, 0);
}

export default function PemakaianPribadiPage() {
  const [usageType, setUsageType] = useState<UsageType>('BARANG');
  const [products, setProducts] = useState<ProductWithUnits[]>([]);
  const [usages, setUsages] = useState<PersonalUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [productId, setProductId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [amountCash, setAmountCash] = useState<number>(15000);
  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');

  const loadData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`id, name, base_unit, minimum_stock, image_url, category_id, is_active`)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      const { data: unitsData, error: unitsError } = await supabase
        .from('product_units')
        .select(`id, product_id, unit_name, conversion_to_base, cost_price, selling_price, is_default`)
        .order('created_at', { ascending: true });

      if (unitsError) throw unitsError;

      const { data: movementsData, error: movementsError } = await supabase
        .from('stock_movements')
        .select(`product_id, quantity_base, movement_type, date`)
        .order('created_at', { ascending: true });

      if (movementsError) throw movementsError;

      const movements = (movementsData || []) as StockMovement[];

      const mappedProducts: ProductWithUnits[] = (productsData || []).map((product) => {
        const units = (unitsData || [])
          .filter((unit) => unit.product_id === product.id)
          .map((unit) => ({
            ...unit,
            conversion_to_base: Number(unit.conversion_to_base || 1),
            cost_price: Number(unit.cost_price || 0),
            selling_price: Number(unit.selling_price || 0),
            is_default: Boolean(unit.is_default),
          }));

        return {
          ...product,
          units,
          current_stock_base: Math.max(0, calculateStock(product.id, movements)),
        };
      });

      setProducts(mappedProducts);

      const { data: usagesData, error: usagesError } = await supabase
        .from('personal_usages')
        .select(`id, type, product_id, product_unit_id, quantity, quantity_base, amount_cash, date, note, created_at`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (usagesError) throw usagesError;

      const mappedUsages: PersonalUsage[] = (usagesData || []).map((usage) => {
        const product = mappedProducts.find((item) => item.id === usage.product_id);
        const unit = product?.units.find((item) => item.id === usage.product_unit_id);

        return {
          id: usage.id,
          type: usage.type as UsageType,
          product_id: usage.product_id,
          product_unit_id: usage.product_unit_id,
          quantity: Number(usage.quantity || 0),
          quantity_base: Number(usage.quantity_base || 0),
          amount_cash: Number(usage.amount_cash || 0),
          date: usage.date,
          note: usage.note,
          created_at: usage.created_at,
          product_name: product?.name,
          unit_name: unit?.unit_name,
        };
      });

      setUsages(mappedUsages);

      if (mappedProducts.length > 0) {
        const currentProductStillExists = mappedProducts.some((product) => product.id === productId);
        const selected = currentProductStillExists
          ? mappedProducts.find((product) => product.id === productId)
          : mappedProducts[0];

        if (selected) {
          if (!currentProductStillExists) setProductId(selected.id);

          const currentUnitStillExists = selected.units.some((unit) => unit.id === unitId);
          if (!currentUnitStillExists) {
            const defaultUnit = selected.units.find((unit) => unit.is_default) || selected.units[0];
            setUnitId(defaultUnit?.id || '');
          }
        }
      } else {
        setProductId('');
        setUnitId('');
      }
    } catch (error) {
      console.error('Gagal memuat data pemakaian pribadi:', error);
      const message = error instanceof Error ? error.message : 'Gagal memuat data dari Supabase.';
      alert(`❌ ${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(loadTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [products, productId]
  );

  const selectedUnit = useMemo(
    () => selectedProduct?.units.find((unit) => unit.id === unitId),
    [selectedProduct, unitId]
  );

  const quantityBase = useMemo(() => {
    if (!selectedUnit) return 0;
    return Math.max(0, Number(quantity || 0) * Number(selectedUnit.conversion_to_base || 1));
  }, [quantity, selectedUnit]);

  const remainingStockAfterUsage = useMemo(() => {
    if (!selectedProduct) return 0;
    return Math.max(0, selectedProduct.current_stock_base - quantityBase);
  }, [selectedProduct, quantityBase]);

  const handleProductChange = (id: string) => {
    setProductId(id);
    const product = products.find((item) => item.id === id);

    if (!product) {
      setUnitId('');
      return;
    }

    const defaultUnit = product.units.find((unit) => unit.is_default) || product.units[0];
    setUnitId(defaultUnit?.id || '');
    setQuantity(1);
  };

  const handleUsageTypeChange = (type: UsageType) => {
    setUsageType(type);
    setNote('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      alert('❌ Supabase belum terkonfigurasi. Periksa file .env.local.');
      return;
    }

    if (saving || deletingId) return;

    try {
      setSaving(true);

      if (usageType === 'BARANG') {
        if (!selectedProduct) {
          alert('Pilih produk terlebih dahulu.');
          return;
        }
        if (!selectedUnit) {
          alert('Pilih satuan terlebih dahulu.');
          return;
        }
        if (quantity <= 0) {
          alert('Jumlah pemakaian harus lebih dari 0.');
          return;
        }

        const conversion = Number(selectedUnit.conversion_to_base || 1);
        const quantityBase = quantity * conversion;

        if (quantityBase > selectedProduct.current_stock_base) {
          alert(
            `❌ Stok tidak cukup.\n\nStok tersedia: ${formatMultiUnitStock(
              selectedProduct.current_stock_base,
              selectedProduct.base_unit,
              selectedProduct.units
            )}\nPemakaian: ${quantity} ${selectedUnit.unit_name}`
          );
          return;
        }

        const { data: usageData, error: usageError } = await supabase
          .from('personal_usages')
          .insert({
            type: 'BARANG',
            product_id: selectedProduct.id,
            product_unit_id: selectedUnit.id,
            quantity,
            quantity_base: quantityBase,
            amount_cash: 0,
            date,
            note: note || null,
          })
          .select()
          .single();

        if (usageError) throw usageError;

        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            product_id: selectedProduct.id,
            quantity_base: -Math.abs(quantityBase),
            movement_type: 'PERSONAL_USE',
            reference_id: usageData.id,
            date,
            note: note || `Pemakaian pribadi ${quantity} ${selectedUnit.unit_name}`,
          });

        if (movementError) {
          await supabase.from('personal_usages').delete().eq('id', usageData.id);
          throw movementError;
        }

        alert(
          `✅ Pemakaian barang pribadi berhasil dicatat!\n\n${selectedProduct.name}: ${quantity} ${selectedUnit.unit_name}\nBerkurang: ${quantityBase} ${selectedProduct.base_unit}\n\nPemakaian ini TIDAK masuk Omzet/Laba.`
        );
      } else {
        if (amountCash <= 0) {
          alert('Masukkan nominal uang cash yang valid.');
          return;
        }

        const { error: usageError } = await supabase
          .from('personal_usages')
          .insert({
            type: 'UANG_CASH',
            product_id: null,
            product_unit_id: null,
            quantity: 0,
            quantity_base: 0,
            amount_cash: amountCash,
            date,
            note: note || 'Ambil uang cash laci untuk kebutuhan pribadi',
          });

        if (usageError) throw usageError;

        alert(`✅ Pengambilan uang cash laci berhasil dicatat!\n\n${formatRupiah(amountCash)}`);
      }

      setNote('');
      setQuantity(1);
      setAmountCash(15000);
      await loadData();
    } catch (error) {
      console.error('Gagal menyimpan pemakaian pribadi:', error);
      const message = error instanceof Error ? error.message : 'Gagal menyimpan data.';
      alert(`❌ Gagal menyimpan:\n${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUsage = async (usage: PersonalUsage) => {
    if (!supabase || !isSupabaseConfigured || deletingId) return;

    const label = usage.type === 'UANG_CASH'
      ? `${formatRupiah(usage.amount_cash || 0)} uang cash`
      : `${usage.product_name || 'produk'} — ${usage.quantity} ${usage.unit_name || 'unit'}`;

    const confirmed = window.confirm(
      `Hapus transaksi pemakaian ini?\n\n${label}${usage.note ? `\nCatatan: ${usage.note}` : ''}\n\nTindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(usage.id);

      // Stock movement tidak mempunyai FK cascade ke personal_usages,
      // jadi hapus movement terkait terlebih dahulu untuk mengembalikan stok.
      if (usage.type === 'BARANG') {
        const { error: movementError } = await supabase
          .from('stock_movements')
          .delete()
          .eq('reference_id', usage.id)
          .eq('movement_type', 'PERSONAL_USE');

        if (movementError) throw movementError;
      }

      // Hapus sumber transaksi. Untuk UANG_CASH, trigger DELETE di database
      // akan menghapus cash_transactions dengan reference_id yang sama.
      const { error: usageError } = await supabase
        .from('personal_usages')
        .delete()
        .eq('id', usage.id);

      if (usageError) throw usageError;

      // Fallback cleanup agar cash tetap sinkron jika trigger DELETE belum
      // terpasang/ter-refresh pada database.
      if (usage.type === 'UANG_CASH') {
        const { error: cashError } = await supabase
          .from('cash_transactions')
          .delete()
          .eq('reference_id', usage.id)
          .eq('transaction_type', 'PERSONAL_WITHDRAWAL');

        if (cashError) {
          console.warn('Pemakaian terhapus, tetapi cleanup transaksi kas gagal:', cashError);
        }
      }

      alert('✅ Transaksi berhasil dihapus. Stok dan Kas telah disinkronkan.');
      await loadData();
    } catch (error) {
      console.error('Gagal menghapus pemakaian pribadi:', error);
      const message = error instanceof Error ? error.message : 'Gagal menghapus transaksi.';
      alert(`❌ Gagal menghapus:\n${message}`);
      await loadData();
    } finally {
      setDeletingId(null);
    }
  };

  const totalCashToday = usages
    .filter((usage) => usage.type === 'UANG_CASH' && usage.date === getTodayDateString())
    .reduce((total, usage) => total + Number(usage.amount_cash || 0), 0);

  const totalPersonalItemsToday = usages
    .filter((usage) => usage.type === 'BARANG' && usage.date === getTodayDateString())
    .reduce((total, usage) => total + Number(usage.quantity_base || 0), 0);

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-start gap-2">
            <UserCheck className="w-7 h-7 mt-0.5 shrink-0 text-[#073b2a]" />
            <span className="break-words">Pencatatan Pemakaian & Kas Pribadi</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
            Catat barang yang diambil atau uang cash dari laci warung.
          </p>
        </div>
        <Card>
          <div className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-extrabold text-gray-900">Supabase Belum Terkonfigurasi</h2>
            <p className="text-sm text-gray-500 mt-1">
              Periksa NEXT_PUBLIC_SUPABASE_URL dan key Supabase di file .env.local.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-[#073b2a]" />
            Pencatatan Pemakaian & Kas Pribadi
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
            Catat barang yang diambil ATAU uang cash dari laci warung.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading || !!deletingId}
          className="self-start md:self-auto px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500">Pemakaian Barang Hari Ini</p>
              <p className="text-lg font-extrabold text-gray-900">
                {totalPersonalItemsToday}{' '}
                <span className="text-xs font-bold text-gray-500">unit dasar</span>
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500">Uang Cash Pribadi Hari Ini</p>
              <p className="text-lg font-extrabold text-gray-900">{formatRupiah(totalCashToday)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>
              <Plus className="w-4 h-4 text-[#073b2a]" />
              Form Input Pemakaian Pribadi
            </CardTitle>
          </CardHeader>

          <div className="p-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleUsageTypeChange('BARANG')}
                className={`min-w-0 py-2 px-2 sm:px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${usageType === 'BARANG' ? 'bg-[#073b2a] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Package className="w-3.5 h-3.5" />
                <span className="truncate">Ambil Barang Warung</span>
              </button>
              <button
                type="button"
                onClick={() => handleUsageTypeChange('UANG_CASH')}
                className={`min-w-0 py-2 px-2 sm:px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${usageType === 'UANG_CASH' ? 'bg-[#073b2a] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="truncate">Ambil Uang Cash Laci</span>
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

              {usageType === 'BARANG' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Pilih Produk *</label>
                    <select
                      required
                      value={productId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#073b2a]"
                    >
                      {products.length === 0 ? (
                        <option value="">Belum ada produk</option>
                      ) : (
                        products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} — Stok: {formatMultiUnitStock(product.current_stock_base, product.base_unit, product.units)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Satuan *</label>
                      <select
                        required
                        value={unitId}
                        onChange={(e) => setUnitId(e.target.value)}
                        disabled={!selectedProduct || selectedProduct.units.length === 0}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#073b2a] disabled:opacity-50"
                      >
                        {selectedProduct?.units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.unit_name} ({unit.conversion_to_base} {selectedProduct.base_unit})
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
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-extrabold text-center focus:outline-none focus:ring-2 focus:ring-[#073b2a]"
                      />
                    </div>
                  </div>

                  {selectedProduct && selectedUnit && (
                    <div className={`p-3.5 rounded-xl text-xs space-y-1 border ${quantityBase > selectedProduct.current_stock_base ? 'bg-red-50 border-red-200 text-red-900' : 'bg-purple-50/80 border-purple-200/80 text-purple-900'}`}>
                      <div className="font-bold flex items-center gap-1.5">
                        <ArrowDownRight className="w-4 h-4" />
                        Efek Terhadap Stok Warung:
                      </div>
                      <p>
                        Mengurangi <span className="font-extrabold">{quantityBase} {selectedProduct.base_unit}</span> dari stok.
                      </p>
                      <p>
                        Stok sekarang: <span className="font-extrabold">{formatMultiUnitStock(selectedProduct.current_stock_base, selectedProduct.base_unit, selectedProduct.units)}</span>
                      </p>
                      {quantityBase <= selectedProduct.current_stock_base ? (
                        <p>
                          Setelah diambil: <span className="font-extrabold">{formatMultiUnitStock(remainingStockAfterUsage, selectedProduct.base_unit, selectedProduct.units)}</span>
                        </p>
                      ) : (
                        <p className="font-extrabold text-red-700">⚠️ Jumlah pemakaian melebihi stok!</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nominal Uang Cash Laci Ditarik (Rp) *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-sm text-gray-500">Rp</span>
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
                    <div className="flex flex-wrap gap-2 mt-2">
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
                  <div className="p-3.5 rounded-xl text-xs space-y-1 bg-emerald-50/80 border border-emerald-200/80 text-emerald-900">
                    <div className="font-bold flex items-center gap-1.5">
                      <ArrowDownRight className="w-4 h-4" />
                      Efek Terhadap Uang Cash Laci:
                    </div>
                    <p>
                      Kas laci ditarik <span className="font-extrabold">{formatRupiah(amountCash)}</span> untuk keperluan pribadi.
                    </p>
                    <p className="font-semibold">Tidak memotong stok barang.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Catatan / Keperluan</label>
                <input
                  type="text"
                  placeholder={usageType === 'BARANG' ? 'Contoh: Merokok saat nunggu toko, Kopi sendiri' : 'Contoh: Beli makan siang, Bensin motor'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#073b2a]"
                />
              </div>

              <button
                type="submit"
                disabled={saving || loading || !!deletingId || (usageType === 'BARANG' && (!selectedProduct || !selectedUnit || quantityBase > (selectedProduct?.current_stock_base || 0)))}
                className="w-full py-3 bg-[#073b2a] hover:bg-[#0d684a] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm shadow-md shadow-[#073b2a]/20 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : usageType === 'BARANG' ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Simpan Pemakaian Barang
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    Simpan Ambil Uang Laci
                  </>
                )}
              </button>
            </form>
          </div>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>
              <History className="w-4 h-4 text-[#073b2a]" />
              Riwayat Pemakaian & Uang Laci Ditarik
            </CardTitle>
          </CardHeader>

          <div className="p-4 pt-0">
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#073b2a] mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Memuat data dari Supabase...</p>
                </div>
              ) : usages.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">Belum ada pemakaian atau uang laci ditarik.</p>
              ) : (
                usages.map((usage) => {
                  const isDeleting = deletingId === usage.id;

                  return (
                    <div
                      key={usage.id}
                      className="p-3.5 bg-gray-50/80 border border-gray-200/70 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-100/80 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {usage.type === 'UANG_CASH' ? (
                            <>
                              <span className="font-extrabold text-sm text-emerald-900 break-words">
                                Ambil Uang Cash: {formatRupiah(usage.amount_cash || 0)}
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">UANG LACI</span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-sm text-gray-900 break-words">{usage.product_name || 'Produk'}</span>
                              <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                {usage.quantity} {usage.unit_name || 'unit'}
                              </span>
                            </>
                          )}
                        </div>

                        {usage.type === 'BARANG' && (
                          <p className="text-[11px] text-gray-400 mt-1">Berkurang {usage.quantity_base} unit dasar</p>
                        )}

                        {usage.note && (
                          <p className="text-xs text-gray-500 italic mt-0.5 truncate">"{usage.note}"</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 w-full sm:w-auto shrink-0">
                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {formatDateIndo(usage.date)}
                        </span>
                        <button
                          type="button"
                          title="Hapus transaksi"
                          aria-label={`Hapus transaksi ${usage.note || usage.product_name || usage.type}`}
                          onClick={() => handleDeleteUsage(usage)}
                          disabled={!!deletingId}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isDeleting ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
