"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50/30 px-4">
      <div className="w-full max-w-sm rounded-xl border border-amber-200/60 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-amber-950">Sign in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-stone-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
          >
            Sign in
          </button>
        </form>
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <div className="mt-4 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full rounded-lg border border-stone-300 px-4 py-2 text-stone-700 hover:bg-stone-50"
            >
              Continue with Google
            </button>
          </div>
        )}
        <p className="mt-4 text-center text-sm text-stone-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-amber-700 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
