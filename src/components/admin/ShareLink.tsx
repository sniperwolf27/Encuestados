"use client";

import { useState } from "react";

export function ShareLink({ url, qrDataUrl }: { url: string; qrDataUrl: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mb-6 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="Código QR de la encuesta" width={96} height={96} />
      <div>
        <p className="mb-1 text-sm text-gray-500">Link público</p>
        <p className="mb-2 break-all font-mono text-sm text-brand-navy">{url}</p>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded bg-brand-navy px-3 py-1 text-xs font-bold text-white"
        >
          {copied ? "¡Copiado!" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}
