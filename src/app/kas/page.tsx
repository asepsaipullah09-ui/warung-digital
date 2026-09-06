'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, Plus, RefreshCw, ArrowDownRight, ArrowUpRight, Settings2 } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDateIndo, getTodayDateString, formatRupiah } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

type CashSetting = { id: number; opening_balance: number };
type CashTransaction = { id: string; date: string; transaction_type: string; amount: number; note: string | null; created_at: string };

const labels: Record<string, string> = {
  OPENING: 'Saldo Awal',
  SALE: 'Penjualan',
  PURCHASE: 'Belanja Barang',
  PERSONAL_WITHDRAWAL: 'Pengambilan Pribadi',
  ADJUSTMENT: 'Koreksi Kas',
};

export default function KasPage() {
  const [setting, setSetting] = useState<CashSetting | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [adjustment, setAdjustment] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [date, setDate] = useState(getTodayDateString());

  const loadData = async () => {
    if (!supabase || !isSupabaseConfigured) { setLoading(false); return; }
    try {
      setLoading(true);
      const [{ data: settingData, error: settingError }, { data: txData, error: txError }] = await Promise.all([
        supabase.from('cash_settings').select('id,opening_balance').eq('id', 1).maybeSingle(),
        supabase.from('cash_transactions').select('id,date,transaction_type,amount,note,created_at').order('date', { ascending: false }).order('created_at', { ascending: false }),
      ]);
      if (settingError) throw settingError;
      if (txError) throw txError;
      const mappedSetting = settingData ? { id: 1, opening_balance: Number(settingData.opening_balance || 0) } : null;
      setSetting(mappedSetting);
      setOpeningBalance(mappedSetting ? String(mappedSetting.opening_balance) : '');
      setTransactions((txData || []).map((tx) => ({ ...tx, amount: Number(tx.amount || 0) })) as CashTransaction[]);
    } catch (error: any) {
      console.error(error);
      alert(`Gagal memuat kas: ${error?.message || 'Terjadi kesalahan.'}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const balance = useMemo(() => (setting?.opening_balance || 0) + transactions.reduce((sum, tx) => sum + tx.amount, 0), [setting, transactions]);
  const todayTransactions = useMemo(() => transactions.filter((tx) => tx.date === date), [transactions, date]);
  const todayIn = todayTransactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
  const todayOut = todayTransactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const saveOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !isSupabaseConfigured) return;
    const value = Number(openingBalance);
    if (!Number.isFinite(value) || value < 0) { alert('Saldo awal harus berupa angka 0 atau lebih.'); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from('cash_settings').upsert({ id: 1, opening_balance: Math.round(value) });
      if (error) throw error;
      alert('✅ Saldo awal kas berhasil disimpan.');
      await loadData();
    } catch (error: any) { alert(`Gagal menyimpan saldo awal: ${error?.message || 'Terjadi kesalahan.'}`); }
    finally { setSaving(false); }
  };

  const saveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !isSupabaseConfigured) return;
    const value = Number(adjustment);
    if (!Number.isFinite(value) || value === 0) { alert('Masukkan nominal koreksi. Gunakan angka positif untuk kas bertambah dan negatif untuk kas berkurang.'); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from('cash_transactions').insert({ date, transaction_type: 'ADJUSTMENT', amount: Math.round(value), note: adjustmentNote.trim() || 'Koreksi saldo kas' });
      if (error) throw error;
      setAdjustment(''); setAdjustmentNote('');
      alert('✅ Koreksi kas berhasil dicatat.');
      await loadData();
    } catch (error: any) { alert(`Gagal menyimpan koreksi kas: ${error?.message || 'Terjadi kesalahan.'}`); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-emerald-700" /></div>;
  if (!supabase || !isSupabaseConfigured) return <div className="p-6 bg-amber-50 rounded-2xl text-amber-800">Supabase belum terkonfigurasi.</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2"><Wallet className="w-6 h-6 text-emerald-700" /> Kas / Laci</h1><p className="text-sm text-gray-500 mt-1">Pantau saldo kas berdasarkan transaksi yang tercatat di aplikasi.</p></div>
        <button onClick={loadData} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white text-sm font-semibold"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Saldo Kas Saat Ini</CardTitle></CardHeader><div className="px-5 pb-5 text-2xl font-extrabold text-emerald-700">{formatRupiah(balance)}</div></Card>
        <Card><CardHeader><CardTitle>Kas Masuk Hari Ini</CardTitle></CardHeader><div className="px-5 pb-5 text-xl font-bold">{formatRupiah(todayIn)}</div></Card>
        <Card><CardHeader><CardTitle>Kas Keluar Hari Ini</CardTitle></CardHeader><div className="px-5 pb-5 text-xl font-bold">{formatRupiah(todayOut)}</div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle><Settings2 className="w-4 h-4 inline mr-2" />Saldo Awal Kas</CardTitle></CardHeader>
          <form onSubmit={saveOpening} className="p-5 space-y-3">
            <p className="text-xs text-gray-500">Masukkan saldo kas yang benar-benar tersedia saat mulai menggunakan aplikasi. Ini hanya diatur sebagai saldo awal, bukan omzet.</p>
            <input type="number" min="0" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-full rounded-xl border px-3 py-2.5" placeholder="Contoh: 500000" />
            <button disabled={saving} className="w-full py-2.5 rounded-xl bg-[#073b2a] text-white font-bold disabled:opacity-50">Simpan Saldo Awal</button>
          </form>
        </Card>
        <Card>
          <CardHeader><CardTitle><Plus className="w-4 h-4 inline mr-2" />Koreksi Kas</CardTitle></CardHeader>
          <form onSubmit={saveAdjustment} className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3"><label className="text-xs text-gray-500">Tanggal<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900" /></label><label className="text-xs text-gray-500">Nominal (+ / -)<input type="number" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm text-gray-900" placeholder="-10000" /></label></div>
            <input value={adjustmentNote} onChange={(e) => setAdjustmentNote(e.target.value)} className="w-full rounded-xl border px-3 py-2.5" placeholder="Alasan koreksi kas" />
            <button disabled={saving} className="w-full py-2.5 rounded-xl bg-gray-900 text-white font-bold disabled:opacity-50">Catat Koreksi</button>
          </form>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Riwayat Kas</CardTitle></CardHeader>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="p-4">Tanggal</th><th className="p-4">Jenis</th><th className="p-4">Keterangan</th><th className="p-4 text-right">Nominal</th></tr></thead><tbody>{transactions.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">Belum ada transaksi kas.</td></tr> : transactions.map((tx) => <tr key={tx.id} className="border-b last:border-0"><td className="p-4 whitespace-nowrap">{formatDateIndo(tx.date)}</td><td className="p-4"><span className="inline-flex items-center gap-1">{tx.amount >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}{labels[tx.transaction_type] || tx.transaction_type}</span></td><td className="p-4 text-gray-500">{tx.note || '-'}</td><td className={`p-4 text-right font-bold ${tx.amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{tx.amount >= 0 ? '+' : '-'}{formatRupiah(Math.abs(tx.amount))}</td></tr>)}</tbody></table></div>
      </Card>

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900"><strong>Catatan:</strong> saat ini Barang Masuk diasumsikan dibayar tunai dan hasil penjualan pada Rekap Malam diasumsikan masuk ke kas. Jika ada belanja tempo/non-tunai atau penjualan non-tunai, nanti perlu ditambahkan metode pembayaran.</div>
    </div>
  );
}
