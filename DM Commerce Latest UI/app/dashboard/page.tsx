'use client';

import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, MessageSquare, Package, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const stats = [
  {
    label: 'Active Campaigns',
    value: '3',
    subLabel: 'Last 30 days',
    icon: TrendingUp,
    trend: 'up' as const,
    trendValue: '+12%',
  },
  {
    label: 'DM Sessions',
    value: '47',
    subLabel: 'This week',
    icon: MessageSquare,
    trend: 'up' as const,
    trendValue: '+8%',
  },
  {
    label: 'Products',
    value: '12',
    subLabel: 'Active listings',
    icon: Package,
    trend: 'neutral' as const,
  },
  {
    label: 'Demo Conversion',
    value: '23.5%',
    subLabel: 'Last 7 days',
    icon: Activity,
    trend: 'up' as const,
    trendValue: '+4.2%',
  },
];

const chartData = [
  { date: 'Mon', sessions: 4 },
  { date: 'Tue', sessions: 8 },
  { date: 'Wed', sessions: 12 },
  { date: 'Thu', sessions: 7 },
  { date: 'Fri', sessions: 15 },
  { date: 'Sat', sessions: 10 },
  { date: 'Sun', sessions: 6 },
];

const funnelData = [
  { stage: 'Impressions', count: 1250 },
  { stage: 'DMs', count: 187 },
  { stage: 'Qualified', count: 89 },
  { stage: 'Orders', count: 44 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Snapshot of your DM funnel, products, and orders."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-soft border-orange-50">
          <CardHeader>
            <CardTitle>DM Sessions</CardTitle>
            <CardDescription>Session activity over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft border-orange-50">
          <CardHeader>
            <CardTitle>Funnel Performance</CardTitle>
            <CardDescription>Conversion through each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="stage"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-soft border-orange-50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump to key features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/dashboard/dm-studio">
              <Button variant="outline" className="w-full justify-between group rounded-xl h-auto py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <span>Open DM Studio</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
            <Link href="/dashboard/products">
              <Button variant="outline" className="w-full justify-between group rounded-xl h-auto py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <span>View Products</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
            <Link href="/dashboard/scripts">
              <Button variant="outline" className="w-full justify-between group rounded-xl h-auto py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <span>Manage Scripts</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
