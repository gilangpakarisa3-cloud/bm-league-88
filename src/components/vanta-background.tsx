'use client';

import dynamic from 'next/dynamic';

const VantaBackgroundInner = dynamic(
  () => import('./vanta-background-inner').then((mod) => mod.VantaBackgroundInner),
  { ssr: false }
);

export function VantaBackground() {
  return <VantaBackgroundInner />;
}
