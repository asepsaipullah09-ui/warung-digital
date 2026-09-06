'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Moon, Search, CheckCircle2, AlertTriangle, Save, Calendar, RotateCcw, Plus, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { formatRupiah, formatDateIndo, getTodayDateString } from '@/lib/utils';
import { calculateOpnameOutput } from '@/lib/calculations';

type Category = { id: string; name: string };
type ProductUnit = { id: string; product_id: string; unit_name: string; conversion_to_base: number; cost_price: number; selling_price: number; is_default: boolean };
type Product = { id: string; category_id: string | null; name: string; image_url: string | null; base_unit: string; minimum_stock: number; is_active: boolean; units: ProductUnit[]; current_stock_base: number };
type PersonalUsage = { id: string; type: 'BARANG' | 'UANG_CASH'; product_id: string | null; product_unit_id: string | null; quantity: number | null; quantity_base: number | null; amount_cash: number | null; date: string; note: string | null };
type Calculation = { systemStockBase: number; physicalStockBase: number; differenceBase: number; personalUseBase: number; calculatedSalesBase: number; sellingAmount: number; costAmount: number; profitAmount: number; personalUseCostAmount: number; netProfitAfterPersonalUse: number; isPhysicalHigherThanSystem: boolean; warningMessage?: string };

export default function RekapMalamPage() {
  const [date, setDate] = useState(getTodayDateString());
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [personalUsages, setPersonalUsages] = useState<PersonalUsage[]>([]);
  const [physicalInputs, setPhysicalInputs] = useState<Record<string, number | ''>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingOpname, setExistingOpname] = useState<any>(null);
  const [correctionProduct, setCorrectionProduct] = useState<Product | null>(null);
  const [correctionQty, setCorrectionQty] = useState(1);
  const [correctionReason, setCorrectionReason] = useState('Ditemukan stok fisik lebih banyak di toko');
  const [savingCorrection, setSavingCorrection] = useState(false);

  const loadData = async () => {
    if (!supabase || !isSupabaseConfigured) { alert('Supabase belum terkonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.'); setLoading(false); return; }
    try {
      setLoading(true);
      const { data: categoryData, error: categoryError } = await supabase.from('categories').select('id, name').order('name');
      if (categoryError) throw new Error(`Gagal mengambil kategori: ${categoryError.message}`);
      const { data: productData, error: productError } = await supabase.from('products').select('id,category_id,name,image_url,base_unit,minimum_stock,is_active').eq('is_active', true).order('name');
      if (productError) throw new Error(`Gagal mengambil produk: ${productError.message}`);
      const productIds = (productData || []).map((p) => p.id);
      let unitData: ProductUnit[] = [];
      if (productIds.length > 0) {
        const { data, error } = await supabase.from('product_units').select('id,product_id,unit_name,conversion_to_base,cost_price,selling_price,is_default').in('product_id', productIds).order('conversion_to_base');
        if (error) throw new Error(`Gagal mengambil satuan produk: ${error.message}`);
        unitData = (data || []) as ProductUnit[];
      }
      let movementData: any[] = [];
      if (productIds.length > 0) {
        const { data, error } = await supabase.from('stock_movements').select('id,product_id,quantity_base,movement_type,date,created_at').in('product_id', productIds).lte('date', date);
        if (error) throw new Error(`Gagal mengambil stok: ${error.message}`);
        movementData = data || [];
      }
      const stockMap: Record<string, number> = {};
      productIds.forEach((id) => { stockMap[id] = 0; });
      movementData.forEach((movement) => {
        if (!movement.product_id) return;
        if (movement.movement_type === 'SALE' && movement.date === date) return;
        stockMap[movement.product_id] = (stockMap[movement.product_id] || 0) + Number(movement.quantity_base || 0);
      });
      const { data: usageData, error: usageError } = await supabase.from('personal_usages').select('id,type,product_id,product_unit_id,quantity,quantity_base,amount_cash,date,note').eq('date', date);
      if (usageError) throw new Error(`Gagal mengambil pemakaian pribadi: ${usageError.message}`);
      const { data: opnameData, error: opnameError } = await supabase.from('daily_stock_opnames').select('*').eq('date', date).maybeSingle();
      if (opnameError) throw new Error(`Gagal mengambil rekap malam: ${opnameError.message}`);
      const finalProducts: Product[] = (productData || []).map((product) => ({ ...product, minimum_stock: Number(product.minimum_stock || 0), units: unitData.filter((unit) => unit.product_id === product.id), current_stock_base: Math.max(0, Math.round(stockMap[product.id] || 0)) }));
      setCategories((categoryData || []) as Category[]); setProducts(finalProducts); setPersonalUsages((usageData || []) as PersonalUsage[]); setExistingOpname(opnameData || null);
      const inputs: Record<string, number | ''> = {};
      if (opnameData) {
        const { data: opnameItems, error: itemError } = await supabase.from('daily_stock_opname_items').select('product_id,physical_stock_base').eq('stock_opname_id', opnameData.id);
        if (itemError) throw new Error(`Gagal mengambil detail rekap: ${itemError.message}`);
        const itemMap = new Map((opnameItems || []).map((item) => [item.product_id, Number(item.physical_stock_base || 0)]));
        finalProducts.forEach((product) => { inputs[product.id] = itemMap.has(product.id) ? itemMap.get(product.id)! : product.current_stock_base; });
      } else finalProducts.forEach((product) => { inputs[product.id] = product.current_stock_base; });
      setPhysicalInputs(inputs);
    } catch (error: any) { console.error(error); alert(error?.message || 'Terjadi kesalahan saat mengambil data dari Supabase.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [date]);

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return products.filter((product) => (!keyword || product.name.toLowerCase().includes(keyword)) && (selectedCategory === 'ALL' || product.category_id === selectedCategory));
  }, [products, searchQuery, selectedCategory]);

  const getPersonalUseForProduct = (productId: string) => personalUsages.filter((usage) => usage.type === 'BARANG' && usage.product_id === productId).reduce((total, usage) => total + Number(usage.quantity_base || 0), 0);

  const calculations = useMemo(() => {
    const map: Record<string, Calculation> = {};
    products.forEach((product) => {
      const input = physicalInputs[product.id];
      const physicalStock = typeof input === 'number' ? input : product.current_stock_base;
      map[product.id] = calculateOpnameOutput(product as any, product.current_stock_base, physicalStock, getPersonalUseForProduct(product.id));
    });
    return map;
  }, [products, physicalInputs, personalUsages]);

  const summary = useMemo(() => {
    let omzet = 0, modal = 0, laba = 0, terjual = 0, personalUse = 0, warning = false;
    products.forEach((product) => {
      const calc = calculations[product.id]; if (!calc) return;
      omzet += calc.sellingAmount; modal += calc.costAmount; laba += calc.profitAmount; terjual += calc.calculatedSalesBase; personalUse += calc.personalUseBase;
      if (calc.isPhysicalHigherThanSystem) warning = true;
    });
    return { omzet, modal, laba, terjual, personalUse, warning };
  }, [products, calculations]);

  const handleInputChange = (productId: string, value: string) => {
    if (value === '') { setPhysicalInputs((prev) => ({ ...prev, [productId]: '' })); return; }
    const parsed = Number(value);
    setPhysicalInputs((prev) => ({ ...prev, [productId]: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0 }));
  };
  const fillAllSystemStock = () => { const inputs: Record<string, number> = {}; products.forEach((product) => { inputs[product.id] = product.current_stock_base; }); setPhysicalInputs(inputs); };
  const fillZero = (productId: string) => setPhysicalInputs((prev) => ({ ...prev, [productId]: 0 }));

  const handleSaveOpname = async () => {
    if (!supabase || !isSupabaseConfigured) { alert('Supabase belum terkonfigurasi.'); return; }
    if (products.length === 0) { alert('Belum ada produk yang aktif.'); return; }
    if (existingOpname) { alert(`Rekap tanggal ${formatDateIndo(date)} sudah pernah disimpan.\n\nGunakan tanggal lain untuk membuat rekap baru.`); return; }

    // Stok fisik yang lebih besar berarti ada selisih yang belum dijelaskan.
    // Jangan finalisasi rekap karena selisih tersebut bukan penjualan.
    if (summary.warning) {
      alert('Rekap tidak dapat disimpan karena ada stok fisik yang lebih besar daripada stok sistem.\n\nSilakan lakukan Koreksi Stok terlebih dahulu, lalu ulangi Rekap Malam.');
      return;
    }

    try {
      setSaving(true);
      const totalPersonalCash = personalUsages.filter((usage) => usage.type === 'UANG_CASH').reduce((total, usage) => total + Number(usage.amount_cash || 0), 0);
      const totalPersonalUseCost = products.reduce((total, product) => total + (calculations[product.id]?.personalUseCostAmount || 0), 0);
      const totalNetProfit = summary.laba - totalPersonalUseCost;
      const { data: opname, error: opnameError } = await supabase.from('daily_stock_opnames').insert({ date, status: 'COMPLETED', total_personal_cash: totalPersonalCash, total_sold_base: summary.terjual, total_sales_amount: summary.omzet, total_cost_amount: summary.modal, total_profit_amount: summary.laba, total_personal_use_cost: totalPersonalUseCost, total_net_profit: totalNetProfit }).select().single();
      if (opnameError || !opname) throw new Error(`Gagal menyimpan header rekap: ${opnameError?.message || 'Data rekap tidak ditemukan.'}`);
      const opnameItems = products.map((product) => { const calc = calculations[product.id]; return { stock_opname_id: opname.id, product_id: product.id, system_stock_base: calc.systemStockBase, physical_stock_base: calc.physicalStockBase, difference_base: calc.differenceBase, personal_use_base: calc.personalUseBase, calculated_sales_base: calc.calculatedSalesBase, selling_amount: calc.sellingAmount, cost_amount: calc.costAmount, profit_amount: calc.profitAmount, personal_use_cost_amount: calc.personalUseCostAmount, net_profit_after_personal_use: calc.netProfitAfterPersonalUse }; });
      const { error: itemsError } = await supabase.from('daily_stock_opname_items').insert(opnameItems);
      if (itemsError) { await supabase.from('daily_stock_opnames').delete().eq('id', opname.id); throw new Error(`Gagal menyimpan detail rekap: ${itemsError.message}`); }
      const salesMovements = products.filter((product) => (calculations[product.id]?.calculatedSalesBase || 0) > 0).map((product) => { const calc = calculations[product.id]; return { product_id: product.id, quantity_base: -Math.abs(calc.calculatedSalesBase), movement_type: 'SALE', reference_id: opname.id, date, note: `Hasil Rekap Malam - Terjual ${calc.calculatedSalesBase} ${product.base_unit}` }; });
      if (salesMovements.length > 0) {
        const { error: movementError } = await supabase.from('stock_movements').insert(salesMovements);
        if (movementError) { await supabase.from('daily_stock_opname_items').delete().eq('stock_opname_id', opname.id); await supabase.from('daily_stock_opnames').delete().eq('id', opname.id); throw new Error(`Gagal mencatat stok penjualan: ${movementError.message}`); }
      }
      alert(`✅ Rekap malam berhasil disimpan!\n\nTerjual: ${summary.terjual} unit dasar\nOmzet: ${formatRupiah(summary.omzet)}\nModal: ${formatRupiah(summary.modal)}\nLaba Penjualan: ${formatRupiah(summary.laba)}\nBeban Pemakaian: ${formatRupiah(totalPersonalUseCost)}\nLaba Setelah Pemakaian: ${formatRupiah(totalNetProfit)}`);
      await loadData();
    } catch (error: any) { console.error('Gagal menyimpan rekap malam:', error); alert(error?.message || 'Terjadi kesalahan saat menyimpan rekap malam.'); }
    finally { setSaving(false); }
  };

  const openCorrection = (product: Product) => { const calc = calculations[product.id]; const difference = Math.max(1, calc.physicalStockBase - calc.systemStockBase); setCorrectionProduct(product); setCorrectionQty(difference); setCorrectionReason('Ditemukan stok fisik lebih banyak di toko'); };
  const handleSaveCorrection = async () => {
    if (!supabase || !correctionProduct) return;
    if (correctionQty <= 0) { alert('Jumlah koreksi harus lebih dari 0.'); return; }
    try {
      setSavingCorrection(true);
      const { error } = await supabase.from('stock_adjustments').insert({ product_id: correctionProduct.id, adjustment_type: 'INCREASE', quantity_base: Math.floor(correctionQty), reason: correctionReason.trim() || 'Koreksi stok' });
      if (error) throw new Error(error.message);
      const { error: movementError } = await supabase.from('stock_movements').insert({ product_id: correctionProduct.id, quantity_base: Math.floor(correctionQty), movement_type: 'ADJUSTMENT', date, note: correctionReason.trim() || 'Koreksi stok' });
      if (movementError) { await supabase.from('stock_adjustments').delete().eq('product_id', correctionProduct.id).eq('quantity_base', Math.floor(correctionQty)).eq('reason', correctionReason.trim() || 'Koreksi stok'); throw new Error(movementError.message); }
      alert('Koreksi stok berhasil disimpan.'); setCorrectionProduct(null); await loadData();
    } catch (error: any) { console.error(error); alert(error?.message || 'Gagal menyimpan koreksi stok.'); }
    finally { setSavingCorrection(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-center"><Moon className="w-10 h-10 mx-auto text-emerald-700 animate-pulse" /><p className="text-sm text-gray-500 mt-3">Memuat data rekap...</p></div></div>;
  if (!supabase || !isSupabaseConfigured) return null;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2"><Moon className="w-6 h-6 text-emerald-700" /> Rekap Malam</h1><p className="text-sm text-gray-500 mt-1">Cocokkan stok sistem dengan stok fisik untuk menghitung penjualan.</p></div><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" /></div></div>
      {existingOpname && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 flex items-center gap-3"><CheckCircle2 className="w-5 h-5" /><div><b>Rekap sudah difinalkan</b><p className="text-sm">Tanggal ini sudah memiliki rekap. Data bersifat final dan tidak dapat disimpan ulang.</p></div></div>}
      {summary.warning && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 flex items-start gap-3"><AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" /><div><b>Stok fisik lebih besar dari stok sistem</b><p className="text-sm mt-1">Rekap harus dihentikan sementara. Buka Koreksi Stok pada produk yang bermasalah, simpan koreksi, lalu lakukan rekap kembali.</p></div></div>}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3"><div className="rounded-2xl bg-white border p-4"><p className="text-xs text-gray-500">Omzet</p><b className="text-xl">{formatRupiah(summary.omzet)}</b></div><div className="rounded-2xl bg-white border p-4"><p className="text-xs text-gray-500">Modal</p><b className="text-xl">{formatRupiah(summary.modal)}</b></div><div className="rounded-2xl bg-white border p-4"><p className="text-xs text-gray-500">Laba Penjualan</p><b className="text-xl">{formatRupiah(summary.laba)}</b></div><div className="rounded-2xl bg-white border p-4"><p className="text-xs text-gray-500">Terjual</p><b className="text-xl">{summary.terjual} unit dasar</b></div><div className="rounded-2xl bg-white border p-4"><p className="text-xs text-gray-500">Pemakaian</p><b className="text-xl">{summary.personalUse} unit dasar</b></div></div>
      <div className="bg-white border rounded-2xl p-4 flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari produk..." className="w-full border rounded-xl pl-9 pr-3 py-2.5 text-sm" /></div><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm"><option value="ALL">Semua kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={fillAllSystemStock} className="border rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> Samakan Sistem</button></div>
      <div className="bg-white border rounded-2xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-3">Produk</th><th className="text-right p-3">Stok Sistem</th><th className="text-right p-3">Stok Fisik</th><th className="text-right p-3">Terjual</th><th className="text-right p-3">Pemakaian</th><th className="text-right p-3">Status</th></tr></thead><tbody>{filteredProducts.map((product) => { const calc = calculations[product.id]; const physical = typeof physicalInputs[product.id] === 'number' ? physicalInputs[product.id] as number : product.current_stock_base; return <tr key={product.id} className="border-t"><td className="p-3 font-semibold">{product.name}<div className="text-[11px] text-gray-400">Base: {product.base_unit}</div></td><td className="p-3 text-right">{product.current_stock_base}</td><td className="p-3 text-right"><input type="number" min="0" step="1" value={physical} onChange={(e) => handleInputChange(product.id, e.target.value)} disabled={Boolean(existingOpname)} className="w-24 border rounded-lg px-2 py-1.5 text-right" /></td><td className="p-3 text-right font-bold">{calc.calculatedSalesBase}</td><td className="p-3 text-right">{calc.personalUseBase}</td><td className="p-3 text-right">{calc.isPhysicalHigherThanSystem ? <button onClick={() => openCorrection(product)} disabled={Boolean(existingOpname)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold"><Plus className="w-3 h-3" /> Koreksi</button> : <span className="text-emerald-700 text-xs font-bold">OK</span>}</td></tr>; })}</tbody></table></div></div>
      <div className="flex justify-end"><button onClick={handleSaveOpname} disabled={saving || Boolean(existingOpname) || summary.warning} className="px-5 py-3 rounded-xl bg-[#073b2a] text-white font-bold disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : existingOpname ? 'Sudah Difinalkan' : summary.warning ? 'Koreksi Stok Dahulu' : 'Simpan Rekap Malam'}</button></div>
      {correctionProduct && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="font-extrabold text-lg">Koreksi Stok</h2><button onClick={() => setCorrectionProduct(null)}><X className="w-5 h-5" /></button></div><p className="text-sm text-gray-500 mt-1">{correctionProduct.name}</p><label className="block text-sm font-semibold mt-4">Jumlah koreksi (unit dasar)</label><input type="number" min="1" value={correctionQty} onChange={(e) => setCorrectionQty(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 mt-1" /><label className="block text-sm font-semibold mt-4">Alasan</label><textarea value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} className="w-full border rounded-xl px-3 py-2 mt-1 min-h-24" /><button onClick={handleSaveCorrection} disabled={savingCorrection} className="w-full mt-4 bg-[#073b2a] text-white rounded-xl py-3 font-bold disabled:opacity-50">{savingCorrection ? 'Menyimpan...' : 'Simpan Koreksi'}</button></div></div>}
    </div>
  );
}
