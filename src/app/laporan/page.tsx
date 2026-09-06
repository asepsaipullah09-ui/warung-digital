'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  ShoppingBag,
  UserCheck,
  Wallet,
  Package,
  Trophy,
  Receipt,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatRupiah, formatShortDateIndo, getTodayDateString } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  base_unit: string;
}

interface Opname {
  id: string;
  date: string;
  total_personal_cash: number | null;
  total_sold_base: number;
  total_sales_amount: number;
  total_cost_amount: number;
  total_profit_amount: number;
  total_personal_use_cost: number;
  total_net_profit: number;
}

interface OpnameItem {
  stock_opname_id: string;
  product_id: string;
  calculated_sales_base: number;
  selling_amount: number;
  cost_amount: number;
  profit_amount: number;
  personal_use_base: number;
  personal_use_cost_amount: number;
  net_profit_after_personal_use: number;
}

interface Purchase {
  id: string;
  date: string;
  total_cost: number;
  note: string | null;
}

interface PersonalUsage {
  id: string;
  type: string;
  product_id: string | null;
  quantity_base: number | null;
  amount_cash: number | null;
  date: string;
  note: string | null;
}

const money = (value: number | null | undefined) => formatRupiah(Number(value) || 0);

const localDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function LaporanPage() {
  const [filterType, setFilterType] = useState<'TODAY' | '7DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('7DAYS');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [opnames, setOpnames] = useState<Opname[]>([]);
  const [items, setItems] = useState<OpnameItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [usages, setUsages] = useState<PersonalUsage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getFilterDateRange = () => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    if (filterType === '7DAYS') {
      start.setDate(today.getDate() - 6);
    } else if (filterType === 'THIS_MONTH') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (filterType === 'LAST_MONTH') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (filterType === 'CUSTOM') {
      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${endDate}T00:00:00`);
    }

    return { startStr: localDate(start), endStr: localDate(end) };
  };

  const { startStr, endStr } = getFilterDateRange();

  useEffect(() => {
    const loadData = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase belum terkonfigurasi. Periksa .env.local.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const [opnameRes, itemRes, purchaseRes, usageRes, productRes] = await Promise.all([
        supabase
          .from('daily_stock_opnames')
          .select('id,date,total_personal_cash,total_sold_base,total_sales_amount,total_cost_amount,total_profit_amount,total_personal_use_cost,total_net_profit')
          .order('date', { ascending: false }),
        supabase
          .from('daily_stock_opname_items')
          .select('stock_opname_id,product_id,calculated_sales_base,selling_amount,cost_amount,profit_amount,personal_use_base,personal_use_cost_amount,net_profit_after_personal_use'),
        supabase
          .from('purchases')
          .select('id,date,total_cost,note')
          .order('date', { ascending: false }),
        supabase
          .from('personal_usages')
          .select('id,type,product_id,quantity_base,amount_cash,date,note')
          .order('date', { ascending: false }),
        supabase.from('products').select('id,name,base_unit').eq('is_active', true).order('name'),
      ]);

      const firstError = opnameRes.error || itemRes.error || purchaseRes.error || usageRes.error || productRes.error;
      if (firstError) {
        setError(firstError.message || 'Gagal memuat data laporan.');
        setLoading(false);
        return;
      }

      setOpnames((opnameRes.data || []) as Opname[]);
      setItems((itemRes.data || []) as OpnameItem[]);
      setPurchases((purchaseRes.data || []) as Purchase[]);
      setUsages((usageRes.data || []) as PersonalUsage[]);
      setProducts((productRes.data || []) as Product[]);
      setLoading(false);
    };

    loadData();
  }, []);

  const filteredOpnames = useMemo(
    () => opnames.filter((row) => row.date >= startStr && row.date <= endStr),
    [opnames, startStr, endStr]
  );
  const filteredPurchases = useMemo(
    () => purchases.filter((row) => row.date >= startStr && row.date <= endStr),
    [purchases, startStr, endStr]
  );
  const filteredUsages = useMemo(
    () => usages.filter((row) => row.date >= startStr && row.date <= endStr),
    [usages, startStr, endStr]
  );

  const filteredOpnameIds = useMemo(() => new Set(filteredOpnames.map((row) => row.id)), [filteredOpnames]);
  const filteredItems = useMemo(
    () => items.filter((row) => filteredOpnameIds.has(row.stock_opname_id)),
    [items, filteredOpnameIds]
  );

  const totals = useMemo(() => {
    const itemTotals = filteredItems.reduce(
      (acc, row) => ({
        sold: acc.sold + Number(row.calculated_sales_base || 0),
        omzet: acc.omzet + Number(row.selling_amount || 0),
        modal: acc.modal + Number(row.cost_amount || 0),
        laba: acc.laba + Number(row.profit_amount || 0),
        personalCost: acc.personalCost + Number(row.personal_use_cost_amount || 0),
        net: acc.net + Number(row.net_profit_after_personal_use || 0),
        personalBase: acc.personalBase + Number(row.personal_use_base || 0),
      }),
      { sold: 0, omzet: 0, modal: 0, laba: 0, personalCost: 0, net: 0, personalBase: 0 }
    );

    const header = filteredOpnames.reduce(
      (acc, row) => ({
        sold: acc.sold + Number(row.total_sold_base || 0),
        omzet: acc.omzet + Number(row.total_sales_amount || 0),
        modal: acc.modal + Number(row.total_cost_amount || 0),
        laba: acc.laba + Number(row.total_profit_amount || 0),
        personalCost: acc.personalCost + Number(row.total_personal_use_cost || 0),
        net: acc.net + Number(row.total_net_profit || 0),
      }),
      { sold: 0, omzet: 0, modal: 0, laba: 0, personalCost: 0, net: 0 }
    );

    const hasItemValues = filteredItems.some(
      (row) => Number(row.selling_amount || 0) !== 0 || Number(row.cost_amount || 0) !== 0 || Number(row.calculated_sales_base || 0) !== 0
    );

    const cash = filteredUsages
      .filter((row) => row.type === 'UANG_CASH')
      .reduce((sum, row) => sum + Number(row.amount_cash || 0), 0);

    const itemUsageBase = filteredUsages
      .filter((row) => row.type === 'BARANG')
      .reduce((sum, row) => sum + Number(row.quantity_base || 0), 0);

    return {
      sold: hasItemValues ? itemTotals.sold : header.sold,
      omzet: hasItemValues ? itemTotals.omzet : header.omzet,
      modal: hasItemValues ? itemTotals.modal : header.modal,
      laba: hasItemValues ? itemTotals.laba : header.laba,
      personalCost: hasItemValues ? itemTotals.personalCost : header.personalCost,
      net: hasItemValues ? itemTotals.net : header.net,
      personalBase: Math.max(itemTotals.personalBase, itemUsageBase),
      cash,
    };
  }, [filteredItems, filteredOpnames, filteredUsages]);

  const chartData = useMemo(() => {
    return filteredOpnames
      .map((row) => {
        const rowItems = items.filter((item) => item.stock_opname_id === row.id);
        const hasValues = rowItems.some((item) => Number(item.selling_amount || 0) !== 0 || Number(item.calculated_sales_base || 0) !== 0);
        return {
          date: row.date,
          date_formatted: formatShortDateIndo(row.date),
          omzet: hasValues ? rowItems.reduce((s, i) => s + Number(i.selling_amount || 0), 0) : Number(row.total_sales_amount || 0),
          laba: hasValues ? rowItems.reduce((s, i) => s + Number(i.net_profit_after_personal_use || 0), 0) : Number(row.total_net_profit || row.total_profit_amount || 0),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOpnames, items]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { productId: string; sold: number; omzet: number; laba: number }>();
    filteredItems.forEach((row) => {
      const current = map.get(row.product_id) || { productId: row.product_id, sold: 0, omzet: 0, laba: 0 };
      current.sold += Number(row.calculated_sales_base || 0);
      current.omzet += Number(row.selling_amount || 0);
      current.laba += Number(row.profit_amount || 0);
      map.set(row.product_id, current);
    });
    return Array.from(map.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)
      .map((row) => ({ ...row, name: products.find((p) => p.id === row.productId)?.name || 'Produk' }));
  }, [filteredItems, products]);

  const exportToCSV = () => {
    if (filteredOpnames.length === 0) {
      alert('Tidak ada data rekap pada rentang tanggal ini.');
      return;
    }

    const rows = [
      ['Tanggal', 'Barang Terjual (Unit Dasar)', 'Omzet', 'Modal', 'Laba Penjualan', 'Beban Pemakaian Pribadi', 'Laba Setelah Pemakaian'],
      ...filteredOpnames.map((row) => {
        const rowItems = items.filter((item) => item.stock_opname_id === row.id);
        const hasValues = rowItems.some((item) => Number(item.selling_amount || 0) !== 0 || Number(item.calculated_sales_base || 0) !== 0);
        const omzet = hasValues ? rowItems.reduce((s, i) => s + Number(i.selling_amount || 0), 0) : Number(row.total_sales_amount || 0);
        const modal = hasValues ? rowItems.reduce((s, i) => s + Number(i.cost_amount || 0), 0) : Number(row.total_cost_amount || 0);
        const laba = hasValues ? rowItems.reduce((s, i) => s + Number(i.profit_amount || 0), 0) : Number(row.total_profit_amount || 0);
        const burden = hasValues ? rowItems.reduce((s, i) => s + Number(i.personal_use_cost_amount || 0), 0) : Number(row.total_personal_use_cost || 0);
        const net = hasValues ? rowItems.reduce((s, i) => s + Number(i.net_profit_after_personal_use || 0), 0) : Number(row.total_net_profit || 0);
        return [row.date, Number(row.total_sold_base || 0), omzet, modal, laba, burden, net];
      }),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Warung_${startStr}_sd_${endStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const labelRange = `${startStr} s/d ${endStr}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Laporan Keuangan & Analisis
          </h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan penjualan, laba, belanja, pemakaian pribadi, dan pengambilan kas.</p>
        </div>
        <button onClick={exportToCSV} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors">
          <Download className="w-4 h-4" /> Export CSV / Excel
        </button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              ['TODAY', 'Hari Ini'],
              ['7DAYS', '7 Hari'],
              ['THIS_MONTH', 'Bulan Ini'],
              ['LAST_MONTH', 'Bulan Lalu'],
              ['CUSTOM', 'Kustom'],
            ].map(([value, label]) => (
              <button key={value} onClick={() => setFilterType(value as typeof filterType)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${filterType === value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>
          {filterType === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg" />
              <span>s/d</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg" />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3">Periode laporan: {labelRange}</p>
      </Card>

      {error && <Card className="border-red-200 bg-red-50 text-red-700 p-4 text-sm">{error}</Card>}

      {loading ? (
        <Card className="p-8 text-center text-sm text-gray-500">Memuat laporan dari Supabase...</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Card className="bg-emerald-50/50 border-emerald-100"><span className="text-[11px] font-semibold uppercase text-emerald-700 block">Omzet Penjualan</span><span className="text-lg font-bold text-emerald-900">{money(totals.omzet)}</span></Card>
            <Card className="bg-blue-50/50 border-blue-100"><span className="text-[11px] font-semibold uppercase text-blue-700 block">Laba Penjualan</span><span className="text-lg font-bold text-blue-900">{money(totals.laba)}</span></Card>
            <Card><span className="text-[11px] font-semibold uppercase text-gray-500 block">Modal Terjual</span><span className="text-lg font-bold text-gray-900">{money(totals.modal)}</span></Card>
            <Card><span className="text-[11px] font-semibold uppercase text-indigo-600 block">Barang Terjual</span><span className="text-lg font-bold text-indigo-900">{totals.sold} unit dasar</span></Card>
            <Card className="bg-purple-50/50 border-purple-100"><span className="text-[11px] font-semibold uppercase text-purple-700 block">Beban Pemakaian</span><span className="text-lg font-bold text-purple-900">{money(totals.personalCost)}</span></Card>
            <Card className="bg-amber-50/50 border-amber-100"><span className="text-[11px] font-semibold uppercase text-amber-700 block">Laba Setelah Pakai</span><span className="text-lg font-bold text-amber-900">{money(totals.net)}</span></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-amber-100"><Package className="w-5 h-5 text-amber-700" /></div><div><p className="text-xs text-gray-500">Total Belanja Barang</p><p className="text-xl font-bold text-gray-900">{money(filteredPurchases.reduce((s, p) => s + Number(p.total_cost || 0), 0))}</p></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-rose-100"><Wallet className="w-5 h-5 text-rose-700" /></div><div><p className="text-xs text-gray-500">Pengambilan Kas Pribadi</p><p className="text-xl font-bold text-gray-900">{money(totals.cash)}</p><p className="text-[11px] text-gray-400">Tidak dihitung sebagai omzet maupun laba</p></div></div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle><TrendingUp className="w-5 h-5 text-emerald-600" /> Tren Omzet & Laba</CardTitle></CardHeader>
              <div className="h-64 w-full pt-2">
                {chartData.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-gray-400">Belum ada rekap pada periode ini.</div> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="date_formatted" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `Rp${Math.round(val / 1000)}k`} /><Tooltip formatter={(value: unknown, name: unknown) => [money(Number(value)), String(name)]} /><Area type="monotone" dataKey="omzet" name="Omzet" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} /><Area type="monotone" dataKey="laba" name="Laba" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} strokeWidth={2} /></AreaChart></ResponsiveContainer>}
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle><ShoppingBag className="w-5 h-5 text-indigo-600" /> Penjualan Per Hari</CardTitle></CardHeader>
              <div className="h-64 w-full pt-2">
                {chartData.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-gray-400">Belum ada data.</div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="date_formatted" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="omzet" name="Omzet" fill="#6366f1" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle><Trophy className="w-5 h-5 text-amber-600" /> Produk Paling Banyak Terjual</CardTitle></CardHeader>
              <div className="divide-y divide-gray-100">
                {topProducts.length === 0 ? <p className="p-4 text-sm text-gray-400">Belum ada data penjualan produk.</p> : topProducts.map((product, index) => (
                  <div key={product.productId} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0"><span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">{index + 1}</span><div className="min-w-0"><p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p><p className="text-xs text-gray-500">{product.sold} unit dasar · Omzet {money(product.omzet)}</p></div></div>
                    <span className="text-sm font-bold text-emerald-700 shrink-0">{money(product.laba)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle><UserCheck className="w-5 h-5 text-purple-600" /> Pemakaian Pribadi</CardTitle></CardHeader>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-purple-50 p-3"><p className="text-xs text-purple-600">Barang Dipakai</p><p className="text-lg font-bold text-purple-900">{totals.personalBase} unit dasar</p></div><div className="rounded-xl bg-rose-50 p-3"><p className="text-xs text-rose-600">Cash Diambil</p><p className="text-lg font-bold text-rose-900">{money(totals.cash)}</p></div></div>
                <div className="flex items-start gap-2 text-xs text-gray-500"><Receipt className="w-4 h-4 mt-0.5 shrink-0" />Pemakaian barang dibebankan sebesar harga modal dan mengurangi laba. Pengambilan cash hanya mengurangi kas/laci.</div>
                <div className="text-xs text-gray-400">Total transaksi pemakaian: {filteredUsages.length}</div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle><BarChart3 className="w-5 h-5 text-gray-600" /> Ringkasan Harian</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm"><thead><tr className="border-b border-gray-100 text-left text-xs text-gray-500"><th className="p-3">Tanggal</th><th className="p-3 text-right">Terjual</th><th className="p-3 text-right">Omzet</th><th className="p-3 text-right">Modal</th><th className="p-3 text-right">Laba</th><th className="p-3 text-right">Beban Pribadi</th><th className="p-3 text-right">Laba Setelah Pakai</th></tr></thead><tbody>
                {filteredOpnames.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-gray-400">Belum ada rekap malam pada periode ini.</td></tr> : [...filteredOpnames].sort((a, b) => b.date.localeCompare(a.date)).map((row) => {
                  const rowItems = items.filter((item) => item.stock_opname_id === row.id);
                  const hasValues = rowItems.some((item) => Number(item.selling_amount || 0) !== 0 || Number(item.calculated_sales_base || 0) !== 0);
                  const omzet = hasValues ? rowItems.reduce((s, i) => s + Number(i.selling_amount || 0), 0) : Number(row.total_sales_amount || 0);
                  const modal = hasValues ? rowItems.reduce((s, i) => s + Number(i.cost_amount || 0), 0) : Number(row.total_cost_amount || 0);
                  const laba = hasValues ? rowItems.reduce((s, i) => s + Number(i.profit_amount || 0), 0) : Number(row.total_profit_amount || 0);
                  const burden = hasValues ? rowItems.reduce((s, i) => s + Number(i.personal_use_cost_amount || 0), 0) : Number(row.total_personal_use_cost || 0);
                  const net = hasValues ? rowItems.reduce((s, i) => s + Number(i.net_profit_after_personal_use || 0), 0) : Number(row.total_net_profit || 0);
                  return <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50"><td className="p-3 font-medium">{formatShortDateIndo(row.date)}</td><td className="p-3 text-right">{Number(row.total_sold_base || 0)}</td><td className="p-3 text-right font-semibold text-emerald-700">{money(omzet)}</td><td className="p-3 text-right">{money(modal)}</td><td className="p-3 text-right text-blue-700">{money(laba)}</td><td className="p-3 text-right text-purple-700">{money(burden)}</td><td className="p-3 text-right font-bold text-amber-700">{money(net)}</td></tr>;
                })}
              </tbody></table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
