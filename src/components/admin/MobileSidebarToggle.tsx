"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileSidebarToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    triggerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b1f2b] text-white shadow-lg md:hidden"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <div
        {...(open ? { role: "dialog", "aria-modal": "true" } : {})}
        onClick={() => setOpen(false)}
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 md:hidden"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </>
  );
}
