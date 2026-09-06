'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { History, ShoppingBag, Moon, UserCheck, RefreshCw, Calendar, Eye, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatDateIndo, formatRupiah } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

type ProductUnit = { id: string; product_id: string; unit_name: string; conversion_to_base: number; cost_price: number; selling_price: number; is_default: boolean };
type Product = { id: string; name: string; base_unit: string; product_units: ProductUnit[] };
type PurchaseItem = { id: string; product_id: string; product_unit_id: string | null; quantity: number; quantity_base: number; cost_price: number; subtotal: number; product_name?: string; unit_name?: string };
type Purchase = { id: string; date: string; total_cost: number; note: string | null; created_at: string; purchase_items: PurchaseItem[] };
type OpnameItem = { id: string; product_id: string; system_stock_base: number; physical_stock_base: number; difference_base: number; personal_use_base: number; calculated_sales_base: number; selling_amount: number; cost_amount: number; profit_amount: number; personal_use_cost_amount: number; net_profit_after_personal_use: number; product_name?: string };
type Opname = { id: string; date: string; status: string; total_personal_cash: number; total_sold_base: number; total_sales_amount: number; total_cost_amount: number; total_profit_amount: number; total_personal_use_cost: number; total_net_profit: number; created_at: string; daily_stock_opname_items: OpnameItem[] };
type Usage = { id: string; type: 'BARANG' | 'UANG_CASH'; product_id: string | null; product_unit_id: string | null; quantity: number; quantity_base: number | null; amount_cash: number; date: string; note: string | null; created_at: string; product_name?: string; unit_name?: string };
type Adjustment = { id: string; product_id: string; adjustment_type: string; quantity_base: number; reason: string; date: string; created_at: string; product_name?: string };
type Movement = { id: string; product_id: string; quantity_base: number; movement_type: string; reference_id: string | null; date: string; note: string | null; created_at: string; product_name?: string };

export default function RiwayatPage() {
  const [activeTab, setActiveTab] = useState<'MASUK' | 'REKAP' | 'PRIBADI' | 'KOREKSI'>('REKAP');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [opnames, setOpnames] = useState<Opname[]>([]);
  const [usages, setUsages] = useState<Usage[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [selectedOpname, setSelectedOpname] = useState<Opname | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    if (!supabase || !isSupabaseConfigured) { setErrorMessage('Supabase belum terkonfigurasi.'); setLoading(false); return; }
    setLoading(true); setErrorMessage('');
    try {
      const [productsRes, unitsRes, purchasesRes, opnamesRes, usagesRes, adjustmentsRes, movementsRes] = await Promise.all([
        supabase.from('products').select('id,name,base_unit'),
        supabase.from('product_units').select('id,product_id,unit_name,conversion_to_base,cost_price,selling_price,is_default'),
        supabase.from('purchases').select('id,date,total_cost,note,created_at,purchase_items(id,product_id,product_unit_id,quantity,quantity_base,cost_price,subtotal)').order('date',{ascending:false}).order('created_at',{ascending:false}),
        supabase.from('daily_stock_opnames').select('id,date,status,total_personal_cash,total_sold_base,total_sales_amount,total_cost_amount,total_profit_amount,total_personal_use_cost,total_net_profit,created_at,daily_stock_opname_items(id,product_id,system_stock_base,physical_stock_base,difference_base,personal_use_base,calculated_sales_base,selling_amount,cost_amount,profit_amount,personal_use_cost_amount,net_profit_after_personal_use)').order('date',{ascending:false}).order('created_at',{ascending:false}),
        supabase.from('personal_usages').select('id,type,product_id,product_unit_id,quantity,quantity_base,amount_cash,date,note,created_at').order('date',{ascending:false}).order('created_at',{ascending:false}),
        supabase.from('stock_adjustments').select('id,product_id,adjustment_type,quantity_base,reason,date,created_at').order('date',{ascending:false}).order('created_at',{ascending:false}),
        supabase.from('stock_movements').select('id,product_id,quantity_base,movement_type,reference_id,date,note,created_at').order('date',{ascending:false}).order('created_at',{ascending:false}),
      ]);
      const firstError = [productsRes,unitsRes,purchasesRes,opnamesRes,usagesRes,adjustmentsRes,movementsRes].find(r=>r.error)?.error;
      if (firstError) throw new Error(firstError.message);
      const products = (productsRes.data || []) as Product[];
      const units = (unitsRes.data || []) as ProductUnit[];
      const productMap = new Map(products.map(p=>[p.id,p]));
      const unitMap = new Map(units.map(u=>[u.id,u]));
      setPurchases(((purchasesRes.data || []) as Purchase[]).map(p=>({...p,purchase_items:(p.purchase_items||[]).map(it=>({...it,product_name:productMap.get(it.product_id)?.name||'Produk tidak ditemukan',unit_name:unitMap.get(it.product_unit_id||'')?.unit_name||productMap.get(it.product_id)?.base_unit||'-'}))})));
      setOpnames(((opnamesRes.data || []) as Opname[]).map(op=>({...op,daily_stock_opname_items:(op.daily_stock_opname_items||[]).map(it=>({...it,product_name:productMap.get(it.product_id)?.name||'Produk tidak ditemukan'}))})));
      setUsages(((usagesRes.data || []) as Usage[]).map(u=>({...u,product_name:u.product_id?productMap.get(u.product_id)?.name:undefined,unit_name:u.product_unit_id?unitMap.get(u.product_unit_id)?.unit_name:(u.product_id?productMap.get(u.product_id)?.base_unit:undefined)})));
      setAdjustments(((adjustmentsRes.data || []) as Adjustment[]).map(a=>({...a,product_name:productMap.get(a.product_id)?.name||'Produk tidak ditemukan'})));
      setMovements(((movementsRes.data || []) as Movement[]).map(m=>({...m,product_name:productMap.get(m.product_id)?.name||'Produk tidak ditemukan'})));
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Gagal mengambil riwayat.'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ loadData(); },[]);

  const counts = useMemo(()=>({
    masuk:purchases.length, rekap:opnames.length, pribadi:usages.length, koreksi:adjustments.length
  }),[purchases,opnames,usages,adjustments]);

  const formatMovementType = (type:string) => ({PURCHASE:'Barang Masuk',PERSONAL_USE:'Pemakaian Pribadi',SALE:'Penjualan',ADJUSTMENT:'Koreksi Stok'}[type] || type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><History className="w-6 h-6 text-emerald-600" />Riwayat & Audit Log Transaksi</h1><p className="text-sm text-gray-500">Seluruh aktivitas diambil langsung dari Supabase.</p></div>
        <button onClick={loadData} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} />Refresh</button>
      </div>
      {errorMessage && <Card className="p-4 border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold">Gagal memuat riwayat: {errorMessage}</Card>}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1">
        {([['REKAP','Rekap Malam',Moon,counts.rekap],['MASUK','Barang Masuk',ShoppingBag,counts.masuk],['PRIBADI','Pemakaian Pribadi',UserCheck,counts.pribadi],['KOREKSI','Koreksi Stok',RefreshCw,counts.koreksi]] as const).map(([tab,label,Icon,count])=><button key={tab} onClick={()=>setActiveTab(tab)} className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 whitespace-nowrap ${activeTab===tab?'border-emerald-600 text-emerald-700':'border-transparent text-gray-500 hover:text-gray-900'}`}><Icon className="w-4 h-4" />{label} ({count})</button>)}
      </div>

      {activeTab==='REKAP' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{opnames.length===0?<Card className="col-span-full text-center py-12 text-gray-400">Belum ada riwayat rekap malam.</Card>:opnames.map(op=><Card key={op.id} className="hover:border-emerald-200"><div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3"><div><h3 className="font-bold text-base text-gray-900">{formatDateIndo(op.date)}</h3><span className="text-xs text-gray-400">{op.daily_stock_opname_items.length} jenis produk direkap</span></div><Badge variant="emerald">{op.status}</Badge></div><div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center bg-gray-50 p-2.5 rounded-xl mb-3"><div><span className="text-[10px] text-gray-400 block uppercase">Omzet</span><span className="font-bold text-emerald-700 text-sm">{formatRupiah(Number(op.total_sales_amount||0))}</span></div><div><span className="text-[10px] text-gray-400 block uppercase">Modal</span><span className="font-semibold text-gray-700 text-sm">{formatRupiah(Number(op.total_cost_amount||0))}</span></div><div><span className="text-[10px] text-gray-400 block uppercase">Laba</span><span className="font-extrabold text-blue-700 text-sm">{formatRupiah(Number(op.total_profit_amount||0))}</span></div><div><span className="text-[10px] text-gray-400 block uppercase">Beban Pribadi</span><span className="font-extrabold text-purple-700 text-sm">{formatRupiah(Number(op.total_personal_use_cost||0))}</span></div></div><button onClick={()=>setSelectedOpname(op)} className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5" />Lihat Detail Per Produk</button></Card>)}</div>}

      {activeTab==='MASUK' && <div className="space-y-3">{purchases.length===0?<Card className="text-center py-12 text-gray-400">Belum ada riwayat barang masuk.</Card>:purchases.map(p=><Card key={p.id} className="p-4"><div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2"><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-600" /><span className="font-bold text-sm text-gray-900">{formatDateIndo(p.date)}</span></div><span className="font-extrabold text-emerald-800 text-base">{formatRupiah(Number(p.total_cost||0))}</span></div>{p.note&&<p className="text-xs text-gray-500 italic mb-2">"{p.note}"</p>}<div className="space-y-1">{p.purchase_items.map(it=><div key={it.id} className="flex justify-between gap-3 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg"><span className="font-semibold">{it.product_name}</span><span>{it.quantity} {it.unit_name} (@ {formatRupiah(Number(it.cost_price||0))}) = <strong>{formatRupiah(Number(it.subtotal||0))}</strong></span></div>)}</div></Card>)}</div>}

      {activeTab==='PRIBADI' && <div className="space-y-3">{usages.length===0?<Card className="text-center py-12 text-gray-400">Belum ada pemakaian pribadi.</Card>:usages.map(u=><Card key={u.id} className="p-4 flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><h4 className="font-bold text-sm text-gray-900">{u.type==='UANG_CASH'?<><Wallet className="w-4 h-4 inline text-amber-600" /> Pengambilan Uang Pribadi</>:u.product_name}</h4></div>{u.type==='UANG_CASH'?<p className="text-xs text-amber-700 font-bold mt-0.5">Jumlah: {formatRupiah(Number(u.amount_cash||0))}</p>:<p className="text-xs text-purple-700 font-semibold mt-0.5">Jumlah: {u.quantity} {u.unit_name} ({u.quantity_base||0} base unit)</p>}{u.note&&<p className="text-xs text-gray-500 italic mt-0.5">"{u.note}"</p>}</div><span className="text-xs text-gray-400 whitespace-nowrap">{formatDateIndo(u.date)}</span></Card>)}</div>}

      {activeTab==='KOREKSI' && <div className="space-y-3">{adjustments.length===0?<Card className="text-center py-12 text-gray-400">Belum ada riwayat koreksi stok.</Card>:adjustments.map(a=><Card key={a.id} className="p-4 flex items-center justify-between gap-4"><div><h4 className="font-bold text-sm text-gray-900">{a.product_name}</h4><p className="text-xs text-amber-700 font-semibold mt-0.5">Koreksi ({a.adjustment_type}): {a.quantity_base} unit base</p><p className="text-xs text-gray-500 italic">Alasan: "{a.reason}"</p></div><span className="text-xs text-gray-400">{formatDateIndo(a.date)}</span></Card>)}</div>}

      <Card className="p-4"><div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-gray-500" /><h3 className="font-bold text-sm">Aktivitas Stok</h3></div><div className="space-y-2 max-h-72 overflow-y-auto">{movements.length===0?<p className="text-sm text-gray-400">Belum ada aktivitas stok.</p>:movements.slice(0,50).map(m=><div key={m.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-gray-50 text-xs"><div><p className="font-bold text-gray-800">{m.product_name}</p><p className="text-gray-500">{formatMovementType(m.movement_type)} · {m.quantity_base>0?'+':''}{m.quantity_base} base unit{m.note?` · ${m.note}`:''}</p></div><span className="text-gray-400 whitespace-nowrap">{formatDateIndo(m.date)}</span></div>)}</div></Card>

      <Modal isOpen={Boolean(selectedOpname)} onClose={()=>setSelectedOpname(null)} title={`Detail Rekap Malam: ${selectedOpname?formatDateIndo(selectedOpname.date):''}`} maxWidth="2xl">{selectedOpname&&<div className="space-y-4"><div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center bg-gray-50 p-3 rounded-xl"><div><span className="text-xs text-gray-400 block uppercase">Omzet</span><span className="font-extrabold text-emerald-700">{formatRupiah(Number(selectedOpname.total_sales_amount||0))}</span></div><div><span className="text-xs text-gray-400 block uppercase">Modal</span><span className="font-bold text-gray-700">{formatRupiah(Number(selectedOpname.total_cost_amount||0))}</span></div><div><span className="text-xs text-gray-400 block uppercase">Laba Penjualan</span><span className="font-extrabold text-blue-700">{formatRupiah(Number(selectedOpname.total_profit_amount||0))}</span></div><div><span className="text-xs text-gray-400 block uppercase">Beban Pribadi</span><span className="font-extrabold text-purple-700">{formatRupiah(Number(selectedOpname.total_personal_use_cost||0))}</span></div><div><span className="text-xs text-gray-400 block uppercase">Laba Setelah Pakai</span><span className="font-extrabold text-indigo-700">{formatRupiah(Number(selectedOpname.total_net_profit||0))}</span></div></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-gray-100 text-gray-600 font-bold uppercase"><tr><th className="p-2.5">Produk</th><th className="p-2.5">Sistem</th><th className="p-2.5">Fisik</th><th className="p-2.5">Pakai Sendiri</th><th className="p-2.5">Terjual</th><th className="p-2.5 text-right">Omzet</th><th className="p-2.5 text-right">Laba</th></tr></thead><tbody className="divide-y divide-gray-100">{selectedOpname.daily_stock_opname_items.map(it=><tr key={it.id}><td className="p-2.5 font-bold text-gray-900">{it.product_name}</td><td className="p-2.5 text-gray-500">{it.system_stock_base}</td><td className="p-2.5 font-bold text-gray-900">{it.physical_stock_base}</td><td className="p-2.5 text-purple-700">{it.personal_use_base}</td><td className="p-2.5 font-bold text-emerald-800">{it.calculated_sales_base}</td><td className="p-2.5 text-right font-semibold">{formatRupiah(Number(it.selling_amount||0))}</td><td className="p-2.5 text-right font-bold text-blue-700">{formatRupiah(Number(it.profit_amount||0))}</td></tr>)}</tbody></table></div></div>}</Modal>
    </div>
  );
}
