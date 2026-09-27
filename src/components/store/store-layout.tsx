import type { ReactNode } from "react";
import { Navbar } from "@/components/store/navbar";
import { Footer } from "@/components/store/footer";

export function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
