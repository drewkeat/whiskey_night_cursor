import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CreateClubForm } from "@/components/forms/CreateClubForm";

export default async function NewClubPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-amber-950">Create a club</h1>
      <p className="mt-1 text-stone-600">Start a club to schedule whiskey nights with friends.</p>
      <CreateClubForm className="mt-8 max-w-md" />
    </div>
  );
}
