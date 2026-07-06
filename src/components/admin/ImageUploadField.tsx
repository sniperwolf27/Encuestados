"use client";

import { useState } from "react";

export function ImageUploadField({
  name,
  label,
  existingImageId,
}: {
  name: string;
  label: string;
  existingImageId?: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existingImageId ? `/api/images/${existingImageId}` : null
  );
  const [removed, setRemoved] = useState(false);

  return (
    <div className="mb-2">
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      <input type="hidden" name={`${name}ExistingImageId`} value={existingImageId ?? ""} />
      <input type="hidden" name={`${name}RemoveImage`} value={removed ? "true" : "false"} />
      {previewUrl && !removed && (
        <div className="mb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="h-16 w-16 rounded object-cover" />
          <button
            type="button"
            onClick={() => {
              setRemoved(true);
              setPreviewUrl(null);
            }}
            className="text-xs text-brand-orange"
          >
            Quitar imagen
          </button>
        </div>
      )}
      <input
        type="file"
        name={`${name}Image`}
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setRemoved(false);
            setPreviewUrl(URL.createObjectURL(file));
          }
        }}
        className="block w-full text-xs"
      />
    </div>
  );
}
