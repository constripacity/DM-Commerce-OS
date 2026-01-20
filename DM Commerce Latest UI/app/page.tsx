'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageSquare, Package, TrendingUp, BarChart3, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: MessageSquare,
    title: 'DM Studio',
    description: 'Interactive DM simulator with keyword triggers, qualification flows, and checkout sequences.',
  },
  {
    icon: Package,
    title: 'Products & Orders',
    description: 'Manage digital products, track orders, and simulate file delivery workflows.',
  },
  {
    icon: TrendingUp,
    title: 'Campaigns & Scripts',
    description: 'Create campaigns with auto-responses using dynamic templates and variables.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track funnel performance from impressions to delivery with visual dashboards.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <motion.main
        className="flex-1 flex items-center justify-center px-4 py-12 md:py-24"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="max-w-6xl w-full">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Local-first commerce simulator
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              DM Commerce OS
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              A local DM-to-checkout simulator for digital offers. Explore posts, DMs, scripts, orders, and file delivery — all on your machine.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="gap-2 text-base px-8 rounded-2xl shadow-soft">
                  Enter the dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/docs/BEGINNER-GUIDE.md">
                <Button variant="outline" size="lg" className="gap-2 text-base px-8 rounded-2xl">
                  View Setup Guide
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="rounded-2xl bg-white/90 border border-orange-50 shadow-soft p-8 hover:shadow-lg transition-shadow"
              >
                <div className="rounded-xl bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.main>

      <footer className="py-6 px-4 border-t">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>DM Commerce OS • Built with Next.js, TypeScript, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}
