'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Plus, Edit } from 'lucide-react';

type Script = {
  id: string;
  category: string;
  name: string;
  template: string;
  variables: string[];
};

const demoScripts: Script[] = [
  {
    id: '1',
    category: 'Greeting',
    name: 'Initial Response',
    template: 'Thanks for your interest! I\'d love to share my {{product}} with you. It\'s helped hundreds of people. Can I ask what specific area you\'re looking to improve?',
    variables: ['product'],
  },
  {
    id: '2',
    category: 'Pitch',
    name: 'Product Introduction',
    template: 'Perfect! This {{product}} covers exactly that. It\'s normally ${{original_price}}, but I\'m offering it at ${{price}} for a limited time.',
    variables: ['product', 'original_price', 'price'],
  },
  {
    id: '3',
    category: 'Qualify',
    name: 'Interest Check',
    template: 'I want to make sure this is the right fit for you. What\'s your biggest challenge with {{topic}} right now?',
    variables: ['topic'],
  },
  {
    id: '4',
    category: 'Checkout',
    name: 'Payment Link',
    template: 'Great! Here\'s your secure checkout link: {{checkout_url}}\n\nOnce payment is confirmed, you\'ll receive instant access to {{product}}.',
    variables: ['checkout_url', 'product'],
  },
];

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>(demoScripts);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [editMode, setEditMode] = useState(false);

  const groupedScripts = scripts.reduce((acc, script) => {
    if (!acc[script.category]) {
      acc[script.category] = [];
    }
    acc[script.category].push(script);
    return acc;
  }, {} as Record<string, Script[]>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scripts"
        description="Manage automated response templates with dynamic variables."
        actions={
          <Sheet>
            <SheetTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                New Script
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Create New Script</SheetTitle>
                <SheetDescription>
                  Add a new response template with variables
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="script-name">Script Name</Label>
                  <Input
                    id="script-name"
                    placeholder="e.g., Initial Response"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Greeting, Pitch, Qualify"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <Textarea
                    id="template"
                    placeholder="Use {{variable}} for dynamic content"
                    className="rounded-xl font-mono text-sm"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available variables: product, price, checkout_url
                  </p>
                </div>
                <Button className="w-full rounded-xl">Create Script</Button>
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {Object.entries(groupedScripts).map(([category, categoryScripts]) => (
            <Card key={category} className="rounded-2xl shadow-soft border-orange-50">
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
                <CardDescription>{categoryScripts.length} scripts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {categoryScripts.map((script) => (
                  <div
                    key={script.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedScript(script);
                      setEditMode(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{script.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {script.template.substring(0, 60)}...
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedScript(script);
                        setEditMode(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {selectedScript ? (
            <>
              <Card className="rounded-2xl shadow-soft border-orange-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedScript.name}</CardTitle>
                    <Badge>{selectedScript.category}</Badge>
                  </div>
                  <CardDescription>Template editor and preview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editMode ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Template Content</Label>
                        <Textarea
                          value={selectedScript.template}
                          className="rounded-xl font-mono text-sm"
                          rows={8}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1 rounded-xl">Save Changes</Button>
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setEditMode(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="mb-2 block">Template</Label>
                        <div className="p-4 rounded-xl bg-accent font-mono text-sm whitespace-pre-wrap">
                          {selectedScript.template}
                        </div>
                      </div>
                      <div>
                        <Label className="mb-2 block">Variables</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedScript.variables.map((variable) => (
                            <code
                              key={variable}
                              className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm"
                            >
                              {`{{${variable}}}`}
                            </code>
                          ))}
                        </div>
                      </div>
                      <Button
                        className="w-full rounded-xl"
                        onClick={() => setEditMode(true)}
                      >
                        Edit Script
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-soft border-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg">Live Preview</CardTitle>
                  <CardDescription>How this script appears to users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedScript.template
                        .replace('{{product}}', 'Digital Marketing Guide')
                        .replace('{{price}}', '47')
                        .replace('{{original_price}}', '97')
                        .replace('{{topic}}', 'social media marketing')
                        .replace('{{checkout_url}}', 'https://checkout.demo/guide-47')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="rounded-2xl shadow-soft border-orange-50">
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
                  Select a script to view and edit
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
