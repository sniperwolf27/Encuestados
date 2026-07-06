"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function ShareLink({ url, qrDataUrl }: { url: string; qrDataUrl: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Card variant="solid" className="mb-6 flex items-center gap-4 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt="Código QR de la encuesta" width={96} height={96} className="rounded-lg" />
      <div>
        <p className="mb-1 text-sm text-system-secondary">Link público</p>
        <p className="mb-2 break-all font-mono text-sm text-brand-navy">{url}</p>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "¡Copiado!" : "Copiar link"}
        </Button>
      </div>
    </Card>
  );
}
