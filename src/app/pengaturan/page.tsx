'use client';

import React, { useState } from 'react';
import { Settings, Database, Code, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export default function PengaturanPage() {
  const [copied, setCopied] = useState(false);

  const sqlSchema = `-- Referensi skema database Supabase.
-- Schema lengkap dan terbaru ada di: supabase/schema.sql

-- Pastikan migration/schema.sql dijalankan di Supabase SQL Editor.
`;

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlSchema);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-600" />
          Pengaturan & Database
        </h1>
        <p className="text-sm text-gray-500">
          Pengaturan koneksi dan informasi database Warung Digital.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Database className="w-5 h-5 text-emerald-600" />
            Status Koneksi Supabase
          </CardTitle>
          <Badge variant={isSupabaseConfigured ? 'emerald' : 'amber'}>
            {isSupabaseConfigured ? 'Terhubung Supabase' : 'Supabase Belum Dikonfigurasi'}
          </Badge>
        </CardHeader>

        <div className="space-y-3 text-xs text-gray-600">
          <p>
            Warung Digital menggunakan Supabase PostgreSQL sebagai sumber data utama. Data transaksi, stok, produk, dan laporan tidak lagi bergantung pada localStorage.
          </p>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono text-[11px] space-y-1">
            <div className="text-gray-400 font-semibold">Environment variable:</div>
            <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
            <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key</div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Code className="w-5 h-5 text-indigo-600" />
            Schema Database
          </CardTitle>
          <button
            onClick={copySql}
            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs"
          >
            {copied ? '✅ Tersalin!' : 'Copy Referensi'}
          </button>
        </CardHeader>
        <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px]">
          <pre>{sqlSchema}</pre>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Gunakan file <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">supabase/schema.sql</code> sebagai sumber schema lengkap dan terbaru.
        </p>
      </Card>

      <Card className="border-emerald-100 bg-emerald-50/30">
        <CardHeader>
          <CardTitle>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Status Arsitektur Data
          </CardTitle>
        </CardHeader>
        <div className="space-y-2 text-sm text-gray-700">
          <p>✅ Supabase menjadi sumber data utama.</p>
          <p>✅ Sinkronisasi data antar perangkat menggunakan database yang sama.</p>
          <p>✅ Tidak ada tombol reset localStorage yang dapat membuat data perangkat berbeda.</p>
          <p>ℹ️ Backup, reset, dan pengaturan operasional akan dibuat sebagai fitur database yang aman pada tahap berikutnya.</p>
        </div>
      </Card>
    </div>
  );
}
