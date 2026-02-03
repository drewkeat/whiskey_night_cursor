"use client";

import { useState, useEffect } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const key = "pwa-install-dismissed";
      if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
        setShowBanner(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowBanner(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setShowBanner(false);
    setDismissed(true);
    if (typeof window !== "undefined") sessionStorage.setItem("pwa-install-dismissed", "1");
  }

  if (!showBanner || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
      <p className="text-sm font-medium text-amber-950">Install Whiskey Night for a better experience.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
