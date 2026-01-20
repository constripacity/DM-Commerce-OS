'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, Mail, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@local.test');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      if (email === 'demo@local.test' && password === 'demo123') {
        router.push('/dashboard');
      } else {
        setError('Invalid email or password.');
      }
    } catch (err) {
      setError('Login temporarily unavailable. Check server logs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity mb-8"
              >
                <Zap className="h-5 w-5" />
                <span className="font-semibold">DM Commerce OS</span>
              </Link>
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                Welcome back
              </h1>
              <p className="text-muted-foreground">
                Use the demo credentials below to explore the dashboard.
              </p>
            </div>

            <div className="rounded-2xl bg-accent/30 border border-primary/20 p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Demo Credentials</p>
              <div className="text-sm space-y-1">
                <p className="font-mono text-muted-foreground">
                  <span className="font-semibold text-foreground">Email:</span> demo@local.test
                </p>
                <p className="font-mono text-muted-foreground">
                  <span className="font-semibold text-foreground">Password:</span> demo123
                </p>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Everything runs locally. No real payments or external APIs.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="demo@local.test"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="demo123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 rounded-xl"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                If login fails, ensure you ran <code className="px-1 py-0.5 rounded bg-muted font-mono">pnpm run setup</code> successfully.
              </p>
            </form>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 via-accent to-primary/5 items-center justify-center p-12">
          <div className="max-w-md space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                Your local commerce playground
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Simulate the complete journey from social post to DM conversation to checkout and delivery.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                'Test DM flows with keyword triggers',
                'Manage products and track orders',
                'Create dynamic response scripts',
                'Analyze funnel performance',
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/20 p-1 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
