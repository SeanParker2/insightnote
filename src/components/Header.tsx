import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl font-bold tracking-tight text-brand-900">
            InsightNote
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" className="text-sm font-medium">
            About
          </Button>
          <Button>Login</Button>
        </nav>
      </div>
    </header>
  );
}
