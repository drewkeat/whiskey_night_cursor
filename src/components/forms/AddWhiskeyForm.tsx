"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useRef } from "react";

const TYPES = ["bourbon", "scotch", "irish", "rye", "japanese", "other"];
const MAX_DATA_URL_BYTES = 800_000; // ~800KB to keep payloads reasonable
const MAX_DIMENSION = 1024;

const inputClassName =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500";

function fileToDataUrl(
  file: File,
  maxBytes: number = MAX_DATA_URL_BYTES,
  maxDim: number = MAX_DIMENSION
): Promise<string> {
  return new Promise((resolve, reject) => {
    const tryCanvas = () => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          fallbackDataUrl();
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.9;
        const tryEncode = () => {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          if (dataUrl.length > maxBytes && quality > 0.2) {
            quality -= 0.15;
            tryEncode();
          } else {
            resolve(dataUrl);
          }
        };
        tryEncode();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        fallbackDataUrl();
      };
      img.src = url;
    };
    const fallbackDataUrl = () => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to load image"));
      reader.readAsDataURL(file);
    };
    tryCanvas();
  });
}

export function AddWhiskeyForm({
  className = "",
  initialName = "",
}: {
  className?: string;
  initialName?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [distillery, setDistillery] = useState("");
  const [type, setType] = useState("");
  const [region, setRegion] = useState("");
  const [abv, setAbv] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [flavorProfile, setFlavorProfile] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  const isHttpUrl = (s: string) =>
    s.startsWith("http://") || s.startsWith("https://");

  const fetchImageViaProxy = async (url: string): Promise<string> => {
    const res = await fetch("/api/image-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      dataUrl?: string;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? "Failed to load image");
    if (!data.dataUrl) throw new Error("No image data returned");
    return data.dataUrl;
  };

  const onLoadUrlImage = async () => {
    const url = imageUrl.startsWith("http") ? imageUrl : "";
    if (!url) return;
    setImageUploading(true);
    setError("");
    try {
      const dataUrl = await fetchImageViaProxy(url);
      setImageUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load image from URL.");
    } finally {
      setImageUploading(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    e.target.value = "";
    setImageUploading(true);
    setError("");
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageUrl(dataUrl);
    } catch {
      setError("Could not process image. Try a different file.");
    } finally {
      setImageUploading(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let finalImageUrl = imageUrl || undefined;
    if (imageUrl && isHttpUrl(imageUrl)) {
      setImageUploading(true);
      try {
        finalImageUrl = await fetchImageViaProxy(imageUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load image from URL.");
        setImageUploading(false);
        return;
      }
      setImageUploading(false);
    }
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const res = await fetch("/api/whiskeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        distillery: distillery || undefined,
        type: type || undefined,
        region: region || undefined,
        abv: abv ? parseFloat(abv) : undefined,
        imageUrl: finalImageUrl,
        flavorProfile: flavorProfile || undefined,
        tags: tags.length > 0 ? tags : undefined,
        source: "manual",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error?.name?.[0] ?? "Failed to add whiskey");
      return;
    }
    router.push(`/whiskeys/${data.id}`);
    router.refresh();
  }

  const hasImage = !!imageUrl;

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-stone-700">
          Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClassName}
        />
      </div>
      <div>
        <label htmlFor="distillery" className="mb-1 block text-sm font-medium text-stone-700">
          Distillery
        </label>
        <input
          id="distillery"
          type="text"
          value={distillery}
          onChange={(e) => setDistillery(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div>
        <label htmlFor="type" className="mb-1 block text-sm font-medium text-stone-700">
          Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputClassName}
        >
          <option value="">Select</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="region" className="mb-1 block text-sm font-medium text-stone-700">
          Region
        </label>
        <input
          id="region"
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div>
        <label htmlFor="abv" className="mb-1 block text-sm font-medium text-stone-700">
          ABV %
        </label>
        <input
          id="abv"
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={abv}
          onChange={(e) => setAbv(e.target.value)}
          className={inputClassName}
        />
      </div>

      <div className="space-y-3">
        <span className="block text-sm font-medium text-stone-700">Image</span>
        <div>
          <label htmlFor="imageUrl" className="mb-1 block text-xs text-stone-500">
            Image URL
          </label>
          <div className="flex gap-2">
            <input
              id="imageUrl"
              type="url"
              value={imageUrl.startsWith("http") ? imageUrl : ""}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className={inputClassName}
            />
            {imageUrl.startsWith("http") && (
              <button
                type="button"
                onClick={onLoadUrlImage}
                disabled={imageUploading}
                className="shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {imageUploading ? "Loading…" : "Load image"}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Image is fetched server-side to avoid CORS issues.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-stone-500">
            Or take a photo / upload an image
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-4 file:py-2 file:text-amber-900 file:hover:bg-amber-200"
            aria-label="Take photo or upload image"
          />
        </div>
        {imageUploading && (
          <p className="text-sm text-stone-500">Processing image…</p>
        )}
        {hasImage && (
          <div className="flex items-center gap-3">
            <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
              <img
                src={imageUrl}
                alt="Bottle preview"
                className="h-full w-full object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setImageUrl("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-sm text-amber-700 hover:underline"
            >
              Remove image
            </button>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="flavorProfile" className="mb-1 block text-sm font-medium text-stone-700">
          Flavor profile
        </label>
        <textarea
          id="flavorProfile"
          value={flavorProfile}
          onChange={(e) => setFlavorProfile(e.target.value)}
          rows={2}
          placeholder="e.g. Vanilla, oak, light smoke"
          className={inputClassName}
        />
      </div>
      <div>
        <label htmlFor="tags" className="mb-1 block text-sm font-medium text-stone-700">
          Tags
        </label>
        <input
          id="tags"
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. peated, sherry-cask, single-malt"
          className={inputClassName}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
        >
          Add whiskey
        </button>
        <Link
          href="/whiskeys"
          className="rounded-lg border border-stone-300 px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
