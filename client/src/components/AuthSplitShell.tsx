// admin/src/components/AuthSplitShell.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface AuthSplitShellProps {
  badge: string;
  heroTitle: string;
  heroDescription: string;
  heroFooter?: string;
  heroImageUrl?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthSplitShell({
  badge,
  heroTitle,
  heroDescription,
  heroFooter = 'Bóng đá - Cầu lông - Pickleball - Tennis - Bóng rổ - Cyber Arena',
  heroImageUrl = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80',
  title,
  subtitle,
  children,
}: AuthSplitShellProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0C0F0C] text-[#171C1A] dark:text-[#F3F4F6] flex font-sans">
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#121512] flex-col justify-between p-12 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url('${heroImageUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0F0C] via-[#0C0F0C]/60 to-transparent" />

        <div className="relative z-10">
          <span className="font-heading font-bold text-xs uppercase tracking-widest text-[#00B562] dark:text-[#9CFF93]">
            {badge}
          </span>
        </div>

        <div className="relative z-10 space-y-4 max-w-md">
          <h2 className="text-3xl sm:text-4xl font-heading font-black uppercase text-white leading-tight tracking-tight">
            {heroTitle}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">{heroDescription}</p>
          <div className="pt-2 text-xs text-slate-400 font-medium">{heroFooter}</div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-7 my-auto">
          <div className="space-y-4 text-center sm:text-left">
            <Link href="/home" className="inline-block">
              <Image
                src="/PHANTA.png"
                alt="Phanta Sports Logo"
                width={150}
                height={50}
                className="h-10 w-auto object-contain mx-auto sm:mx-0 dark:brightness-110"
                priority
              />
            </Link>

            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#171C1A] dark:text-white uppercase tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-[#3B4540] dark:text-[#D1D5DB] mt-1">
                {subtitle}
              </p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
