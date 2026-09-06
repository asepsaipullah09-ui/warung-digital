'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Calendar,
  Trash2,
  History,
  Package,
  RefreshCw,
} from 'lucide-react';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatRupiah, formatDateIndo, getTodayDateString } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

type ProductUnit = {
  id: string;
  product_id: string;
  unit_name: string;
  conversion_to_base: number;
  cost_price: number;
  selling_price: number;
  is_default: boolean;
};

type Product = {
  id: string;
  name: string;
  base_unit: string;
  is_active: boolean;
  product_units: ProductUnit[];
};

type PurchaseItem = {
  id: string;
  purchase_id: string;
  product_id: string;
  product_unit_id: string | null;
  quantity: number;
  quantity_base: number;
  cost_price: number;
  subtotal: number;
};

type Purchase = {
  id: string;
  date: string;
  total_cost: number;
  note: string | null;
  created_at: string;
  purchase_items: PurchaseItem[];
};

type CartItem = {
  productId: string;
  unitId: string;
  quantity: number;
  costPrice: number;
};

export default function BarangMasukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');

  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const loadProducts = async () => {
    if (!supabase) {
      throw new Error(
        'Supabase belum terkonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local.'
      );
    }

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        base_unit,
        is_active,
        product_units (
          id,
          product_id,
          unit_name,
          conversion_to_base,
          cost_price,
          selling_price,
          is_default
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Gagal mengambil produk: ${error.message}`);
    }

    const mappedProducts = (data || []) as Product[];

    setProducts(mappedProducts);

    // Jika belum ada baris transaksi, buat satu baris otomatis
    if (mappedProducts.length > 0 && cartItems.length === 0) {
      const firstProduct = mappedProducts[0];

      const defaultUnit =
        firstProduct.product_units.find((u) => u.is_default) ||
        firstProduct.product_units[0];

      if (defaultUnit) {
        setCartItems([
          {
            productId: firstProduct.id,
            unitId: defaultUnit.id,
            quantity: 1,
            costPrice: Number(defaultUnit.cost_price),
          },
        ]);
      }
    }
  };

  // =========================================================
  // LOAD PURCHASE HISTORY
  // =========================================================

  const loadPurchases = async () => {
    if (!supabase) {
      throw new Error('Supabase belum terkonfigurasi.');
    }

    const { data, error } = await supabase
      .from('purchases')
      .select(`
        id,
        date,
        total_cost,
        note,
        created_at,
        purchase_items (
          id,
          purchase_id,
          product_id,
          product_unit_id,
          quantity,
          quantity_base,
          cost_price,
          subtotal
        )
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Gagal mengambil riwayat belanja: ${error.message}`);
    }

    setPurchases((data || []) as Purchase[]);
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      if (!isSupabaseConfigured || !supabase) {
        throw new Error(
          'Supabase belum terkonfigurasi. Pastikan .env.local sudah benar dan restart npm run dev.'
        );
      }

      await Promise.all([
        loadProducts(),
        loadPurchases(),
      ]);
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengambil data dari Supabase.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // CART
  // =========================================================

  const addCartRow = () => {
    if (products.length === 0) return;

    const product = products[0];

    const defaultUnit =
      product.product_units.find((u) => u.is_default) ||
      product.product_units[0];

    if (!defaultUnit) {
      setErrorMessage(
        `Produk "${product.name}" belum memiliki satuan. Tambahkan satuan terlebih dahulu di Master Barang.`
      );
      return;
    }

    setCartItems((prev) => [
      ...prev,
      {
        productId: product.id,
        unitId: defaultUnit.id,
        quantity: 1,
        costPrice: Number(defaultUnit.cost_price),
      },
    ]);
  };

  const removeCartRow = (index: number) => {
    if (cartItems.length <= 1) return;

    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (
    index: number,
    productId: string
  ) => {
    const product = products.find(
      (p) => p.id === productId
    );

    if (!product) return;

    const defaultUnit =
      product.product_units.find((u) => u.is_default) ||
      product.product_units[0];

    if (!defaultUnit) {
      setErrorMessage(
        `Produk "${product.name}" belum memiliki satuan.`
      );
      return;
    }

    setCartItems((prev) => {
      const updated = [...prev];

      updated[index] = {
        productId,
        unitId: defaultUnit.id,
        quantity: 1,
        costPrice: Number(defaultUnit.cost_price),
      };

      return updated;
    });
  };

  const handleUnitSelect = (
    index: number,
    unitId: string
  ) => {
    const item = cartItems[index];

    const product = products.find(
      (p) => p.id === item.productId
    );

    const unit = product?.product_units.find(
      (u) => u.id === unitId
    );

    if (!unit) return;

    setCartItems((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        unitId,
        costPrice: Number(unit.cost_price),
      };

      return updated;
    });
  };

  const handleQtyChange = (
    index: number,
    quantity: number
  ) => {
    const safeQuantity = Number.isFinite(quantity)
      ? Math.max(1, quantity)
      : 1;

    setCartItems((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        quantity: safeQuantity,
      };

      return updated;
    });
  };

  const handleCostChange = (
    index: number,
    costPrice: number
  ) => {
    const safeCost = Number.isFinite(costPrice)
      ? Math.max(0, costPrice)
      : 0;

    setCartItems((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        costPrice: safeCost,
      };

      return updated;
    });
  };

  // =========================================================
  // FORMATTED CART
  // =========================================================

  const formattedItems = useMemo(() => {
    return cartItems.map((item) => {
      const product = products.find(
        (p) => p.id === item.productId
      );

      const unit = product?.product_units.find(
        (u) => u.id === item.unitId
      );

      const conversion =
        Number(unit?.conversion_to_base) || 1;

      const quantityBase =
        item.quantity * conversion;

      const subtotal =
        item.quantity * item.costPrice;

      return {
        ...item,
        product,
        unit,
        quantityBase,
        subtotal,
      };
    });
  }, [cartItems, products]);

  const totalBelanja = useMemo(() => {
    return formattedItems.reduce(
      (total, item) => total + item.subtotal,
      0
    );
  }, [formattedItems]);

  // =========================================================
  // SAVE PURCHASE
  // =========================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!supabase) {
      setErrorMessage('Supabase belum terkonfigurasi.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    if (formattedItems.length === 0) {
      setErrorMessage('Belum ada barang yang dimasukkan.');
      return;
    }

    for (const item of formattedItems) {
      if (!item.product) {
        setErrorMessage(
          'Ada produk yang tidak ditemukan. Silakan pilih ulang produk.'
        );
        return;
      }

      if (!item.unit) {
        setErrorMessage(
          `Satuan untuk "${item.product.name}" tidak ditemukan.`
        );
        return;
      }

      if (item.quantity <= 0) {
        setErrorMessage(
          `Jumlah "${item.product.name}" harus lebih dari 0.`
        );
        return;
      }
    }

    setSaving(true);

    let purchaseId: string | null = null;

    try {
      // =====================================================
      // 1. INSERT PURCHASE
      // =====================================================

      const { data: purchase, error: purchaseError } =
        await supabase
          .from('purchases')
          .insert({
            date,
            total_cost: totalBelanja,
            note: note.trim() || null,
          })
          .select('id')
          .single();

      if (purchaseError) {
        throw new Error(
          `Gagal menyimpan transaksi belanja: ${purchaseError.message}`
        );
      }

      if (!purchase) {
        throw new Error(
          'Transaksi belanja gagal dibuat.'
        );
      }

      purchaseId = purchase.id;

      // =====================================================
      // 2. INSERT PURCHASE ITEMS
      // =====================================================

      const purchaseItems = formattedItems.map(
        (item) => ({
          purchase_id: purchaseId,
          product_id: item.productId,
          product_unit_id: item.unitId,
          quantity: item.quantity,
          quantity_base: item.quantityBase,
          cost_price: item.costPrice,
          subtotal: item.subtotal,
        })
      );

      const { error: itemsError } =
        await supabase
          .from('purchase_items')
          .insert(purchaseItems);

      if (itemsError) {
        // Rollback manual purchase jika detail gagal
        await supabase
          .from('purchases')
          .delete()
          .eq('id', purchaseId);

        throw new Error(
          `Gagal menyimpan detail barang: ${itemsError.message}`
        );
      }

      // =====================================================
      // 3. INSERT STOCK MOVEMENTS
      // =====================================================

      const movements = formattedItems.map(
        (item) => ({
          product_id: item.productId,
          quantity_base: item.quantityBase,
          movement_type: 'PURCHASE',
          reference_id: purchaseId,
          date,
          note: `Barang Masuk (${item.quantity} ${item.unit?.unit_name || item.product?.base_unit || ''})`,
        })
      );

      const { error: movementError } =
        await supabase
          .from('stock_movements')
          .insert(movements);

      if (movementError) {
        // Hapus purchase_items
        await supabase
          .from('purchase_items')
          .delete()
          .eq('purchase_id', purchaseId);

        // Hapus purchase
        await supabase
          .from('purchases')
          .delete()
          .eq('id', purchaseId);

        throw new Error(
          `Gagal menambahkan stok: ${movementError.message}`
        );
      }

      // =====================================================
      // SUCCESS
      // =====================================================

      setSuccessMessage(
        'Barang masuk berhasil disimpan. Stok bertambah otomatis.'
      );

      setNote('');

      // Reset form dengan produk pertama
      if (products.length > 0) {
        const firstProduct = products[0];

        const defaultUnit =
          firstProduct.product_units.find(
            (u) => u.is_default
          ) || firstProduct.product_units[0];

        if (defaultUnit) {
          setCartItems([
            {
              productId: firstProduct.id,
              unitId: defaultUnit.id,
              quantity: 1,
              costPrice: Number(
                defaultUnit.cost_price
              ),
            },
          ]);
        }
      }

      await loadPurchases();
    } catch (error) {
      console.error(
        'Barang masuk error:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Gagal menyimpan barang masuk.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
            Pencatatan Barang Masuk
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Catat barang yang baru dibeli dari grosir.
            Stok akan otomatis bertambah.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading || saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          <div className="font-bold mb-1">
            Terjadi kesalahan
          </div>

          <div>{errorMessage}</div>
        </div>
      )}

      {/* SUCCESS */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <div className="font-bold">
            ✓ {successMessage}
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <Card>
          <div className="py-16 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw className="w-7 h-7 animate-spin mb-3 text-emerald-600" />
            <p className="text-sm">
              Mengambil data dari Supabase...
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* =================================================
              FORM BARANG MASUK
          ================================================= */}

          <Card className="lg:col-span-7">

            <CardHeader>
              <CardTitle>
                <Plus className="w-5 h-5 text-emerald-600" />
                Form Input Belanja Grosir
              </CardTitle>
            </CardHeader>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* DATE + NOTE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tanggal Belanja *
                  </label>

                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) =>
                      setDate(e.target.value)
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Catatan Opsional
                  </label>

                  <input
                    type="text"
                    placeholder="Contoh: Belanja grosir"
                    value={note}
                    onChange={(e) =>
                      setNote(e.target.value)
                    }
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

              </div>

              {/* ITEMS */}
              <div className="pt-3 border-t border-gray-100">

                <div className="flex items-center justify-between mb-3">

                  <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                    Daftar Barang Dibeli
                  </span>

                  <button
                    type="button"
                    onClick={addCartRow}
                    disabled={products.length === 0}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    + Tambah Baris
                  </button>

                </div>

                {products.length === 0 ? (
                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <div className="font-bold">
                      Belum ada produk aktif.
                    </div>

                    <div className="mt-1">
                      Tambahkan produk terlebih dahulu
                      melalui menu Master Barang.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">

                    {formattedItems.map(
                      (item, idx) => {

                        const product =
                          item.product;

                        const unit =
                          item.unit;

                        const addedBaseStock =
                          item.quantityBase;

                        return (
                          <div
                            key={`${idx}-${item.productId}-${item.unitId}`}
                            className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl space-y-2"
                          >

                            {/* TOP */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">

                              {/* PRODUCT */}
                              <div className="md:col-span-5">
                                <label className="text-[10px] text-gray-400 block mb-1">
                                  Produk
                                </label>

                                <select
                                  value={
                                    item.productId
                                  }
                                  onChange={(e) =>
                                    handleProductSelect(
                                      idx,
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium"
                                >
                                  {products.map(
                                    (p) => (
                                      <option
                                        key={p.id}
                                        value={p.id}
                                      >
                                        {p.name}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              {/* UNIT */}
                              <div className="md:col-span-3">
                                <label className="text-[10px] text-gray-400 block mb-1">
                                  Satuan
                                </label>

                                <select
                                  value={
                                    item.unitId
                                  }
                                  onChange={(e) =>
                                    handleUnitSelect(
                                      idx,
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                                >
                                  {product?.product_units.map(
                                    (u) => (
                                      <option
                                        key={u.id}
                                        value={u.id}
                                      >
                                        {u.unit_name}{' '}
                                        (
                                        {
                                          u.conversion_to_base
                                        }{' '}
                                        {
                                          product.base_unit
                                        }
                                        )
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              {/* QTY */}
                              <div className="md:col-span-2">
                                <label className="text-[10px] text-gray-400 block mb-1">
                                  Jumlah
                                </label>

                                <input
                                  type="number"
                                  min={1}
                                  value={
                                    item.quantity
                                  }
                                  onChange={(e) =>
                                    handleQtyChange(
                                      idx,
                                      Number(
                                        e.target.value
                                      )
                                    )
                                  }
                                  className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-center"
                                />
                              </div>

                              {/* DELETE */}
                              <div className="md:col-span-2 flex justify-end">

                                {cartItems.length >
                                  1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeCartRow(
                                        idx
                                      )
                                    }
                                    className="text-rose-500 p-2 hover:bg-rose-100 rounded-lg"
                                    title="Hapus baris"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}

                              </div>

                            </div>

                            {/* PRICE */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-200/60">

                              <div className="flex items-center gap-2">

                                <span className="text-[11px] text-gray-500">
                                  Harga Modal:
                                </span>

                                <input
                                  type="number"
                                  min={0}
                                  value={
                                    item.costPrice
                                  }
                                  onChange={(e) =>
                                    handleCostChange(
                                      idx,
                                      Number(
                                        e.target.value
                                      )
                                    )
                                  }
                                  className="w-32 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-semibold"
                                />

                              </div>

                              <div className="flex items-center gap-3">

                                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded text-[11px]">
                                  + {addedBaseStock}{' '}
                                  {
                                    product?.base_unit
                                  }{' '}
                                  stok
                                </span>

                                <span className="font-bold text-gray-900 text-xs">
                                  Subtotal:{' '}
                                  {formatRupiah(
                                    item.subtotal
                                  )}
                                </span>

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )}

                  </div>
                )}

              </div>

              {/* TOTAL */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                <div>
                  <span className="text-xs text-gray-500 font-semibold">
                    Total Modal Belanja:
                  </span>

                  <div className="text-2xl font-extrabold text-emerald-900">
                    {formatRupiah(totalBelanja)}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loading ||
                    products.length === 0
                  }
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </span>
                  ) : (
                    'Simpan & Tambah Stok'
                  )}
                </button>

              </div>

            </form>

          </Card>

          {/* =================================================
              RIWAYAT
          ================================================= */}

          <Card className="lg:col-span-5">

            <CardHeader>
              <CardTitle>
                <History className="w-5 h-5 text-indigo-600" />
                Riwayat Barang Masuk
              </CardTitle>
            </CardHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

              {purchases.length === 0 ? (
                <div className="py-10 text-center">

                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />

                  <p className="text-xs text-gray-400">
                    Belum ada riwayat belanja
                    barang masuk.
                  </p>

                </div>
              ) : (
                purchases.map((purchase) => {

                  const productMap =
                    new Map(
                      products.map((p) => [
                        p.id,
                        p,
                      ])
                    );

                  return (
                    <div
                      key={purchase.id}
                      className="p-3.5 bg-gray-50 border border-gray-200/70 rounded-xl space-y-2"
                    >

                      <div className="flex items-center justify-between text-xs border-b border-gray-200/50 pb-2">

                        <span className="font-bold text-gray-800 flex items-center gap-1.5">

                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />

                          {formatDateIndo(
                            purchase.date
                          )}

                        </span>

                        <span className="font-extrabold text-emerald-800 text-sm">
                          {formatRupiah(
                            Number(
                              purchase.total_cost
                            )
                          )}
                        </span>

                      </div>

                      {purchase.note && (
                        <p className="text-xs text-gray-500 italic">
                          "{purchase.note}"
                        </p>
                      )}

                      <div className="space-y-1">

                        {purchase.purchase_items?.map(
                          (item) => {

                            const product =
                              productMap.get(
                                item.product_id
                              );

                            const unit =
                              product?.product_units.find(
                                (u) =>
                                  u.id ===
                                  item.product_unit_id
                              );

                            return (
                              <div
                                key={item.id}
                                className="flex justify-between gap-3 text-xs text-gray-600"
                              >

                                <span>
                                  •{' '}
                                  {product?.name ||
                                    'Produk'}{' '}
                                  (
                                  {item.quantity}{' '}
                                  {unit?.unit_name ||
                                    product?.base_unit ||
                                    'Pcs'}
                                  )
                                </span>

                                <span className="font-medium whitespace-nowrap">
                                  {formatRupiah(
                                    Number(
                                      item.subtotal
                                    )
                                  )}
                                </span>

                              </div>
                            );
                          }
                        )}

                      </div>

                    </div>
                  );
                })
              )}

            </div>

          </Card>

        </div>
      )}

    </div>
  );
}