"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// Cloudflare Turnstile challenge for the auth forms.
//
// Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, which is the
// same condition under which the server skips verification — so an
// unconfigured environment behaves exactly as it did before captcha existed.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const captchaConfigured = Boolean(SITE_KEY);

// Analytics attribution tag sent with every challenge.
const CAPTCHA_ACTION = "turnstile-spin-v2";

// Turns a Turnstile error code into something the person looking at the screen
// can act on. 110* codes are configuration problems on our side, so they say so
// plainly rather than implying the visitor did something wrong.
function hintFor(code: string | null): string {
  if (!code) return "Please try again, or reload the page.";
  if (code === "script-blocked") {
    return "The check was blocked before it loaded — usually an ad or privacy blocker, or no connection. Disable the blocker for this site and try again.";
  }
  if (code.startsWith("1102")) {
    return "This site's address isn't registered on the security widget. If you're the site owner, add this hostname to the Turnstile widget's allowed domains in the Cloudflare dashboard.";
  }
  if (code.startsWith("1105") || code.startsWith("1106")) {
    return "The security widget is misconfigured (bad site key). If you're the site owner, check NEXT_PUBLIC_TURNSTILE_SITE_KEY.";
  }
  return "Please try again, or reload the page.";
}

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      action?: string;
      callback: (token: string) => void;
      "error-callback"?: (code?: string) => void;
      "expired-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      appearance?: "always" | "execute" | "interaction-only";
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Module-level so the script is requested once no matter how many widgets mount.
let scriptPromise: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later mount retry rather than caching the failure forever.
      scriptPromise = null;
      reject(new Error("load failed"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type CaptchaHandle = {
  /** Discard the current token and re-run the challenge. */
  reset: () => void;
};

export const CaptchaWidget = forwardRef<
  CaptchaHandle,
  {
    // Receives the solved token, or null when it expires / errors / is reset.
    onToken: (token: string | null) => void;
    className?: string;
    // "always" shows the checkbox. "interaction-only" runs the challenge
    // silently and only draws anything if Cloudflare decides this visitor needs
    // a real human check — verification still happens either way, so the server
    // gate is unchanged.
    appearance?: "always" | "interaction-only";
  }
>(function CaptchaWidget({ onToken, className, appearance = "always" }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  // Held in a ref so re-rendering the parent (every keystroke, in these forms)
  // doesn't tear down and re-render the challenge.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
          onTokenRef.current(null);
        }
      },
    }),
    []
  );

  const fail = useCallback((code: string) => {
    onTokenRef.current(null);
    setStatus("error");
    setErrorCode(code);
    // The code is the only thing that distinguishes "blocked by an extension"
    // from "this hostname isn't on the widget" — worth having in the console
    // even though the UI now shows it too.
    console.warn(`[turnstile] challenge unavailable (${code})`);
  }, []);

  const mount = useCallback(async () => {
    if (!SITE_KEY || !containerRef.current || widgetIdRef.current) return;
    setStatus("loading");
    setErrorCode(null);

    try {
      await loadTurnstile();
    } catch {
      // Script never arrived: offline, or blocked by an ad/privacy blocker.
      fail("script-blocked");
      return;
    }
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        // Equivalent of `data-action` on a declarative `.cf-turnstile` div. This
        // integration renders explicitly (so it can reset a spent token), so the
        // attribute is passed as a render param instead. Account-level analytics
        // attribution only — the challenge works identically without it.
        action: CAPTCHA_ACTION,
        appearance,
        callback: (token) => {
          setStatus("ready");
          setErrorCode(null);
          onTokenRef.current(token);
        },
        // Tokens are single-use and expire after a few minutes; clearing on
        // expiry stops the form submitting one the server will reject.
        "expired-callback": () => onTokenRef.current(null),
        // Turnstile hands the error code in here — 110200 for an unregistered
        // hostname, which is invisible without surfacing it.
        "error-callback": (code) => fail(code || "unknown"),
        theme: "light",
      });
      setStatus("ready");
    } catch (e) {
      // render() throws synchronously on a malformed sitekey.
      fail(e instanceof Error ? e.message : "render-failed");
    }
  }, [fail, appearance]);

  useEffect(() => {
    void mount();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [mount]);

  const retry = () => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
    }
    widgetIdRef.current = null;
    void mount();
  };

  if (!SITE_KEY) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
      {status === "error" && (
        <div className="mt-2 w-full rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-left text-xs text-amber-900">
          <p className="font-medium">Security check couldn&apos;t load</p>
          <p className="mt-1 leading-relaxed text-amber-800">
            {hintFor(errorCode)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-full border border-amber-400 bg-white px-3 py-1 font-medium text-amber-900 hover:bg-amber-100 transition-colors"
            >
              Try again
            </button>
            {errorCode && (
              <code className="font-mono text-[10px] text-amber-700">
                code {errorCode}
              </code>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
