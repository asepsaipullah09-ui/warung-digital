'use client';

import React, { useState } from 'react';
import { Settings, Database, RefreshCw, CheckCircle, Code, ShieldCheck, HardDrive } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { warungStore } from '@/lib/store/warungStore';

export default function PengaturanPage() {
  const [copied, setCopied] = useState(false);

  const handleResetData = () => {
    if (confirm('⚠️ Apakah Anda yakin ingin mereset seluruh data warung kembali ke data awal demo?')) {
      warungStore.resetToDefaults();
      alert('✅ Data warung berhasil direset!');
      window.location.reload();
    }
  };

  const sqlSchema = `-- Copy & Paste skrip ini ke Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), category_id UUID REFERENCES categories(id), name VARCHAR(255) NOT NULL, base_unit VARCHAR(50) NOT NULL, minimum_stock INT DEFAULT 5, is_active BOOLEAN DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS product_units (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES products(id) ON DELETE CASCADE, unit_name VARCHAR(50) NOT NULL, conversion_to_base INT DEFAULT 1, cost_price DECIMAL(12,2) DEFAULT 0, selling_price DECIMAL(12,2) DEFAULT 0, is_default BOOLEAN DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS purchases (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE DEFAULT CURRENT_DATE, total_cost DECIMAL(14,2) DEFAULT 0, note TEXT);
CREATE TABLE IF NOT EXISTS personal_usages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES products(id), quantity_base INT NOT NULL, date DATE DEFAULT CURRENT_DATE, note TEXT);
CREATE TABLE IF NOT EXISTS daily_stock_opnames (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), date DATE UNIQUE NOT NULL, status VARCHAR(20) DEFAULT 'COMPLETED');
CREATE TABLE IF NOT EXISTS daily_stock_opname_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), stock_opname_id UUID REFERENCES daily_stock_opnames(id) ON DELETE CASCADE, product_id UUID REFERENCES products(id), system_stock_base INT, physical_stock_base INT, difference_base INT, personal_use_base INT, calculated_sales_base INT, selling_amount DECIMAL(14,2), cost_amount DECIMAL(14,2), profit_amount DECIMAL(14,2));
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />
          Pengaturan & Integrasi Database
        </h1>
        <p className="text-sm text-gray-500">
          Kelola koneksi Supabase PostgreSQL, cadangan data lokal, dan reset aplikasi.
        </p>
      </div>

      {/* Supabase Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Database className="w-5 h-5 text-emerald-600" />
            Status Koneksi Supabase Backend
          </CardTitle>
          <Badge variant={isSupabaseConfigured ? 'emerald' : 'amber'}>
            {isSupabaseConfigured ? 'Terhubung Supabase' : 'Offline / Local Storage Mode'}
          </Badge>
        </CardHeader>

        <div className="space-y-3 text-xs text-gray-600">
          <p>
            Semua data disimpan di **Supabase PostgreSQL** agar saat dibuka dari HP, tablet, dan laptop data tetap sama dan tersinkronisasi.
          </p>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono text-[11px] space-y-1">
            <div className="text-gray-400 font-semibold">Konfigurasi .env.local:</div>
            <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
            <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key</div>
          </div>
        </div>
      </Card>

      {/* SQL Schema Script Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Code className="w-5 h-5 text-indigo-600" />
            Skema Database SQL (Supabase Migration)
          </CardTitle>
          <button
            onClick={copySql}
            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs"
          >
            {copied ? '✅ Tersalin!' : 'Copy SQL'}
          </button>
        </CardHeader>
        <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto">
          <pre>{sqlSchema}</pre>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          File SQL lengkap berada di: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">supabase/schema.sql</code>
        </p>
      </Card>

      {/* Data Maintenance & Reset */}
      <Card className="border-rose-100 bg-rose-50/20">
        <CardHeader>
          <CardTitle className="text-rose-900">
            <RefreshCw className="w-5 h-5 text-rose-600" />
            Reset Data Demo
          </CardTitle>
        </CardHeader>
        <p className="text-xs text-gray-600 mb-4">
          Kembalikan seluruh produk, kategori, dan transaksi sampel warung ke kondisi awal.
        </p>
        <button
          onClick={handleResetData}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
        >
          Reset Seluruh Data Ke Default Demo
        </button>
      </Card>
    </div>
  );
}
