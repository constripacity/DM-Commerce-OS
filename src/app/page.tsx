import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">DM Commerce OS</h1>
        <p className="max-w-2xl text-muted-foreground">
          A local, offline playground that walks through the entire DM → qualify →
          checkout → delivery experience for selling a digital product. Login to
          explore the dashboard features.
        </p>
      </div>
      <Button asChild>
        <Link href="/login">
          Enter the dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
