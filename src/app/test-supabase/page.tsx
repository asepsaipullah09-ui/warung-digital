'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestSupabase() {
  const [status, setStatus] = useState('Mengecek koneksi...');
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    async function testConnection() {
      if (!supabase) {
        setStatus('❌ Supabase belum terkonfigurasi');
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .limit(5);

      if (error) {
        console.error(error);
        setStatus(`❌ Gagal terhubung: ${error.message}`);
        return;
      }

      setData(data);
      setStatus('✅ Supabase berhasil terhubung!');
    }

    testConnection();
  }, []);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Test Koneksi Supabase
      </h1>

      <p className="mb-4">{status}</p>

      <pre className="bg-gray-100 p-4 rounded-lg">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}