"use client";

import Link from "next/link";
import { ArrowRight, Bot, BarChart3, FileText, Workflow } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Workflow,
    title: "DM Studio",
    description: "Script conversational flows and watch the state machine guide the next best reply.",
  },
  {
    icon: FileText,
    title: "Products & Orders",
    description: "Prototype offers, fake checkouts, and instant file delivery without touching prod data.",
  },
  {
    icon: Bot,
    title: "Campaigns & Scripts",
    description: "Keyword-triggered automations with exportable calendars and shareable DM copy.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track funnel performance from initial DM through to fulfillment in one glance.",
  },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#08153a] to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute -top-20 left-8 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-20 top-36 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden />
      <div className="mx-auto w-full max-w-6xl space-y-16 px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900/75 via-slate-900/50 to-slate-950/70 px-6 py-14 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:px-10 sm:py-16"
        >
          <div className="relative z-10 max-w-3xl space-y-6">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
              DM Commerce OS
            </span>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              A local DM-to-checkout simulator for digital offers.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Map posts → DMs → scripts → orders → files — all on your machine. Spin up the sandbox, explore flows, and stress-test campaigns without live customers.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2 bg-white text-slate-900 hover:bg-slate-100">
                <Link href="/login">
                  Enter the dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
              >
                <Link href={"https://github.com/constripacity/DM-Commerce-OS/blob/main/docs/BEGINNER-GUIDE.md" as any} target="_blank" rel="noreferrer">
                  How to run locally
                </Link>
              </Button>
            </div>
          </div>
          <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-l from-blue-400/10 to-transparent lg:block" aria-hidden />
        </motion.section>

        <section className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            <h2 className="text-2xl font-semibold text-white">Why teams install the sandbox</h2>
            <p className="max-w-2xl text-slate-300">
              DM Commerce OS keeps the onboarding surface tight so you can test messages, campaigns, and fulfillment before touching production systems.
            </p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                >
                  <Card className="h-full border-white/10 bg-slate-900/60 backdrop-blur">
                    <CardHeader className="flex flex-row items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-slate-100">
                        <Icon className="h-5 w-5" />
                      </span>
                      <CardTitle className="text-lg font-semibold text-slate-100">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-slate-300">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
