"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ConfirmDeleteModal } from "@/app/admin/(authed)/ConfirmDeleteModal";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
};

// Promise-based confirmation backed by the in-app ConfirmDeleteModal, so we can
export function useConfirm(): {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  confirmDialog: ReactNode;
} {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  }, []);

  const confirmDialog = (
    <ConfirmDeleteModal
      open={opts !== null}
      title={opts?.title ?? ""}
      description={opts?.description ?? ""}
      confirmLabel={opts?.confirmLabel}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, confirmDialog };
}
