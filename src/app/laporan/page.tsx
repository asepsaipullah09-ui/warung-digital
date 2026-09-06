'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  UserCheck,
  Award,
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
import { formatRupiah, formatDateIndo, getTodayDateString, formatShortDateIndo } from '@/lib/utils';
import { warungStore } from '@/lib/store/warungStore';
import { DailyStockOpname, Purchase, PersonalUsage, Product } from '@/types';

export default function LaporanPage() {
  const [filterType, setFilterType] = useState<'TODAY' | '7DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('7DAYS');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState(getTodayDateString());

  const [opnames, setOpnames] = useState<DailyStockOpname[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [usages, setUsages] = useState<PersonalUsage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadData = () => {
    warungStore.initializeDefaultDataIfEmpty();
    setOpnames(warungStore.getDailyOpnames());
    setPurchases(warungStore.getPurchases());
    setUsages(warungStore.getPersonalUsages());
    setProducts(warungStore.getProducts());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute effective date range based on filterType
  const getFilterDateRange = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (filterType === 'TODAY') {
      start = today;
      end = today;
    } else if (filterType === '7DAYS') {
      start.setDate(today.getDate() - 6);
      end = today;
    } else if (filterType === 'THIS_MONTH') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = today;
    } else if (filterType === 'LAST_MONTH') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (filterType === 'CUSTOM') {
      start = new Date(startDate);
      end = new Date(endDate);
    }

    const formatISO = (d: Date) => d.toISOString().split('T')[0];
    return { startStr: formatISO(start), endStr: formatISO(end) };
  };

  const { startStr, endStr } = getFilterDateRange();

  // Filter datasets
  const filteredOpnames = opnames.filter((o) => o.date >= startStr && o.date <= endStr);
  const filteredPurchases = purchases.filter((p) => p.date >= startStr && p.date <= endStr);
  const filteredUsages = usages.filter((u) => u.date >= startStr && u.date <= endStr);

  // Aggregated KPIs
  const totalOmzet = filteredOpnames.reduce((acc, curr) => acc + (curr.total_omzet || 0), 0);
  const totalModal = filteredOpnames.reduce((acc, curr) => acc + (curr.total_modal || 0), 0);
  const totalLaba = filteredOpnames.reduce((acc, curr) => acc + (curr.total_laba || 0), 0);
  const totalTerjualBase = filteredOpnames.reduce((acc, curr) => acc + (curr.total_terjual_base || 0), 0);
  const totalBarangMasukCost = filteredPurchases.reduce((acc, curr) => acc + curr.total_cost, 0);
  const totalPemakaianPribadiCount = filteredUsages.reduce((acc, curr) => acc + (curr.quantity_base || 0), 0);

  // Daily Trend Chart Data
  const dailyChartDataMap = new Map();
  filteredOpnames.forEach((op) => {
    dailyChartDataMap.set(op.date, {
      date: op.date,
      date_formatted: formatShortDateIndo(op.date),
      omzet: op.total_omzet || 0,
      laba: op.total_laba || 0,
      terjual: op.total_terjual_base || 0,
    });
  });
  const chartData = Array.from(dailyChartDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // CSV Export Handler
  const exportToCSV = () => {
    if (filteredOpnames.length === 0) {
      alert('Tidak ada data rekap malam pada rentang tanggal ini.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Tanggal,Total Terjual (Item),Total Omzet (Rp),Total Modal (Rp),Total Laba (Rp)\n';

    filteredOpnames.forEach((op) => {
      csvContent += `"${op.date}",${op.total_terjual_base || 0},${op.total_omzet || 0},${op.total_modal || 0},${op.total_laba || 0}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Warung_${startStr}_sd_${endStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Range Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Laporan Keuangan & Analisis Laba
          </h1>
          <p className="text-sm text-gray-500">
            Analisis performa omzet, laba bersih, barang masuk, dan pemakaian pribadi.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          Export Ke Excel / CSV
        </button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
            <button
              onClick={() => setFilterType('TODAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                filterType === 'TODAY' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setFilterType('7DAYS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                filterType === '7DAYS' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => setFilterType('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                filterType === 'THIS_MONTH' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setFilterType('LAST_MONTH')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                filterType === 'LAST_MONTH' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => setFilterType('CUSTOM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                filterType === 'CUSTOM' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Kustom Tanggal
            </button>
          </div>

          {filterType === 'CUSTOM' && (
            <div className="flex items-center gap-2 text-xs w-full md:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
              />
              <span>s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-emerald-50/40 border-emerald-100">
          <span className="text-[11px] font-semibold uppercase text-emerald-800 block">Total Omzet</span>
          <span className="text-lg md:text-xl font-bold text-emerald-900">{formatRupiah(totalOmzet)}</span>
        </Card>

        <Card className="bg-blue-50/40 border-blue-100">
          <span className="text-[11px] font-semibold uppercase text-blue-800 block">Total Laba</span>
          <span className="text-lg md:text-xl font-bold text-blue-900">{formatRupiah(totalLaba)}</span>
        </Card>

        <Card>
          <span className="text-[11px] font-semibold uppercase text-gray-500 block">Modal Terjual</span>
          <span className="text-lg md:text-xl font-bold text-gray-900">{formatRupiah(totalModal)}</span>
        </Card>

        <Card>
          <span className="text-[11px] font-semibold uppercase text-gray-500 block">Barang Terjual</span>
          <span className="text-lg md:text-xl font-bold text-indigo-900">{totalTerjualBase} item</span>
        </Card>

        <Card>
          <span className="text-[11px] font-semibold uppercase text-gray-500 block">Total Belanja</span>
          <span className="text-lg md:text-xl font-bold text-amber-900">{formatRupiah(totalBarangMasukCost)}</span>
        </Card>

        <Card>
          <span className="text-[11px] font-semibold uppercase text-gray-500 block">Pakai Sendiri</span>
          <span className="text-lg md:text-xl font-bold text-purple-900">{totalPemakaianPribadiCount} item</span>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              Grafik Omzet & Laba Per Hari
            </CardTitle>
          </CardHeader>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date_formatted" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `Rp${val / 1000}k`} />
                <Tooltip formatter={(value: any) => [formatRupiah(Number(value) || 0), '']} />
                <Area type="monotone" dataKey="omzet" name="Omzet" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="laba" name="Laba Bersih" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              Barang Terjual Per Hari
            </CardTitle>
          </CardHeader>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date_formatted" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="terjual" name="Barang Terjual (Item)" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
