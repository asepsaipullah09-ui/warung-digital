import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WarungKu - Manajemen Warung',
    short_name: 'WarungKu',
    description: 'Aplikasi manajemen stok, kas, barang masuk, rekap malam, dan laba warung.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f5f8',
    theme_color: '#0f172a',
    orientation: 'portrait-primary',
    lang: 'id-ID',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
