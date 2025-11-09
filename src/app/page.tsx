import Link from "next/link";
import { ArrowRight, Bot, ChartLine, FileText, Workflow } from "lucide-react";
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
    icon: ChartLine,
    title: "Analytics",
    description: "Track funnel performance from initial DM through to fulfillment in one glance.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 pb-16">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-background to-background px-6 py-16 shadow-subtle sm:px-12"
      >
        <div className="relative z-10 max-w-3xl space-y-6">
          <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            DM Commerce OS
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            A local DM-to-checkout simulator for digital offers.
          </h1>
          <p className="text-lg text-muted-foreground">
            Map posts → DMs → scripts → orders → files — all on your machine. Spin up the sandbox, explore flows, and stress-test campaigns without live customers.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href="/login">
                Enter the dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="https://github.com/constripacity/DM-Commerce-OS/blob/main/docs/BEGINNER-GUIDE.md" target="_blank" rel="noreferrer">
                How to run locally
              </Link>
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      </motion.section>

      <section className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <h2 className="text-2xl font-semibold">Why teams install the sandbox</h2>
          <p className="max-w-2xl text-muted-foreground">
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
                <Card className="h-full border-muted/60 bg-background/90 backdrop-blur">
                  <CardHeader className="flex flex-row items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
