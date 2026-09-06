'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Boxes,
  UserCheck,
  AlertTriangle,
  ArrowUpRight,
  Moon,
  CheckCircle2,
  ChevronRight,
  Award,
  Plus,
  Clock,
  PieChart as PieIcon,
  Play,
  Pause,
  RotateCcw,
  Wallet,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatRupiah, formatMultiUnitStock } from '@/lib/utils';
import { warungStore } from '@/lib/store/warungStore';
import { DashboardStats } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const loadData = () => {
    warungStore.initializeDefaultDataIfEmpty();
    setStats(warungStore.getDashboardStats());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Quick stopwatch timer for counting stock during opname
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => setTimerSeconds((prev) => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#073b2a]"></div>
      </div>
    );
  }

  // Calculate Stock Safety Donut chart data
  const safeStockCount = Math.max(0, 10 - stats.low_stock_products.length);
  const lowStockCount = stats.low_stock_products.length;
  const pieData = [
    { name: 'Stok Aman', value: safeStockCount, color: '#073b2a' },
    { name: 'Stok Menipis', value: lowStockCount, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Title & Page Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">
            Pantau stok, rekap malam, omzet, dan laba harian warung Anda dengan mudah.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/rekap-malam"
            className="px-4 py-2.5 bg-[#073b2a] hover:bg-[#0d684a] text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            + Mulai Rekap Malam
          </Link>
          <Link
            href="/barang-masuk"
            className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs transition-all shadow-2xs"
          >
            + Barang Masuk
          </Link>
        </div>
      </div>

      {/* Warning Banner if Rekap Malam Pending */}
      {!stats.is_rekap_completed_today && (
        <div className="bg-[#073b2a] text-white rounded-2xl p-4 md:p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-emerald-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 fill-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base">Rekap Malam Belum Selesai Hari Ini</h3>
              <p className="text-emerald-100/80 text-xs">
                Masukkan sisa fisik barang di warung malam ini untuk menghitung Omzet & Laba otomatis.
              </p>
            </div>
          </div>
          <Link
            href="/rekap-malam"
            className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-[#073b2a] font-extrabold rounded-xl text-xs shadow-sm shrink-0 transition-colors"
          >
            Mulai Rekap Now →
          </Link>
        </div>
      )}

      {/* Top Metric Cards Grid - Fully Responsive & Overflow Protected */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Card 1: Featured Primary Dark Green Card */}
        <div className="bg-gradient-to-br from-[#073b2a] to-[#0d684a] text-white rounded-2xl p-4 md:p-5 shadow-md flex flex-col justify-between relative overflow-hidden group min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider truncate">Omzet Hari Ini</span>
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="my-2.5 min-w-0">
            <div className="text-lg xl:text-2xl font-extrabold tracking-tight truncate" title={formatRupiah(stats.today_omzet)}>
              {formatRupiah(stats.today_omzet)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-200/90 font-medium min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="truncate">{stats.is_rekap_completed_today ? 'Hasil Rekap Final' : 'Belum Rekap Malam'}</span>
          </div>
        </div>

        {/* Card 2: Laba Bersih */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200/70 shadow-2xs flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">Laba Bersih</span>
            <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="my-2.5 min-w-0">
            <div className="text-lg xl:text-2xl font-extrabold text-gray-900 tracking-tight truncate" title={formatRupiah(stats.today_laba)}>
              {formatRupiah(stats.today_laba)}
            </div>
          </div>
          <div className="text-[11px] text-gray-400 font-medium truncate">
            Omzet - Modal Terjual
          </div>
        </div>

        {/* Card 3: Total Terjual */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200/70 shadow-2xs flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">Barang Terjual</span>
            <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="my-2.5 min-w-0">
            <div className="text-lg xl:text-2xl font-extrabold text-gray-900 tracking-tight truncate">
              {stats.today_terjual_items} <span className="text-xs font-normal text-gray-500">item</span>
            </div>
          </div>
          <div className="text-[11px] text-gray-400 font-medium truncate">
            Stok Keluar Bersih
          </div>
        </div>

        {/* Card 4: Nilai Stok */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-200/70 shadow-2xs flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">Nilai Stok</span>
            <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="my-2.5 min-w-0">
            <div className="text-lg xl:text-2xl font-extrabold text-gray-900 tracking-tight truncate" title={formatRupiah(stats.total_stock_value)}>
              {formatRupiah(stats.total_stock_value)}
            </div>
          </div>
          <div className="text-[11px] text-gray-400 font-medium truncate">
            Total Modal di Rak
          </div>
        </div>

        {/* Card 5: Pemakaian Pribadi & Uang Laci */}
        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-4 md:p-5 border border-purple-100 shadow-2xs flex flex-col justify-between group min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider truncate">Kas / Barang</span>
            <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2 min-w-0">
            <div className="text-base xl:text-lg font-extrabold text-purple-950 truncate">
              {stats.today_personal_use_count} <span className="text-xs font-normal text-gray-500">item</span>
            </div>
            {stats.today_personal_use_cash > 0 && (
              <div className="text-xs font-bold text-emerald-800 mt-0.5 truncate">
                + {formatRupiah(stats.today_personal_use_cash)} Cash
              </div>
            )}
          </div>
          <div className="text-[11px] text-gray-400 font-medium truncate">
            Pemakaian Sendiri
          </div>
        </div>
      </div>

      {/* Middle Section: Chart + Reminders + Donut Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Omzet 7-Day Chart (7 Cols) */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>
              <TrendingUp className="w-4 h-4 text-[#073b2a]" />
              Grafik Trend Omzet & Laba (7 Hari)
            </CardTitle>
          </CardHeader>
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chart_7_days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOmzetRef" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#073b2a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#073b2a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLabaRef" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date_formatted" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `Rp${val / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [formatRupiah(Number(value) || 0), '']}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                />
                <Area type="monotone" dataKey="omzet" name="Omzet" stroke="#073b2a" fillOpacity={1} fill="url(#colorOmzetRef)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="laba" name="Laba Bersih" stroke="#10b981" fillOpacity={1} fill="url(#colorLabaRef)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right: Reminders & Stock Gauge Progress */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Reminders</span>
              <h4 className="font-extrabold text-sm text-gray-900 leading-snug">
                Hitung Fisik Stok Malam Ini
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Waktu terbaik rekap: 20:00 - 22:00 saat warung mau tutup.
              </p>
            </div>
            <Link
              href="/rekap-malam"
              className="mt-4 w-full py-2 bg-[#073b2a] hover:bg-[#0d684a] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
              Mulai Rekap
            </Link>
          </Card>

          <Card className="flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Kesehatan Stok</span>
            <div className="h-28 w-28 relative my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center font-extrabold text-sm text-gray-900">
                {stats.low_stock_products.length === 0 ? '100%' : `${Math.round((safeStockCount / 10) * 100)}%`}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#073b2a]"></span> Aman
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Menipis ({lowStockCount})
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Top Products & Quick Stopwatch Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>
              <Award className="w-4 h-4 text-amber-500" />
              Produk Paling Banyak Terjual
            </CardTitle>
            <Link href="/laporan" className="text-xs text-emerald-700 font-bold hover:underline">
              Lihat Laporan Lengkap →
            </Link>
          </CardHeader>

          <div className="space-y-2.5">
            {stats.top_selling_products.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">Belum ada data rekap malam.</p>
            ) : (
              stats.top_selling_products.map((item, idx) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#073b2a] text-emerald-400 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs md:text-sm text-gray-900 truncate">{item.product_name}</h4>
                      <p className="text-[11px] text-gray-500 truncate">
                        {item.total_sales_base} {item.base_unit} terjual
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-xs md:text-sm text-emerald-800">
                      {formatRupiah(item.total_omzet)}
                    </span>
                    <span className="text-[10px] text-gray-400 block">Omzet Produk</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Stopwatch Timer */}
        <div className="lg:col-span-4">
          <div className="bg-[#051f16] text-white p-5 rounded-2xl shadow-lg border border-emerald-950 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Timer Rekap Malam
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Hitung Stok
                </span>
              </div>
              <p className="text-xs text-emerald-200/70 mb-4">
                Nyalakan timer saat Anda mulai menghitung fisik sisa barang di warung.
              </p>
            </div>

            <div className="my-2 text-center">
              <div className="text-3xl md:text-4xl font-extrabold font-mono tracking-widest text-emerald-300">
                {formatTimer(timerSeconds)}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4 border-t border-emerald-900/50">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
                  isTimerRunning ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-[#073b2a]'
                }`}
              >
                {isTimerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(0);
                }}
                className="w-10 h-10 rounded-full bg-emerald-900/60 hover:bg-emerald-900 text-emerald-300 flex items-center justify-center transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
