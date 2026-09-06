'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMultiUnitStock, formatRupiah } from '@/lib/utils';
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
  category_id: string | null;
  category_name: string;
  base_unit: string;
  minimum_stock: number;
  is_active: boolean;
  current_stock_base: number;
  units: ProductUnit[];
};

type StockMovement = {
  product_id: string;
  quantity_base: number;
  movement_type: string;
};

type Category = {
  id: string;
  name: string;
};

export default function StokPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AMAN' | 'MENIPIS' | 'HABIS'>('ALL');

  const loadData = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage('Supabase belum terkonfigurasi. Periksa environment variable Supabase.');
      setLoading(false);
      return;
    }

    setErrorMessage('');
    setRefreshing(true);

    try {
      const [productsResult, categoriesResult, movementsResult] = await Promise.all([
        supabase
          .from('products')
          .select(`
            id,
            name,
            category_id,
            base_unit,
            minimum_stock,
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
          .order('name', { ascending: true }),
        supabase
          .from('categories')
          .select('id, name')
          .order('name', { ascending: true }),
        supabase
          .from('stock_movements')
          .select('product_id, quantity_base, movement_type'),
      ]);

      if (productsResult.error) {
        throw new Error(`Gagal mengambil produk: ${productsResult.error.message}`);
      }
      if (categoriesResult.error) {
        throw new Error(`Gagal mengambil kategori: ${categoriesResult.error.message}`);
      }
      if (movementsResult.error) {
        throw new Error(`Gagal mengambil pergerakan stok: ${movementsResult.error.message}`);
      }

      const categories = (categoriesResult.data || []) as Category[];
      const movements = (movementsResult.data || []) as StockMovement[];
      const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

      const stockMap = new Map<string, number>();
      movements.forEach((movement) => {
        const current = stockMap.get(movement.product_id) || 0;
        stockMap.set(
          movement.product_id,
          current + Number(movement.quantity_base || 0)
        );
      });

      const mappedProducts: Product[] = (productsResult.data || []).map((product) => ({
        id: product.id,
        name: product.name,
        category_id: product.category_id,
        category_name: product.category_id
          ? categoryMap.get(product.category_id) || 'Tanpa Kategori'
          : 'Tanpa Kategori',
        base_unit: product.base_unit,
        minimum_stock: Number(product.minimum_stock || 0),
        is_active: product.is_active,
        current_stock_base: stockMap.get(product.id) || 0,
        units: (product.product_units || []).map((unit) => ({
          ...unit,
          conversion_to_base: Number(unit.conversion_to_base || 1),
          cost_price: Number(unit.cost_price || 0),
          selling_price: Number(unit.selling_price || 0),
        })),
      }));

      setProducts(mappedProducts);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal mengambil data stok.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const search = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.category_name.toLowerCase().includes(search);

      let status: 'AMAN' | 'MENIPIS' | 'HABIS' = 'AMAN';
      if (product.current_stock_base <= 0) status = 'HABIS';
      else if (product.current_stock_base <= product.minimum_stock) status = 'MENIPIS';

      return matchesSearch && (statusFilter === 'ALL' || statusFilter === status);
    });
  }, [products, searchQuery, statusFilter]);

  const summary = useMemo(() => {
    const totalStockBase = products.reduce(
      (total, product) => total + product.current_stock_base,
      0
    );
    const totalStockValue = products.reduce((total, product) => {
      const baseUnit = product.units.find((unit) => unit.conversion_to_base === 1);
      const fallbackUnit = product.units.find((unit) => unit.is_default) || product.units[0];
      const costPerBase = baseUnit
        ? Number(baseUnit.cost_price || 0)
        : fallbackUnit
          ? Number(fallbackUnit.cost_price || 0) / Number(fallbackUnit.conversion_to_base || 1)
          : 0;

      return total + product.current_stock_base * costPerBase;
    }, 0);

    return {
      totalProducts: products.length,
      safe: products.filter((product) => product.current_stock_base > product.minimum_stock).length,
      low: products.filter(
        (product) => product.current_stock_base > 0 && product.current_stock_base <= product.minimum_stock
      ).length,
      empty: products.filter((product) => product.current_stock_base <= 0).length,
      totalStockBase,
      totalStockValue,
    };
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Boxes className="h-6 w-6 text-emerald-600" />
            Kondisi Stok Realtime
          </h1>
          <p className="text-sm text-gray-500">
            Stok dihitung langsung dari seluruh pergerakan stok di Supabase.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Memuat...' : 'Refresh Stok'}
        </button>
      </div>

      {errorMessage && (
        <Card className="border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3 text-rose-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Gagal memuat stok</p>
              <p className="mt-1 text-sm">{errorMessage}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Package className="h-4 w-4" /> Produk
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.totalProducts}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Aman
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.safe}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertTriangle className="h-4 w-4" /> Menipis
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.low}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-rose-600">
            <XCircle className="h-4 w-4" /> Habis
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.empty}</p>
        </Card>
        <Card className="p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Wallet className="h-4 w-4" /> Nilai Stok
          </div>
          <p className="mt-2 text-lg font-bold text-gray-900">{formatRupiah(summary.totalStockValue)}</p>
          <p className="mt-1 text-xs text-gray-500">{summary.totalStockBase.toLocaleString('id-ID')} unit base</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col items-center gap-3 md:flex-row">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari produk atau kategori..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            {[
              ['ALL', 'Semua'],
              ['AMAN', 'Stok Aman'],
              ['MENIPIS', 'Stok Menipis'],
              ['HABIS', 'Stok Habis'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value as typeof statusFilter)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                  statusFilter === value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase text-gray-600">
              <tr>
                <th className="p-4">Produk</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Stok Base</th>
                <th className="p-4">Tampilan Satuan</th>
                <th className="p-4">Minimum</th>
                <th className="p-4">Nilai Modal</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400">
                    Memuat data stok dari Supabase...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400">
                    Tidak ada data stok produk.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const baseUnit = product.units.find((unit) => unit.conversion_to_base === 1);
                  const fallbackUnit = product.units.find((unit) => unit.is_default) || product.units[0];
                  const costPerBase = baseUnit
                    ? Number(baseUnit.cost_price || 0)
                    : fallbackUnit
                      ? Number(fallbackUnit.cost_price || 0) / Number(fallbackUnit.conversion_to_base || 1)
                      : 0;
                  const stockValue = product.current_stock_base * costPerBase;

                  let statusVariant: 'emerald' | 'amber' | 'red' = 'emerald';
                  let statusText = 'Aman';
                  if (product.current_stock_base <= 0) {
                    statusVariant = 'red';
                    statusText = 'Habis';
                  } else if (product.current_stock_base <= product.minimum_stock) {
                    statusVariant = 'amber';
                    statusText = 'Menipis';
                  }

                  return (
                    <tr key={product.id} className="transition-colors hover:bg-gray-50/80">
                      <td className="p-4 font-bold text-gray-900">{product.name}</td>
                      <td className="p-4 text-xs text-gray-500">{product.category_name}</td>
                      <td className="p-4 font-extrabold text-gray-900">
                        {product.current_stock_base.toLocaleString('id-ID')}
                        <span className="ml-1 text-xs font-normal text-gray-500">{product.base_unit}</span>
                      </td>
                      <td className="p-4 font-semibold text-emerald-800">
                        {formatMultiUnitStock(
                          product.current_stock_base,
                          product.base_unit,
                          product.units
                        )}
                      </td>
                      <td className="p-4 text-xs text-gray-500">
                        {product.minimum_stock.toLocaleString('id-ID')} {product.base_unit}
                      </td>
                      <td className="p-4 font-semibold text-gray-800">{formatRupiah(stockValue)}</td>
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
