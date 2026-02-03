import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50/30 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-amber-950">Whiskey Night</h1>
          <p className="mt-2 text-stone-600">Welcome back, {session.user?.name ?? session.user?.email}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-amber-700 px-6 py-3 font-medium text-white hover:bg-amber-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50/30 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-amber-950">Whiskey Night</h1>
        <p className="mt-2 text-stone-600">Plan and schedule whiskey tastings with your club.</p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-amber-700 px-6 py-3 font-medium text-white hover:bg-amber-800"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-amber-700 px-6 py-3 font-medium text-amber-700 hover:bg-amber-50"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
