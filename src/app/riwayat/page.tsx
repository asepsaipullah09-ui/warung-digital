'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { History, ShoppingBag, Moon, UserCheck, RefreshCw, Calendar, Eye, Wallet, TrendingUp, Package, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatDateIndo, formatRupiah } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

type Product = { id: string; name: string; base_unit: string };
type Unit = { id: string; product_id: string; unit_name: string; conversion_to_base: number; cost_price: number; selling_price: number };
type PurchaseItem = { id: string; purchase_id: string; product_id: string; product_unit_id: string | null; quantity: number; quantity_base: number; cost_price: number; subtotal: number };
type Purchase = { id: string; date: string; total_cost: number; note: string | null; created_at: string; items: PurchaseItem[] };
type OpnameItem = { id: string; stock_opname_id: string; product_id: string; system_stock_base: number; physical_stock_base: number; difference_base: number; personal_use_base: number; calculated_sales_base: number; selling_amount: number; cost_amount: number; profit_amount: number; personal_use_cost_amount: number; net_profit_after_personal_use: number };
type Opname = { id: string; date: string; status: string; total_personal_cash: number; total_sold_base: number; total_sales_amount: number; total_cost_amount: number; total_profit_amount: number; total_personal_use_cost: number; total_net_profit: number; created_at: string; items: OpnameItem[] };
type Usage = { id: string; type: 'BARANG' | 'UANG_CASH'; product_id: string | null; product_unit_id: string | null; quantity: number; quantity_base: number | null; amount_cash: number; date: string; note: string | null; created_at: string };
type Adjustment = { id: string; product_id: string; adjustment_type: string; quantity_base: number; reason: string; date: string; created_at: string };

export default function RiwayatPage() {
  const [activeTab, setActiveTab] = useState<'REKAP' | 'MASUK' | 'PRIBADI' | 'KOREKSI'>('REKAP');
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [opnames, setOpnames] = useState<Opname[]>([]);
  const [usages, setUsages] = useState<Usage[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [selectedOpname, setSelectedOpname] = useState<Opname | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);

  const loadData = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage('Supabase belum terkonfigurasi.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Jangan memakai nested relation Supabase di sini. Data detail diambil
      // terpisah agar Riwayat tetap stabil walaupun nama relasi berubah.
      const [productsRes, unitsRes, purchasesRes, purchaseItemsRes, opnamesRes, opnameItemsRes, usagesRes, adjustmentsRes] = await Promise.all([
        supabase.from('products').select('id,name,base_unit'),
        supabase.from('product_units').select('id,product_id,unit_name,conversion_to_base,cost_price,selling_price'),
        supabase.from('purchases').select('id,date,total_cost,note,created_at').order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('purchase_items').select('id,purchase_id,product_id,product_unit_id,quantity,quantity_base,cost_price,subtotal'),
        supabase.from('daily_stock_opnames').select('id,date,status,total_personal_cash,total_sold_base,total_sales_amount,total_cost_amount,total_profit_amount,total_personal_use_cost,total_net_profit,created_at').order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('daily_stock_opname_items').select('id,stock_opname_id,product_id,system_stock_base,physical_stock_base,difference_base,personal_use_base,calculated_sales_base,selling_amount,cost_amount,profit_amount,personal_use_cost_amount,net_profit_after_personal_use'),
        supabase.from('personal_usages').select('id,type,product_id,product_unit_id,quantity,quantity_base,amount_cash,date,note,created_at').order('date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('stock_adjustments').select('id,product_id,adjustment_type,quantity_base,reason,date,created_at').order('date', { ascending: false }).order('created_at', { ascending: false }),
      ]);

      const errors = [productsRes, unitsRes, purchasesRes, purchaseItemsRes, opnamesRes, opnameItemsRes, usagesRes, adjustmentsRes];
      const firstError = errors.find(r => r.error)?.error;
      if (firstError) throw new Error(firstError.message);

      const productRows = (productsRes.data || []) as Product[];
      const unitRows = (unitsRes.data || []) as Unit[];
      const purchaseRows = (purchasesRes.data || []) as Omit<Purchase, 'items'>[];
      const purchaseItemRows = (purchaseItemsRes.data || []) as PurchaseItem[];
      const opnameRows = (opnamesRes.data || []) as Omit<Opname, 'items'>[];
      const opnameItemRows = (opnameItemsRes.data || []) as OpnameItem[];

      setProducts(productRows);
      setUnits(unitRows);
      setPurchases(purchaseRows.map(p => ({ ...p, items: purchaseItemRows.filter(i => i.purchase_id === p.id) })));
      setOpnames(opnameRows.map(o => ({ ...o, items: opnameItemRows.filter(i => i.stock_opname_id === o.id) })));
      setUsages((usagesRes.data || []) as Usage[]);
      setAdjustments((adjustmentsRes.data || []) as Adjustment[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal mengambil riwayat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const formatStock = (productId: string, base: number) => {
    const product = productMap.get(productId);
    const productUnits = units.filter(u => u.product_id === productId).sort((a, b) => b.conversion_to_base - a.conversion_to_base);
    if (!product || productUnits.length === 0) return `${base} ${product?.base_unit || 'unit'}`;

    let remaining = Math.max(0, Math.floor(base));
    const parts: string[] = [];
    for (const unit of productUnits) {
      if (unit.conversion_to_base <= 1) continue;
      const qty = Math.floor(remaining / unit.conversion_to_base);
      if (qty > 0) {
        parts.push(`${qty} ${unit.unit_name}`);
        remaining %= unit.conversion_to_base;
      }
    }
    if (remaining > 0 || parts.length === 0) parts.push(`${remaining} ${product.base_unit}`);
    return parts.join(' + ');
  };

  const counts = { rekap: opnames.length, masuk: purchases.length, pribadi: usages.length, koreksi: adjustments.length };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><History className="w-6 h-6 text-emerald-600" />Riwayat Transaksi</h1>
          <p className="text-sm text-gray-500">Riwayat utama tersimpan dari Supabase tanpa menampilkan aktivitas stok sebagai transaksi ganda.</p>
        </div>
        <button onClick={loadData} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </div>

      {errorMessage && <Card className="p-4 border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold">Gagal memuat riwayat: {errorMessage}</Card>}

      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1">
        {([
          ['REKAP', 'Rekap Malam', Moon, counts.rekap],
          ['MASUK', 'Barang Masuk', ShoppingBag, counts.masuk],
          ['PRIBADI', 'Pemakaian Pribadi', UserCheck, counts.pribadi],
          ['KOREKSI', 'Koreksi Stok', Wrench, counts.koreksi],
        ] as const).map(([tab, label, Icon, count]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            <Icon className="w-4 h-4" />{label} ({count})
          </button>
        ))}
      </div>

      {activeTab === 'REKAP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opnames.length === 0 ? <Card className="col-span-full text-center py-12 text-gray-400">Belum ada riwayat rekap malam.</Card> : opnames.map(op => {
            const sales = op.items.reduce((s, i) => s + Number(i.selling_amount || 0), 0);
            const cost = op.items.reduce((s, i) => s + Number(i.cost_amount || 0), 0);
            const profit = op.items.reduce((s, i) => s + Number(i.profit_amount || 0), 0);
            const burden = op.items.reduce((s, i) => s + Number(i.personal_use_cost_amount || 0), 0);
            const net = op.items.reduce((s, i) => s + Number(i.net_profit_after_personal_use || 0), 0);
            return (
              <Card key={op.id} className="hover:border-emerald-200">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                  <div><h3 className="font-bold text-base text-gray-900">{formatDateIndo(op.date)}</h3><span className="text-xs text-gray-400">{op.items.length} jenis produk</span></div>
                  <Badge variant="emerald">{op.status}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center bg-gray-50 p-2.5 rounded-xl mb-3">
                  <div><span className="text-[10px] text-gray-400 block uppercase">Omzet</span><span className="font-bold text-emerald-700 text-sm">{formatRupiah(sales)}</span></div>
                  <div><span className="text-[10px] text-gray-400 block uppercase">Modal</span><span className="font-semibold text-gray-700 text-sm">{formatRupiah(cost)}</span></div>
                  <div><span className="text-[10px] text-gray-400 block uppercase">Laba</span><span className="font-extrabold text-blue-700 text-sm">{formatRupiah(profit)}</span></div>
                  <div><span className="text-[10px] text-gray-400 block uppercase">Beban Pribadi</span><span className="font-extrabold text-purple-700 text-sm">{formatRupiah(burden)}</span></div>
                </div>
                <div className="flex items-center justify-between text-xs mb-3"><span className="text-gray-500">Laba setelah pemakaian</span><strong className="text-purple-700">{formatRupiah(net)}</strong></div>
                <button onClick={() => setSelectedOpname(op)} className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5" />Lihat Detail Per Produk</button>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === 'MASUK' && (
        <div className="space-y-3">
          {purchases.length === 0 ? <Card className="text-center py-12 text-gray-400">Belum ada riwayat barang masuk.</Card> : purchases.map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2"><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-600" /><span className="font-bold text-sm">{formatDateIndo(p.date)}</span></div><span className="font-extrabold text-emerald-800">{formatRupiah(Number(p.total_cost || 0))}</span></div>
              {p.note && <p className="text-xs text-gray-500 italic mb-2">"{p.note}"</p>}
              <div className="space-y-1">{p.items.map(item => <div key={item.id} className="flex justify-between gap-3 text-xs bg-gray-50 p-2 rounded-lg"><span className="font-semibold text-gray-700">{productMap.get(item.product_id)?.name || 'Produk tidak ditemukan'}</span><span className="text-gray-600">{item.quantity} {unitMap.get(item.product_unit_id || '')?.unit_name || productMap.get(item.product_id)?.base_unit || '-'} · {formatRupiah(Number(item.cost_price || 0))} · <strong>{formatRupiah(Number(item.subtotal || 0))}</strong></span></div>)}</div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'PRIBADI' && (
        <div className="space-y-3">
          {usages.length === 0 ? <Card className="text-center py-12 text-gray-400">Belum ada pemakaian pribadi.</Card> : usages.map(u => {
            const isCash = u.type === 'UANG_CASH';
            return <Card key={u.id} className="p-4 flex items-center justify-between gap-4"><div><h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">{isCash ? <><Wallet className="w-4 h-4 text-amber-600" /> Pengambilan Uang Pribadi</> : <><Package className="w-4 h-4 text-purple-600" /> {productMap.get(u.product_id || '')?.name || 'Produk tidak ditemukan'}</>}</h4>{isCash ? <p className="text-xs text-amber-700 font-bold mt-1">Kas diambil: {formatRupiah(Number(u.amount_cash || 0))}</p> : <p className="text-xs text-purple-700 font-semibold mt-1">Dipakai: {u.quantity} {unitMap.get(u.product_unit_id || '')?.unit_name || productMap.get(u.product_id || '')?.base_unit || '-'} ({Number(u.quantity_base || 0)} base unit) · Beban modal dihitung di rekap</p>}{u.note && <p className="text-xs text-gray-500 italic mt-1">"{u.note}"</p>}</div><span className="text-xs text-gray-400 whitespace-nowrap">{formatDateIndo(u.date)}</span></Card>;
          })}
        </div>
      )}

      {activeTab === 'KOREKSI' && (
        <div className="space-y-3">
          {adjustments.length === 0 ? <Card className="text-center py-12 text-gray-400">Belum ada riwayat koreksi stok.</Card> : adjustments.map(a => <Card key={a.id} className="p-4 flex items-center justify-between gap-4"><div><h4 className="font-bold text-sm text-gray-900 flex items-center gap-2"><Wrench className="w-4 h-4 text-amber-600" />{productMap.get(a.product_id)?.name || 'Produk tidak ditemukan'}</h4><p className="text-xs text-amber-700 font-semibold mt-1">{a.adjustment_type === 'INCREASE' ? 'Stok bertambah' : 'Stok berkurang'}: {Math.abs(Number(a.quantity_base || 0))} {productMap.get(a.product_id)?.base_unit || 'unit'}</p><p className="text-xs text-gray-500 italic mt-1">Alasan: "{a.reason}"</p></div><span className="text-xs text-gray-400 whitespace-nowrap">{formatDateIndo(a.date)}</span></Card>)}
        </div>
      )}

      <Modal isOpen={Boolean(selectedOpname)} onClose={() => setSelectedOpname(null)} title={`Detail Rekap Malam: ${selectedOpname ? formatDateIndo(selectedOpname.date) : ''}`} maxWidth="2xl">
        {selectedOpname && (() => {
          const sales = selectedOpname.items.reduce((s, i) => s + Number(i.selling_amount || 0), 0);
          const cost = selectedOpname.items.reduce((s, i) => s + Number(i.cost_amount || 0), 0);
          const profit = selectedOpname.items.reduce((s, i) => s + Number(i.profit_amount || 0), 0);
          const burden = selectedOpname.items.reduce((s, i) => s + Number(i.personal_use_cost_amount || 0), 0);
          const net = selectedOpname.items.reduce((s, i) => s + Number(i.net_profit_after_personal_use || 0), 0);
          return <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2"><Stat icon={<TrendingUp className="w-4 h-4" />} label="Omzet" value={formatRupiah(sales)} /><Stat icon={<Package className="w-4 h-4" />} label="Terjual" value={`${selectedOpname.items.reduce((s,i)=>s+Number(i.calculated_sales_base||0),0)} base`} /><Stat icon={<ShoppingBag className="w-4 h-4" />} label="Modal" value={formatRupiah(cost)} /><Stat icon={<TrendingUp className="w-4 h-4" />} label="Laba" value={formatRupiah(profit)} /><Stat icon={<UserCheck className="w-4 h-4" />} label="Beban Pribadi" value={formatRupiah(burden)} /></div>
            <div className="rounded-xl bg-purple-50 p-3 text-sm flex justify-between"><span className="font-semibold text-purple-800">Laba Setelah Pemakaian</span><strong className="text-purple-800">{formatRupiah(net)}</strong></div>
            <div className="border rounded-xl overflow-hidden"><div className="grid grid-cols-6 bg-gray-50 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase"><span>Produk</span><span>Stok Sistem</span><span>Fisik</span><span>Terjual</span><span>Pribadi</span><span>Laba</span></div>{selectedOpname.items.map(item => <div key={item.id} className="grid grid-cols-6 px-3 py-2 border-t text-xs items-center"><span className="font-semibold">{productMap.get(item.product_id)?.name || 'Produk tidak ditemukan'}</span><span>{formatStock(item.product_id, Number(item.system_stock_base))}</span><span>{formatStock(item.product_id, Number(item.physical_stock_base))}</span><span>{formatStock(item.product_id, Number(item.calculated_sales_base))}</span><span>{formatStock(item.product_id, Number(item.personal_use_base))}</span><span className="font-bold text-blue-700">{formatRupiah(Number(item.profit_amount || 0))}</span></div>)}</div>
            {Number(selectedOpname.total_personal_cash || 0) > 0 && <div className="rounded-xl bg-amber-50 p-3 text-sm flex justify-between"><span className="font-semibold text-amber-800">Pengambilan Kas Pribadi</span><strong className="text-amber-800">{formatRupiah(Number(selectedOpname.total_personal_cash))}</strong></div>}
          </div>;
        })()}
      </Modal>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl bg-gray-50 p-2 text-center"><div className="flex justify-center text-gray-500 mb-1">{icon}</div><span className="block text-[10px] uppercase text-gray-400">{label}</span><strong className="text-xs text-gray-800">{value}</strong></div>;
}
