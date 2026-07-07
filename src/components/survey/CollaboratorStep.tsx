"use client";

import { Avatar } from "@/components/ui/Avatar";

export type CollaboratorOption = { id: string; name: string; imageId: string | null };

export function CollaboratorStep({
  collaborators,
  onSelect,
}: {
  collaborators: CollaboratorOption[];
  onSelect: (collaboratorId: string | null) => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-navy to-brand-navy-dark px-4 pt-6 pb-10">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="mb-6 text-sm font-semibold text-white/60"
      >
        Omitir →
      </button>
      <h1 className="mb-6 text-[22px] font-extrabold text-white">¿Quién te atendió?</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {collaborators.map((collaborator) => (
          <button
            type="button"
            key={collaborator.id}
            onClick={() => onSelect(collaborator.id)}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white/8 p-4 backdrop-blur-xl"
          >
            <Avatar imageId={collaborator.imageId ?? undefined} label={collaborator.name} size={72} />
            <span className="text-sm font-semibold text-white">{collaborator.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
