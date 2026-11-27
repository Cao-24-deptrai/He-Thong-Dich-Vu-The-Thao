'use client';

import React from 'react';
import { ThermalReceiptProvider } from '@/components/pos/ThermalReceiptModal';
import PosShell from '@/components/pos/PosShell';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThermalReceiptProvider>
      <PosShell>{children}</PosShell>
    </ThermalReceiptProvider>
  );
}
