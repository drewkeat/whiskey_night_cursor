import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-amber-50/30 overflow-x-hidden">
      <header className="sticky top-0 z-10 border-b border-amber-200/60 bg-white/95 backdrop-blur overflow-x-hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-semibold text-amber-950">
            <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="h-8 w-8" />
            Whiskey Night
          </Link>
          <DashboardNav user={session.user} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <InstallPrompt />
    </div>
  );
}
