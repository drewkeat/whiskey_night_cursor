"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type InviteAcceptClientProps = {
  invite: {
    id: string;
    clubName: string;
    clubId: string;
    inviterName: string | null;
    inviteeEmail: string;
  };
  inviteToken: string;
  isLoggedIn: boolean;
  isInvitedUser: boolean;
};

export function InviteAcceptClient({
  invite,
  inviteToken,
  isLoggedIn,
  isInvitedUser,
}: InviteAcceptClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [responding, setResponding] = useState(false);

  const inviterLabel = invite.inviterName ?? "Someone";

  if (isLoggedIn && !isInvitedUser) {
    return (
      <div className="w-full max-w-md rounded-xl border border-amber-200/60 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-amber-950">Club invitation</h1>
        <p className="text-stone-600">
          This invitation was sent to <strong>{invite.inviteeEmail}</strong>. Sign out and use that
          email to accept, or create an account with that email.
        </p>
        <Link
          href="/api/auth/signout"
          className="mt-6 inline-block font-medium text-amber-700 hover:underline"
        >
          Sign out
        </Link>
      </div>
    );
  }

  if (isLoggedIn && isInvitedUser) {
    async function handleRespond(action: "accept" | "decline") {
      setResponding(true);
      setError("");
      try {
        const res = await fetch(`/api/clubs/invitations/${invite.id}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (action === "accept" && data.clubId) {
            router.push(`/clubs/${data.clubId}`);
          } else {
            router.push("/dashboard");
          }
          router.refresh();
        } else {
          setError(data.error ?? "Something went wrong");
          setResponding(false);
        }
      } catch {
        setError("Something went wrong");
        setResponding(false);
      }
    }

    return (
      <div className="w-full max-w-md rounded-xl border border-amber-200/60 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-amber-950">Club invitation</h1>
        <p className="text-stone-600">
          {inviterLabel} has invited you to join <strong>{invite.clubName}</strong>.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => handleRespond("accept")}
            disabled={responding}
            className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {responding ? "..." : "Accept"}
          </button>
          <button
            type="button"
            onClick={() => handleRespond("decline")}
            disabled={responding}
            className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/clubs/invitations/accept-with-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteToken,
        name,
        password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error?._?.[0] ?? data.error?.name?.[0] ?? data.error?.password?.[0] ?? "Failed to create account.");
      return;
    }
    const signInRes = await signIn("credentials", {
      email: invite.inviteeEmail,
      password,
      redirect: false,
    });
    if (signInRes?.error) {
      router.push(`/login?callbackUrl=/clubs/${data.clubId}`);
      router.refresh();
      return;
    }
    router.push(`/clubs/${data.clubId}`);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-amber-200/60 bg-white p-8 shadow-sm">
      <h1 className="mb-6 text-2xl font-semibold text-amber-950">Join the club</h1>
      <p className="mb-6 text-stone-600">
        {inviterLabel} has invited you to join <strong>{invite.clubName}</strong>. Create an account
        to accept.
      </p>
      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={invite.inviteeEmail}
            readOnly
            className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-stone-600"
          />
        </div>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            minLength={8}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
        >
          Create account and join
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href={`/login?callbackUrl=/invite/${inviteToken}`} className="font-medium text-amber-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
