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
    <div className="grid min-h-[calc(100vh-6rem)] gap-10 py-12 md:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex flex-col justify-center space-y-8">
        <div className="space-y-3">
          <Badge variant="outline" className="w-fit bg-primary/10 text-primary">
            Sandbox access
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight">Log into the DM Commerce OS dashboard.</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Everything you see runs locally: demo data, automation flows, fake orders, and analytics. Sign in with the demo account to explore workflows end-to-end.
          </p>
        </div>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
            <span>Use the demo credentials on the right — no extra setup required.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
            <span>All data stays on your machine. Reset at any time from Settings.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
            <span>Navigate through DM flows, campaign planners, checkout tests, and analytics.</span>
          </li>
        </ul>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">Demo credentials</p>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-4 font-mono text-xs">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Email</span>
              <span className="text-base font-semibold text-foreground">demo@local.test</span>
            </div>
            <Separator orientation="vertical" className="hidden h-10 md:block" />
            <div className="flex flex-col">
              <span className="text-muted-foreground">Password</span>
              <span className="text-base font-semibold text-foreground">demo123</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Card className="w-full shadow-subtle">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter the dashboard and start exploring within seconds.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="demo@local.test" type="email" autoComplete="email" {...field} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="demo123"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute inset-y-0 right-0 mr-1 flex h-full items-center px-2 text-xs text-muted-foreground"
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
                {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Issues logging in? Ensure you ran <code className="font-mono text-[11px]">pnpm run setup</code> (or <code className="font-mono text-[11px]">npm run setup</code>) and the dev server is running.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
