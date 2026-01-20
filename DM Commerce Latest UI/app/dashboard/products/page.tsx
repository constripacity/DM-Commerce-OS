'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  SheetTrigger,
} from '@/components/ui/sheet';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Product = {
  id: string;
  name: string;
  price: number;
  file: string;
  created: string;
  status: 'active' | 'draft';
};

const demoProducts: Product[] = [
  {
    id: '1',
    name: 'Digital Marketing Guide',
    price: 47,
    file: '/files/marketing-guide.pdf',
    created: '2024-01-15',
    status: 'active',
  },
  {
    id: '2',
    name: 'Social Media Templates Pack',
    price: 29,
    file: '/files/templates.zip',
    created: '2024-01-10',
    status: 'active',
  },
  {
    id: '3',
    name: 'Email Course Bundle',
    price: 97,
    file: '/files/email-course.pdf',
    created: '2024-01-08',
    status: 'active',
  },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    file: '',
  });

  const handleCreateProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      name: formData.name,
      price: parseFloat(formData.price),
      file: formData.file,
      created: new Date().toISOString().split('T')[0],
      status: 'active',
    };

    setProducts([...products, newProduct]);
    setIsDrawerOpen(false);
    setFormData({ name: '', description: '', price: '', file: '' });
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your digital products and pricing."
        actions={
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                New Product
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Create New Product</SheetTitle>
                <SheetDescription>
                  Add a new digital product to your catalog
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Marketing Guide"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of your product"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="rounded-xl"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="47"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File Path</Label>
                  <Input
                    id="file"
                    placeholder="/files/product.pdf"
                    value={formData.file}
                    onChange={(e) =>
                      setFormData({ ...formData, file: e.target.value })
                    }
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Path to the downloadable file
                  </p>
                </div>
                <Button
                  onClick={handleCreateProduct}
                  className="w-full rounded-xl"
                  disabled={!formData.name || !formData.price || !formData.file}
                >
                  Create Product
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      <Card className="rounded-2xl shadow-soft border-orange-50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>${product.price}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {product.file}
                    </code>
                  </TableCell>
                  <TableCell>{product.created}</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.status === 'active' ? 'default' : 'secondary'}
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
