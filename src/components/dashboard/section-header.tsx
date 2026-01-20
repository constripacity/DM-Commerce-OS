"use client";

import Link from "next/link";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  cta?: { href: string; label: string };
  actions?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, cta, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-300">{eyebrow}</p>
        <h1 className="text-3xl font-semibold leading-tight text-white">{title}</h1>
        <p className="max-w-3xl text-sm text-slate-200">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {cta ? (
          <Button asChild variant="secondary" className="rounded-full border border-white/40 bg-white/90 text-slate-900 hover:bg-white">
            <Link href={cta.href as any}>{cta.label}</Link>
          </Button>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
