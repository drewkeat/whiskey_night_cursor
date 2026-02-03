import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50/30 px-4">
      <h1 className="text-xl font-semibold text-amber-950">You’re offline</h1>
      <p className="mt-2 text-stone-600">This page isn’t available. Check your connection and try again.</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
      >
        Try again
      </Link>
    </div>
  );
}
