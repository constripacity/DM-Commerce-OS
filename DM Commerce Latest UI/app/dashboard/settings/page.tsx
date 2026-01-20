'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [brandName, setBrandName] = useState('DM Commerce OS');
  const [primaryColor, setPrimaryColor] = useState('#FF7A21');
  const [logoPath, setLogoPath] = useState('/logo.png');

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  const handleResetData = () => {
    toast.info('Demo data reset functionality would be implemented here');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your DM Commerce OS instance."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-soft border-orange-50">
          <CardHeader>
            <CardTitle>Brand Settings</CardTitle>
            <CardDescription>Customize your brand identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input
                id="brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10 rounded-xl"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 rounded-xl font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div
                  className="w-12 h-12 rounded-xl border-2"
                  style={{ backgroundColor: primaryColor }}
                />
                <p className="text-sm text-muted-foreground">
                  Preview of primary color
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-path">Logo Path</Label>
              <Input
                id="logo-path"
                value={logoPath}
                onChange={(e) => setLogoPath(e.target.value)}
                placeholder="/logo.png"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Path to your logo file in the public directory
              </p>
            </div>

            <Button onClick={handleSave} className="w-full rounded-xl">
              Save Brand Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft border-orange-50">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Version and environment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Version</span>
                <Badge variant="secondary">1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Environment</span>
                <Badge variant="outline">Local</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Mode</span>
                <Badge>Demo</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Database</span>
                <Badge variant="secondary">SQLite</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl shadow-soft border-orange-50 border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your demo data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl bg-destructive/5 border border-destructive/20">
            <div className="flex-1">
              <p className="font-medium text-sm">Reset Demo Data</p>
              <p className="text-xs text-muted-foreground mt-1">
                This will delete all products, orders, campaigns, and reset to factory defaults.
              </p>
            </div>
            <Button
              variant="destructive"
              className="gap-2 rounded-xl"
              onClick={handleResetData}
            >
              <RefreshCw className="h-4 w-4" />
              Reset Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
