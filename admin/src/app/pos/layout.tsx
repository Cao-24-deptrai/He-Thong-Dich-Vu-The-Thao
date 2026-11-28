'use client';

import React from 'react';
import { ThermalReceiptProvider } from '@/components/pos/ThermalReceiptModal';
import PosShell from '@/components/pos/PosShell';
import { PosThemeProvider } from '@/lib/pos-theme';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PosThemeProvider>
      <ThermalReceiptProvider>
        <PosShell>{children}</PosShell>
      </ThermalReceiptProvider>
    </PosThemeProvider>
  );
}
