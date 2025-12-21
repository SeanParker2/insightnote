import { Suspense } from 'react';
import ButterflyMapClient from './ButterflyMapClient';

export default function ButterflyMapPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black" />}>
      <ButterflyMapClient />
    </Suspense>
  );
}
