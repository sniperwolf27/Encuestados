"use client";

import { useState } from "react";
import { ImageUploadField } from "./ImageUploadField";

export type OptionRow = { key: string; label: string; imageId?: string };

export function QuestionOptionsEditor({ initialOptions }: { initialOptions: OptionRow[] }) {
  const [rows, setRows] = useState<OptionRow[]>(
    initialOptions.length > 0 ? initialOptions : [{ key: "row-0", label: "" }]
  );
  let nextKey = rows.length;

  return (
    <div className="space-y-3 rounded border border-gray-200 p-3">
      <p className="text-xs font-semibold text-gray-500">Opciones (solo opción múltiple)</p>
      {rows.map((row) => (
        <div key={row.key} className="rounded border border-gray-100 p-2">
          <input
            name="optionLabel"
            defaultValue={row.label}
            placeholder="Texto de la opción"
            className="mb-2 block w-full rounded border px-2 py-1 text-sm"
          />
          <ImageUploadField name="option" label="Foto (opcional)" existingImageId={row.imageId} />
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
            className="text-xs text-gray-400 hover:text-brand-orange"
          >
            Eliminar opción
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { key: `row-${nextKey++}`, label: "" }])}
        className="rounded border border-dashed px-3 py-1 text-xs font-semibold text-brand-navy"
      >
        + Agregar opción
      </button>
    </div>
  );
}
