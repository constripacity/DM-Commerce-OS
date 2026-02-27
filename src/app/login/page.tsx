"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "demo@local.test", password: "demo123" },
  });

  const onSubmit = async (values: LoginInput) => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Unable to login" }));
      if (res.status === 401) {
        setError("Invalid email or password.");
      } else if (res.status >= 500) {
        setError("Login temporarily unavailable. Check server logs.");
      } else {
        setError(data.error ?? "Unable to login");
      }
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get("from") ?? "/dashboard";
    router.push(redirectTo as any);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#08153a] to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute left-8 top-0 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden />
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-start gap-8 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-16 lg:px-8 lg:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/65 p-7 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur sm:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-400/20 blur-3xl"
            aria-hidden
          />
          <div className="relative z-10 space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit border-white/20 bg-white/10 text-slate-100">
                Sandbox access
              </Badge>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Log into the DM Commerce OS dashboard.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
                Everything you see runs locally: demo data, automation flows, fake orders, and analytics.
                Sign in with the demo account to explore workflows end-to-end.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-300" />
                <span>Use the demo credentials on the right, no extra setup required.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-300" />
                <span>All data stays on your machine. Reset at any time from Settings.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-300" />
                <span>Navigate through DM flows, campaign planners, checkout tests, and analytics.</span>
              </li>
            </ul>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-100">Demo credentials</p>
              <div className="max-w-xl rounded-2xl border border-white/10 bg-slate-950/50 p-4 font-mono text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-slate-400">Email</span>
                    <span className="text-base font-semibold text-slate-100">demo@local.test</span>
                  </div>
                  <Separator orientation="vertical" className="hidden h-10 bg-white/15 md:block" />
                  <div className="flex flex-col">
                    <span className="text-slate-400">Password</span>
                    <span className="text-base font-semibold text-slate-100">demo123</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-start justify-center lg:justify-end">
          <Card className="w-full max-w-md border-white/10 bg-slate-900/80 shadow-[0_24px_70px_rgba(2,6,23,0.5)] backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Sign in</CardTitle>
              <CardDescription className="text-slate-300">
                Enter the dashboard and start exploring within seconds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="demo@local.test"
                            type="email"
                            autoComplete="email"
                            className="border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-400 focus-visible:ring-blue-300 focus-visible:ring-offset-slate-900"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="demo123"
                              type={showPassword ? "text" : "password"}
                              autoComplete="current-password"
                              className="border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-400 focus-visible:ring-blue-300 focus-visible:ring-offset-slate-900"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute inset-y-0 right-0 mr-1 flex h-full items-center px-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
                              onClick={() => setShowPassword((value) => !value)}
                            >
                              {showPassword ? "Hide" : "Show"}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {error ? <p className="text-sm font-medium text-red-300">{error}</p> : null}
                  <Button type="submit" className="w-full bg-white text-slate-900 hover:bg-slate-100" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                  <p className="text-xs text-slate-400">
                    Issues logging in? Ensure you ran <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px] text-slate-200">pnpm run setup</code> (or <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[11px] text-slate-200">npm run setup</code>) and the dev server is running.
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
