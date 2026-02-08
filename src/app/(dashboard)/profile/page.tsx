import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConnectCalendarSection } from "@/components/profile/ConnectCalendarSection";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; calendar?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const params = await searchParams;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, image: true },
  });
  const calendarConnection = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId: session.user.id, provider: "google" } },
    select: { id: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Profile</h1>
      <div className="mt-6 rounded-xl border border-amber-200/60 bg-white p-6 max-w-md">
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-stone-500">Name</dt>
            <dd className="text-amber-950">{user?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Email</dt>
            <dd className="text-amber-950">{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-stone-500">Phone (for SMS)</dt>
            <dd className="text-amber-950">{user?.phone ?? "Not set"}</dd>
          </div>
        </dl>
        <ConnectCalendarSection
          connected={!!calendarConnection}
          error={params.error}
          success={params.calendar === "connected"}
        />
        <Link
          href="/profile/notifications"
          className="mt-6 inline-block font-medium text-amber-700 hover:underline"
        >
          Notification preferences →
        </Link>
      </div>
    </div>
  );
}
