import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AddWhiskeyWithSearch } from "@/components/forms/AddWhiskeyWithSearch";

export default async function AddWhiskeyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Add whiskey</h1>
      <p className="mt-1 text-stone-600">Search the web for a whiskey or add one manually.</p>
      <AddWhiskeyWithSearch className="mt-8 max-w-lg" />
    </div>
  );
}
