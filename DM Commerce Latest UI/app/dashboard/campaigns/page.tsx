'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FileDown, Eye, TrendingUp } from 'lucide-react';

type Campaign = {
  id: string;
  name: string;
  keyword: string;
  startDate: string;
  endDate: string;
  posts: number;
  status: 'active' | 'draft' | 'ended';
};

const demoCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Marketing Guide Campaign',
    keyword: 'GUIDE',
    startDate: '2024-01-01',
    endDate: '2024-02-01',
    posts: 12,
    status: 'active',
  },
  {
    id: '2',
    name: 'Course Launch',
    keyword: 'COURSE',
    startDate: '2024-01-15',
    endDate: '2024-02-15',
    posts: 8,
    status: 'active',
  },
  {
    id: '3',
    name: 'Holiday Special',
    keyword: 'HOLIDAY',
    startDate: '2023-12-01',
    endDate: '2023-12-31',
    posts: 24,
    status: 'ended',
  },
];

export default function CampaignsPage() {
  const [campaigns] = useState<Campaign[]>(demoCampaigns);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const getStatusVariant = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'ended':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Manage your marketing campaigns with keyword triggers and automated posts."
        actions={
          <Button className="gap-2 rounded-xl">
            <TrendingUp className="h-4 w-4" />
            New Campaign
          </Button>
        }
      />

      <Card className="rounded-2xl shadow-soft border-orange-50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Keyword</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <code className="px-2 py-1 rounded bg-accent font-mono text-sm">
                      {campaign.keyword}
                    </code>
                  </TableCell>
                  <TableCell>{campaign.startDate}</TableCell>
                  <TableCell>{campaign.endDate}</TableCell>
                  <TableCell>{campaign.posts}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCampaign(campaign);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedCampaign?.name}</SheetTitle>
            <SheetDescription>Campaign details and generated content</SheetDescription>
          </SheetHeader>
          {selectedCampaign && (
            <div className="space-y-6 py-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Keyword Trigger
                  </label>
                  <p className="text-base font-mono font-medium">
                    {selectedCampaign.keyword}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Campaign Period
                  </label>
                  <p className="text-base">
                    {selectedCampaign.startDate} → {selectedCampaign.endDate}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Generated Posts/Stories
                  </label>
                  <p className="text-2xl font-bold text-primary">
                    {selectedCampaign.posts}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Example Posts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-accent">
                    <p className="text-sm">
                      Ready to transform your marketing? DM me "GUIDE" for my complete framework.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent">
                    <p className="text-sm">
                      Just helped another client 3x their ROI. Want the exact playbook? Reply "GUIDE" below.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full gap-2 rounded-xl">
                <FileDown className="h-4 w-4" />
                Export Campaign CSV
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
