import { MetadataRoute } from 'next';
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'carCam - Parking Surveillance',
    short_name: 'carCam',
    description: 'carCam is the solution for parking surveillance',
    start_url: '/',
    display: 'standalone',
    background_color: '#1d232a', 
    theme_color: '#1d232a',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}