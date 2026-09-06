'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Boxes, Moon, Package, Plus, TrendingUp, Wallet } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatRupiah, formatMultiUnitStock, formatDateIndo, getTodayDateString } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

type Product = { id: string; name: string; base_unit: string; minimum_stock: number; is_active: boolean };
type Unit = { product_id: string; conversion_to_base: number; cost_price: number; selling_price: number; is_default: boolean };
type Movement = { product_id: string; quantity_base: number; movement_type: string; date: string };
type Usage = { type: string; product_id: string | null; quantity_base: number | null; amount_cash: number | null; date: string };
type Opname = { id: string; date: string };
type Item = { stock_opname_id: string; product_id: string; calculated_sales_base: number; selling_amount: number; cost_amount: number; profit_amount: number; personal_use_cost_amount: number | null };

type ChartPoint = { date: string; omzet: number; laba: number };

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [usages, setUsages] = useState<Usage[]>([]);
  const [opnames, setOpnames] = useState<Opname[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = getTodayDateString();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!supabase || !isSupabaseConfigured) {
        setError('Supabase belum terkonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }
      try {
        setError('');
        const [productsRes, unitsRes, movementsRes, usagesRes, opnamesRes, itemsRes] = await Promise.all([
          supabase.from('products').select('id,name,base_unit,minimum_stock,is_active').eq('is_active', true).order('name'),
          supabase.from('product_units').select('product_id,conversion_to_base,cost_price,selling_price,is_default'),
          supabase.from('stock_movements').select('product_id,quantity_base,movement_type,date'),
          supabase.from('personal_usages').select('type,product_id,quantity_base,amount_cash,date'),
          supabase.from('daily_stock_opnames').select('id,date').order('date', { ascending: false }),
          supabase.from('daily_stock_opname_items').select('stock_opname_id,product_id,calculated_sales_base,selling_amount,cost_amount,profit_amount,personal_use_cost_amount'),
        ]);
        const firstError = productsRes.error || unitsRes.error || movementsRes.error || usagesRes.error || opnamesRes.error || itemsRes.error;
        if (firstError) throw new Error(firstError.message);
        if (cancelled) return;
        setProducts((productsRes.data || []) as Product[]);
        setUnits((unitsRes.data || []) as Unit[]);
        setMovements((movementsRes.data || []) as Movement[]);
        setUsages((usagesRes.data || []) as Usage[]);
        setOpnames((opnamesRes.data || []) as Opname[]);
        setItems((itemsRes.data || []) as Item[]);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal mengambil data dari Supabase.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [today]);

  const basePrice = (productId: string, field: 'cost_price' | 'selling_price') => {
    const list = units.filter((u) => u.product_id === productId);
    const base = list.find((u) => Number(u.conversion_to_base) === 1);
    if (base) return Number(base[field] || 0);
    const unit = list.find((u) => u.is_default) || list[0];
    if (!unit) return 0;
    return Number(unit[field] || 0) / Math.max(1, Number(unit.conversion_to_base || 1));
  };

  const stock = useMemo(() => {
    const result: Record<string, number> = {};
    products.forEach((p) => { result[p.id] = 0; });
    movements.forEach((m) => {
      if (result[m.product_id] !== undefined) result[m.product_id] += Number(m.quantity_base || 0);
    });
    return result;
  }, [products, movements]);

  const todayOpname = opnames.find((o) => o.date === today);
  const todayItems = useMemo(() => items.filter((i) => i.stock_opname_id === todayOpname?.id), [items, todayOpname]);

  const stats = useMemo(() => {
    const omzet = todayItems.reduce((s, i) => s + Number(i.selling_amount || 0), 0);
    const modal = todayItems.reduce((s, i) => s + Number(i.cost_amount || 0), 0);
    const laba = todayItems.reduce((s, i) => s + Number(i.profit_amount || 0), 0);
    const personalBarang = usages.filter((u) => u.date === today && u.type === 'BARANG');
    const personalCost = personalBarang.reduce((s, u) => s + Number(u.quantity_base || 0) * basePrice(u.product_id || '', 'cost_price'), 0);
    const cash = usages.filter((u) => u.date === today && u.type === 'UANG_CASH').reduce((s, u) => s + Number(u.amount_cash || 0), 0);
    const sold = todayItems.reduce((s, i) => s + Number(i.calculated_sales_base || 0), 0);
    return { omzet, modal, laba, personalCost, net: laba - personalCost, cash, sold, personalCount: personalBarang.reduce((s, u) => s + Number(u.quantity_base || 0), 0) };
  }, [todayItems, usages, units, today]);

  const stockValue = useMemo(() => products.reduce((sum, p) => sum + Math.max(0, stock[p.id] || 0) * basePrice(p.id, 'cost_price'), 0), [products, stock, units]);
  const lowStock = useMemo(() => products.filter((p) => (stock[p.id] || 0) <= Number(p.minimum_stock || 0)).sort((a, b) => (stock[a.id] || 0) - (stock[b.id] || 0)), [products, stock]);

  const topProducts = useMemo(() => todayItems.map((i) => ({ ...i, product: products.find((p) => p.id === i.product_id) })).filter((x) => x.product).sort((a, b) => Number(b.calculated_sales_base) - Number(a.calculated_sales_base)).slice(0, 5), [todayItems, products]);

  const chart = useMemo<ChartPoint[]>(() => {
    const byId = Object.fromEntries(opnames.map((o) => [o.id, o.date]));
    const byDate: Record<string, { omzet: number; laba: number }> = {};
    items.forEach((i) => {
      const date = byId[i.stock_opname_id];
      if (!date) return;
      if (!byDate[date]) byDate[date] = { omzet: 0, laba: 0 };
      byDate[date].omzet += Number(i.selling_amount || 0);
      byDate[date].laba += Number(i.profit_amount || 0);
    });
    const now = new Date(`${today}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - index));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { date: key.slice(5).replace('-', '/'), omzet: Math.round(byDate[key]?.omzet || 0), laba: Math.round(byDate[key]?.laba || 0) };
    });
  }, [items, opnames, today]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><div className="w-9 h-9 border-4 border-emerald-200 border-t-[#073b2a] rounded-full animate-spin mx-auto" /><p className="text-sm text-gray-500 mt-3">Memuat Dashboard dari Supabase...</p></div></div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"><b>Dashboard gagal dimuat</b><p className="text-sm mt-1">{error}</p></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1><p className="text-xs md:text-sm text-gray-500 mt-1">{formatDateIndo(today)} • Data langsung dari Supabase</p></div>
        <div className="flex gap-2"><Link href="/rekap-malam" className="px-4 py-2.5 bg-[#073b2a] text-white rounded-xl text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Mulai Rekap</Link><Link href="/barang-masuk" className="px-4 py-2.5 bg-white border rounded-xl text-gray-700 text-xs font-bold">+ Barang Masuk</Link></div>
      </div>

      {!todayOpname && <div className="bg-[#073b2a] text-white rounded-2xl p-4 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><Moon className="w-5 h-5 text-emerald-300" /><div><b className="text-sm">Rekap malam belum selesai</b><p className="text-xs text-emerald-100/80">Masukkan stok fisik malam ini agar penjualan, omzet, dan laba hari ini difinalkan.</p></div></div><Link href="/rekap-malam" className="bg-emerald-300 text-[#073b2a] px-3 py-2 rounded-lg text-xs font-extrabold">Rekap →</Link></div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi title="Omzet Hari Ini" value={formatRupiah(stats.omzet)} dark icon={<ArrowUpRight />} />
        <Kpi title="Laba Penjualan" value={formatRupiah(stats.laba)} icon={<TrendingUp />} />
        <Kpi title="Beban Pemakaian" value={formatRupiah(stats.personalCost)} icon={<Package />} />
        <Kpi title="Laba Setelah Pemakaian" value={formatRupiah(stats.net)} icon={<TrendingUp />} />
        <Kpi title="Kas Pribadi Diambil" value={formatRupiah(stats.cash)} icon={<Wallet />} />
        <Kpi title="Barang Terjual" value={`${stats.sold} unit`} icon={<Package />} />
        <Kpi title="Nilai Stok" value={formatRupiah(stockValue)} icon={<Boxes />} />
        <Kpi title="Stok Menipis" value={`${lowStock.length} produk`} icon={<AlertTriangle />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"><div className="mb-4"><h2 className="font-extrabold text-lg">Trend Omzet & Laba 7 Hari</h2><p className="text-xs text-gray-500">Diambil dari rekap malam yang tersimpan di Supabase.</p></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v: any) => formatRupiah(Number(v))} /><Area type="monotone" dataKey="omzet" name="Omzet" stroke="#073b2a" fill="#073b2a" fillOpacity={0.12} strokeWidth={2.5} /><Area type="monotone" dataKey="laba" name="Laba" stroke="#10b981" fill="#10b981" fillOpacity={0.12} strokeWidth={2} /></AreaChart></ResponsiveContainer></div></div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"><h2 className="font-extrabold text-lg">Produk Terlaris Hari Ini</h2><p className="text-xs text-gray-500 mt-1">Berdasarkan base unit yang terjual.</p><div className="mt-4 space-y-3">{topProducts.length ? topProducts.map((item, index) => <div key={item.product_id} className="flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center">{index + 1}</span><span className="text-sm font-semibold truncate">{item.product?.name}</span></div><span className="text-sm font-extrabold">{item.calculated_sales_base}</span></div>) : <p className="text-sm text-gray-400 py-8 text-center">Belum ada penjualan yang difinalkan hari ini.</p>}</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-extrabold text-lg">Stok Menipis</h2><p className="text-xs text-gray-500 mt-1">Produk di bawah atau sama dengan batas minimum.</p></div><Link href="/barang" className="text-xs font-bold text-emerald-700">Kelola →</Link></div><div className="mt-4 space-y-3">{lowStock.slice(0, 8).map((p) => <div key={p.id} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3"><div><p className="text-sm font-bold">{p.name}</p><p className="text-[11px] text-gray-400">Minimum {p.minimum_stock} {p.base_unit}</p></div><span className="text-sm font-extrabold text-red-600">{formatMultiUnitStock(Math.max(0, stock[p.id] || 0), p.base_unit, units.filter((u) => u.product_id === p.id) as any)}</span></div>)}{lowStock.length === 0 && <p className="text-sm text-gray-400">Semua stok aman.</p>}</div></div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"><h2 className="font-extrabold text-lg">Ringkasan Pemakaian Pribadi</h2><div className="grid grid-cols-2 gap-3 mt-4"><div className="rounded-xl bg-purple-50 p-4"><p className="text-xs text-purple-700 font-bold">Barang Dipakai</p><p className="text-xl font-extrabold text-purple-950 mt-1">{stats.personalCount} unit</p><p className="text-[11px] text-purple-700/70 mt-1">Menjadi beban modal</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700 font-bold">Kas Diambil</p><p className="text-xl font-extrabold text-emerald-950 mt-1">{formatRupiah(stats.cash)}</p><p className="text-[11px] text-emerald-700/70 mt-1">Tidak dihitung omzet</p></div></div><div className="mt-4 rounded-xl border bg-gray-50 p-4 text-sm"><div className="flex justify-between"><span className="text-gray-500">Laba penjualan</span><b>{formatRupiah(stats.laba)}</b></div><div className="flex justify-between mt-2"><span className="text-gray-500">Beban pemakaian</span><b className="text-red-600">− {formatRupiah(stats.personalCost)}</b></div><div className="flex justify-between mt-3 pt-3 border-t"><span className="font-bold">Laba setelah pemakaian</span><b className="text-[#073b2a]">{formatRupiah(stats.net)}</b></div></div></div>
      </div>
    </div>
  );
}

function Kpi({ title, value, icon, dark = false }: { title: string; value: string; icon: React.ReactElement<{ className?: string }>; dark?: boolean }) {
  return <div className={`${dark ? 'bg-[#073b2a] text-white border-[#073b2a]' : 'bg-white text-gray-900 border-gray-200'} rounded-2xl p-4 md:p-5 border shadow-sm min-w-0`}><div className="flex items-center justify-between gap-2"><span className={`text-[11px] font-bold uppercase tracking-wider truncate ${dark ? 'text-emerald-200' : 'text-gray-500'}`}>{title}</span><span className={dark ? 'text-emerald-300' : 'text-emerald-700'}>{React.cloneElement(icon, { className: 'w-4 h-4' })}</span></div><p className="text-lg xl:text-2xl font-extrabold mt-3 truncate" title={value}>{value}</p></div>;
}
