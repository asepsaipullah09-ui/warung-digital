'use client';

import { useEffect, useState } from 'react';

export default function TestSupabase() {
  const [status, setStatus] = useState('Mengecek koneksi...');
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    async function testConnection() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setStatus('❌ Supabase belum terkonfigurasi');
        return;
      }

      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/categories?select=*&limit=5`,
          {
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
          },
        );

        if (!response.ok) {
          const message = await response.text();
          console.error(message);
          setStatus(`❌ Gagal terhubung: ${message || response.statusText}`);
          return;
        }

        setData(await response.json());
        setStatus('✅ Supabase berhasil terhubung!');
      } catch (error) {
        console.error(error);
        setStatus('❌ Gagal terhubung: periksa jaringan atau konfigurasi Supabase.');
      }
    }

    testConnection();
  }, []);

  return (
    <main className="p-4 sm:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">
        Test Koneksi Supabase
      </h1>

      <p className="mb-4">{status}</p>

      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-xs sm:text-sm">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}