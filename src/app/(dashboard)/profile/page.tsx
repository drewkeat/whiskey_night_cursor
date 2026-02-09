import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConnectCalendarSection } from "@/components/profile/ConnectCalendarSection";
import { ProfileForm } from "@/components/profile/ProfileForm";

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
      <div className="mt-6 max-w-md space-y-6 rounded-xl border border-amber-200/60 bg-white p-6">
        <ProfileForm user={{ name: user?.name ?? null, email: user?.email ?? null, phone: user?.phone ?? null }} />
        <div className="border-t border-stone-200 pt-6">
            <ConnectCalendarSection
            connected={!!calendarConnection}
            error={params.error}
            success={params.calendar === "connected"}
          />
        </div>
        <Link
          href="/profile/notifications"
          className="inline-block font-medium text-amber-700 hover:underline"
        >
          Notification preferences →
        </Link>
      </div>
    </div>
  );
}
