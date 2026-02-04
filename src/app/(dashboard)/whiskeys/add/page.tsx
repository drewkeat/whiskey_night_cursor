import Link from "next/link";
import { AddWhiskeyForm } from "@/components/forms/AddWhiskeyForm";

export default function AddWhiskeyPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/whiskeys"
          className="text-sm text-amber-700 hover:underline"
        >
          ← Back to whiskey library
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-amber-950">Add a whiskey</h1>
      <p className="mt-1 text-stone-600">
        Add a new whiskey to the library. You can search the web for details when adding from a night.
      </p>
      <div className="mt-6 max-w-lg">
        <AddWhiskeyForm />
      </div>
    </div>
  );
}
