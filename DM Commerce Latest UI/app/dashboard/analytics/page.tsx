'use client';

import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, MessageSquare, CheckCircle, Package } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const stats = [
  {
    label: 'Total Impressions',
    value: '12.5K',
    subLabel: 'Last 30 days',
    icon: Eye,
    trend: 'up' as const,
    trendValue: '+15%',
  },
  {
    label: 'DM Conversations',
    value: '187',
    subLabel: 'This month',
    icon: MessageSquare,
    trend: 'up' as const,
    trendValue: '+22%',
  },
  {
    label: 'Qualified Leads',
    value: '89',
    subLabel: '47.6% conversion',
    icon: CheckCircle,
    trend: 'up' as const,
    trendValue: '+8%',
  },
  {
    label: 'Orders Completed',
    value: '44',
    subLabel: '49.4% close rate',
    icon: Package,
    trend: 'up' as const,
    trendValue: '+12%',
  },
];

const sessionData = [
  { date: 'Jan 14', sessions: 18 },
  { date: 'Jan 15', sessions: 22 },
  { date: 'Jan 16', sessions: 25 },
  { date: 'Jan 17', sessions: 30 },
  { date: 'Jan 18', sessions: 28 },
  { date: 'Jan 19', sessions: 35 },
  { date: 'Jan 20', sessions: 29 },
];

const funnelData = [
  { stage: 'Impressions', count: 12500, color: 'hsl(var(--chart-1))' },
  { stage: 'DMs Opened', count: 1875, color: 'hsl(var(--chart-2))' },
  { stage: 'Qualified', count: 892, color: 'hsl(var(--chart-3))' },
  { stage: 'Orders', count: 441, color: 'hsl(var(--chart-4))' },
];

const productData = [
  { name: 'Marketing Guide', value: 24, color: 'hsl(var(--primary))' },
  { name: 'Templates Pack', value: 12, color: 'hsl(var(--chart-2))' },
  { name: 'Email Course', value: 8, color: 'hsl(var(--chart-3))' },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Track funnel performance from impressions to delivery."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-soft border-orange-50">
          <CardHeader>
            <CardTitle>DM Sessions Over Time</CardTitle>
            <CardDescription>Daily conversation activity for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sessionData}>
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
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft border-orange-50">
          <CardHeader>
            <CardTitle>Orders by Product</CardTitle>
            <CardDescription>Distribution of sales across products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {productData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-soft border-orange-50">
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            Full journey from impression to completed order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                  }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
