'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag, Plus, Calendar, Trash2, CheckCircle2, History, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah, formatDateIndo, getTodayDateString } from '@/lib/utils';
import { warungStore } from '@/lib/store/warungStore';
import { Product, Purchase, PurchaseItem } from '@/types';

export default function BarangMasukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // Input Form state
  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');
  const [cartItems, setCartItems] = useState<
    {
      productId: string;
      unitId: string;
      quantity: number;
      costPrice: number;
    }[]
  >([]);

  const loadData = () => {
    warungStore.initializeDefaultDataIfEmpty();
    const prods = warungStore.getProducts();
    const purs = warungStore.getPurchases();
    setProducts(prods);
    setPurchases(purs);

    if (prods.length > 0 && cartItems.length === 0) {
      const p = prods[0];
      const defaultUnit = p.units.find((u) => u.is_default) || p.units[0];
      setCartItems([
        {
          productId: p.id,
          unitId: defaultUnit?.id || '',
          quantity: 1,
          costPrice: defaultUnit?.cost_price || 0,
        },
      ]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addCartRow = () => {
    if (products.length === 0) return;
    const p = products[0];
    const defaultUnit = p.units.find((u) => u.is_default) || p.units[0];
    setCartItems([
      ...cartItems,
      {
        productId: p.id,
        unitId: defaultUnit?.id || '',
        quantity: 1,
        costPrice: defaultUnit?.cost_price || 0,
      },
    ]);
  };

  const removeCartRow = (index: number) => {
    if (cartItems.length <= 1) return;
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const defaultUnit = prod.units.find((u) => u.is_default) || prod.units[0];
    const updated = [...cartItems];
    updated[index] = {
      productId,
      unitId: defaultUnit?.id || '',
      quantity: 1,
      costPrice: defaultUnit?.cost_price || 0,
    };
    setCartItems(updated);
  };

  const handleUnitSelect = (index: number, unitId: string) => {
    const item = cartItems[index];
    const prod = products.find((p) => p.id === item.productId);
    const unit = prod?.units.find((u) => u.id === unitId);
    const updated = [...cartItems];
    updated[index] = {
      ...item,
      unitId,
      costPrice: unit?.cost_price || 0,
    };
    setCartItems(updated);
  };

  const handleQtyChange = (index: number, quantity: number) => {
    const updated = [...cartItems];
    updated[index] = { ...updated[index], quantity: Math.max(1, quantity) };
    setCartItems(updated);
  };

  const handleCostChange = (index: number, costPrice: number) => {
    const updated = [...cartItems];
    updated[index] = { ...updated[index], costPrice: Math.max(0, costPrice) };
    setCartItems(updated);
  };

  // Calculate Subtotals & Total
  const formattedItems: PurchaseItem[] = cartItems.map((ci) => {
    const prod = products.find((p) => p.id === ci.productId);
    const unit = prod?.units.find((u) => u.id === ci.unitId);
    const conversion = unit?.conversion_to_base || 1;
    const quantity_base = ci.quantity * conversion;
    const subtotal = ci.quantity * ci.costPrice;

    return {
      product_id: ci.productId,
      product_name: prod?.name || '',
      product_unit_id: ci.unitId,
      unit_name: unit?.unit_name || prod?.base_unit || 'Pcs',
      quantity: ci.quantity,
      quantity_base,
      cost_price: ci.costPrice,
      subtotal,
    };
  });

  const totalBelanja = formattedItems.reduce((acc, curr) => acc + curr.subtotal, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formattedItems.length === 0) return;

    warungStore.addPurchase({
      date,
      total_cost: totalBelanja,
      note,
      items: formattedItems,
    });

    alert('✅ Barang masuk berhasil disimpan! Stok bertambah otomatis.');
    setNote('');
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-emerald-600" />
          Pencatatan Barang Masuk (Hasil Belanja)
        </h1>
        <p className="text-sm text-gray-500">
          Catat barang yang baru dibeli dari grosir. Stok warung akan **otomatis bertambah**.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Input Barang Masuk */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>
              <Plus className="w-5 h-5 text-emerald-600" />
              Form Input Belanja Grosir
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Belanja *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Opsional</label>
                <input
                  type="text"
                  placeholder="Contoh: Belanja Pasar Senen, Grosir Pak Haji"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Items List Input */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Daftar Barang Dibeli:</span>
                <button
                  type="button"
                  onClick={addCartRow}
                  className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg"
                >
                  + Tambah Baris
                </button>
              </div>

              <div className="space-y-3">
                {cartItems.map((item, idx) => {
                  const currentProd = products.find((p) => p.id === item.productId);
                  const currentUnit = currentProd?.units.find((u) => u.id === item.unitId);
                  const subtotal = item.quantity * item.costPrice;
                  const addedBaseStock = item.quantity * (currentUnit?.conversion_to_base || 1);

                  return (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl space-y-2 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        {/* Select Product */}
                        <div className="md:col-span-5">
                          <label className="text-[10px] text-gray-400 block mb-0.5">Produk</label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Select Unit */}
                        <div className="md:col-span-3">
                          <label className="text-[10px] text-gray-400 block mb-0.5">Satuan</label>
                          <select
                            value={item.unitId}
                            onChange={(e) => handleUnitSelect(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                          >
                            {currentProd?.units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.unit_name} ({u.conversion_to_base} {currentProd.base_unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-2">
                          <label className="text-[10px] text-gray-400 block mb-0.5">Jumlah</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-center"
                          />
                        </div>

                        {/* Remove Row */}
                        <div className="md:col-span-2 text-right">
                          {cartItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCartRow(idx)}
                              className="text-rose-500 p-1 hover:bg-rose-100 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Pricing Details & Stock Conversion Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-200/60 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Harga Modal Per Satuan:</span>
                          <input
                            type="number"
                            min={0}
                            value={item.costPrice}
                            onChange={(e) => handleCostChange(idx, Number(e.target.value))}
                            className="w-28 px-2 py-0.5 bg-white border border-gray-200 rounded text-xs font-semibold"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                            + {addedBaseStock} {currentProd?.base_unit} stok
                          </span>
                          <span className="font-bold text-gray-900">Subtotal: {formatRupiah(subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Summary Footer */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-semibold">Total Modal Belanja:</span>
                <div className="text-2xl font-extrabold text-emerald-900">{formatRupiah(totalBelanja)}</div>
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all"
              >
                Simpan & Tambah Stok
              </button>
            </div>
          </form>
        </Card>

        {/* Right Section: Recent Purchases History */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>
              <History className="w-5 h-5 text-indigo-600" />
              Riwayat Barang Masuk
            </CardTitle>
          </CardHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {purchases.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">Belum ada riwayat belanja barang masuk.</p>
            ) : (
              purchases.map((p) => (
                <div key={p.id} className="p-3.5 bg-gray-50 border border-gray-200/70 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs border-b border-gray-200/50 pb-2">
                    <span className="font-bold text-gray-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      {formatDateIndo(p.date)}
                    </span>
                    <span className="font-extrabold text-emerald-800 text-sm">{formatRupiah(p.total_cost)}</span>
                  </div>
                  {p.note && <p className="text-xs text-gray-500 italic">"{p.note}"</p>}
                  <div className="space-y-1">
                    {p.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600">
                        <span>
                          • {it.product_name} ({it.quantity} {it.unit_name})
                        </span>
                        <span className="font-medium">{formatRupiah(it.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
