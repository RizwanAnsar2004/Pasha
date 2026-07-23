"use client";

import { useMemo, useRef, useState, Suspense } from "react";
import {
  CaptchaWidget,
  captchaConfigured,
  type CaptchaHandle,
} from "@/components/auth/CaptchaWidget";
import { useSearchParams, useRouter } from "next/navigation";
import { api, ApiError, apiErrorMessage } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Rocket, Loader2, AlertCircle, MailCheck, ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { TermsModal } from "./TermsModal";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DynamicField } from "@/components/form/DynamicField";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { OptionListsProvider, type OptionRegistry } from "@/components/form/OptionListsContext";
import { buildZodSchema, buildDefaultValues, buildDevPrefill, type FormConfig, type FormFieldConfig } from "@/lib/forms/form-config";
import { InputType } from "@/lib/forms/form-enums";
import {
  APPLICANT_MIN_PASSWORD_LENGTH,
  applicantEmailError,
  applicantPasswordError,
} from "@/lib/auth/applicant/applicant-password";
import { cn } from "@/lib/utils";
import { useRouteProgress } from "@/components/RouteProgress";

type Values = Record<string, unknown>;

// Local-testing only: prefill the account fields so you can register without typing.
const DEV_PREFILL = process.env.NODE_ENV === "development";
// Fixed disposable inbox for local testing (open mail at yopmail.com).
const devEmail = () => "dev-test-pasha@yopmail.com";

function AuthInner({
  registrationConfig,
  optionLists,
  terms,
}: {
  registrationConfig: FormConfig | null;
  optionLists: OptionRegistry;
  terms?: { title: string; body: string };
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const routeProgress = useRouteProgress();
  const redirect = sp.get("redirect") ?? "/apply";

  const hasRegForm = !!(registrationConfig && registrationConfig.length > 0);

  // ?mode=register opens straight on "Create your account" — that's what the
  // header's "Join the Hub" CTA links to, since someone clicking Join is
  // signing up, not signing in.
  const [mode, setMode] = useState<"login" | "register">(
    sp.get("mode") === "register" || DEV_PREFILL ? "register" : "login"
  );
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [termsOpen, setTermsOpen] = useState(false);
  // ?forgot=1 deep-links here from an unusable recovery link, so the user can
  // request a fresh one without hunting for the option.
  const [screen, setScreen] = useState<"form" | "verify" | "forgot">(
    sp.get("forgot") === "1" ? "forgot" : "form"
  );
  const linkExpired = sp.get("error") === "link_expired";
  const [email, setEmail] = useState(() => (DEV_PREFILL ? devEmail() : ""));
  const [password, setPassword] = useState(DEV_PREFILL ? "Admin.321" : "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  // When a login attempt is rejected because the email isn't verified yet.
  const [needsVerify, setNeedsVerify] = useState(false);
  // When registration is rejected because the email is already taken (409).
  const [accountExists, setAccountExists] = useState(false);
  // Bot challenge. One widget serves every screen (login / register / forgot),
  // mounted below the card body so switching screens doesn't re-challenge.
  const captchaRef = useRef<CaptchaHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    sp.get("error") === "admin"
      ? "You're signed in with a committee/admin account, which can't be used to apply. Sign out of the admin portal, or sign in with a separate applicant account below."
      : null
  );

  // RHF form for the admin-configured §3 registration fields (step 2).
  const schema = useMemo(
    () => (hasRegForm ? buildZodSchema(registrationConfig!) : null),
    [hasRegForm, registrationConfig]
  );
  const defaults = useMemo(
    () =>
      hasRegForm
        ? DEV_PREFILL
          ? buildDevPrefill(registrationConfig!, optionLists)
          : buildDefaultValues(registrationConfig!)
        : {},
    [hasRegForm, registrationConfig, optionLists]
  );
  const form = useForm<Values>({
    resolver: schema ? (zodResolver(schema as never) as Resolver<Values>) : undefined,
    mode: "onTouched",
    defaultValues: defaults,
  });

  const isRegister = mode === "register";
  const isRegistrationStep =
    screen === "form" && isRegister && regStep === 2 && hasRegForm;

  // A SINGLE captcha widget is mounted once, at a stable position below the card
  // body (see the return), and merely shown/hidden per screen. It deliberately
  // lives OUTSIDE the per-screen markup: rendering it inside each screen's branch
  // placed it at a different position in the React tree per screen, so switching
  // login → forgot / step 1 → step 2 remounted it and fired a fresh Cloudflare
  // challenge every time (the "verifies twice" bug). Kept mounted, it reconciles
  // in place and challenges exactly once. Hidden only on screens with no submit
  // (the verify prompt and the "reset link sent" confirmation).
  const captchaNeeded = screen === "form" || (screen === "forgot" && !info);

  function registrationFieldSpan(field: FormFieldConfig) {
    if (
      field.input_type === InputType.CITY_COMPOSITE ||
      field.input_type === InputType.TEXTAREA ||
      field.input_type === InputType.RICH_TEXT ||
      field.input_type === InputType.GROUP ||
      field.input_type === InputType.HEADING ||
      field.field_key === "terms_accepted"
    ) {
      return "sm:col-span-2";
    }
    return undefined;
  }

  function validateAccountFields(): boolean {
    const eErr = applicantEmailError(email);
    const pErr = isRegister ? applicantPasswordError(password) : password ? null : "Password is required.";
    setEmailError(eErr);
    setPasswordError(pErr);
    setError(null);
    setAccountExists(false);
    return !eErr && !pErr;
  }

  function applyApiError(message: string) {
    if (/password/i.test(message)) {
      setPasswordError(message);
      setError(null);
      return;
    }
    if (/email/i.test(message)) {
      setEmailError(message);
      setError(null);
      return;
    }
    setError(message);
  }

  async function postAuth(payload: Record<string, unknown>) {
    type AuthResp = {
      error?: string;
      exists?: boolean;
      needsVerification?: boolean;
      captcha?: boolean;
    };
    // `check` runs while the applicant is still typing their email, before
    // there's any challenge to solve — the server exempts it for the same
    // reason.
    const needsCaptcha = payload.action !== "check";
    const body = needsCaptcha ? { ...payload, captchaToken } : payload;

    // Turnstile tokens are single-use. Re-arm ONLY when the request failed and
    // the user stays on the form to retry — resetting the widget re-runs the
    // Cloudflare challenge, so doing it on success would fire a fresh challenge
    // right as we redirect away (the reported "cloudflare triggers again" bug).
    const rearm = () => {
      if (!needsCaptcha || !captchaConfigured) return;
      setCaptchaToken(null);
      captchaRef.current?.reset();
    };

    try {
      const j = await api.post<AuthResp>(ENDPOINTS.applicant.auth, body);
      // Success → we navigate away (login/redirect) or move to a screen without
      // a challenge (verify/sent). Leave the widget alone; no re-challenge.
      return { res: { ok: true, status: 200 }, j };
    } catch (e) {
      rearm();
      if (e instanceof ApiError) return { res: { ok: false, status: e.status }, j: e.data as AuthResp };
      return { res: { ok: false, status: 0 }, j: { error: apiErrorMessage(e) } as AuthResp };
    }
  }

  // Step 1 → Step 2 (or straight to submit when there's no registration form).
  async function continueFromAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAccountFields()) return;

    setLoading(true);
    let blocked = false;
    try {
      const { res, j } = await postAuth({ action: "check", email });
      if (res.ok && j.exists) {
        setError("An account with this email already exists. Please sign in instead.");
        setAccountExists(true);
        blocked = true;
      } else if (!res.ok && j.error) {
        // e.g. an admin email → surface it now rather than at the end.
        applyApiError(j.error);
        blocked = true;
      }
    } catch {
      // Network hiccup → fail open and let them continue; final submit still guards against a duplicate account.
    } finally {
      setLoading(false);
    }
    if (blocked) return;

    if (hasRegForm) {
      // Clear any errors left over from a previous submit attempt so step 2 renders clean — the user shouldn't see red on inputs they haven't touched yet.
      form.clearErrors();
      setRegStep(2);
    } else {
      void submitRegister({});
    }
  }

  async function submitRegister(profile: Values) {
    if (!validateAccountFields()) return;
    setError(null);
    setLoading(true);
    try {
      const { res, j } = await postAuth({ action: "register", email, password, profile });
      if (!res.ok) {
        // 409 = email already registered.
        if (res.status === 409) {
          setRegStep(1);
          setEmailError(null);
          setError(j.error ?? "An account with this email already exists. Please sign in instead.");
          setAccountExists(true);
          return;
        }
        applyApiError(j.error ?? "Something went wrong");
        return;
      }
      if (j.needsVerification === false) {
        // Project has email confirmation off → we're signed in already.
        router.replace(redirect);
        router.refresh();
        return;
      }
      setScreen("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!validateAccountFields()) return;
    setInfo(null);
    setNeedsVerify(false);
    setLoading(true);
    // Sign-in does async work before navigating — show the top bar for it.
    routeProgress.start();
    try {
      const { res, j } = await postAuth({ action: "login", email, password });
      if (!res.ok) {
        if (j.needsVerification) setNeedsVerify(true);
        applyApiError(j.error ?? "Something went wrong");
        routeProgress.done();
        return;
      }
      router.replace(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      routeProgress.done();
    } finally {
      setLoading(false);
    }
  }

  // Send a password-reset link.
  async function sendForgot(e: React.FormEvent) {
    e.preventDefault();
    const eErr = applicantEmailError(email);
    setEmailError(eErr);
    if (eErr) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { res, j } = await postAuth({ action: "forgot", email });
      if (!res.ok) {
        applyApiError(j.error ?? "Could not send the reset email.");
        return;
      }
      setInfo("Reset link sent. Check your inbox (and spam) to set a new password.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset email.");
    } finally {
      setLoading(false);
    }
  }

  function openForgot() {
    setScreen("forgot");
    setError(null);
    setInfo(null);
    setEmailError(null);
    setPasswordError(null);
  }

  async function resendVerification() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { res, j } = await postAuth({ action: "resend", email });
      if (!res.ok) throw new Error(j.error ?? "Could not resend the email");
      setInfo("Verification email sent. Check your inbox (and spam).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend the email");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setRegStep(1);
    setScreen("form");
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setInfo(null);
    setNeedsVerify(false);
    setAccountExists(false);
  }

  // "Sign in instead" — keep the email/password the user already typed.
  function switchToSignIn() {
    setMode("login");
    setRegStep(1);
    setScreen("form");
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setAccountExists(false);
  }

  const inputClass =
    "mt-1.5 h-11 w-full rounded-lg border border-pasha-line bg-white px-3.5 text-sm focus-visible:outline-none focus-visible:border-pasha-red focus-visible:ring-2 focus-visible:ring-pasha-red/15";

  // ── "Check your email" screen ─────────────────────────────────────────────
  const verifyScreen = (
    <div className="text-center">
      <div className="mx-auto w-12 h-12 rounded-xl bg-green-600/10 grid place-items-center mb-5">
        <MailCheck className="w-6 h-6 text-green-700" />
      </div>
      <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">Verify your email</h1>
      <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
        We sent a verification link to <span className="font-medium text-pasha-ink">{email}</span>.
        Click it to activate your account, then sign in to start your application.
      </p>
      {info && <p className="mt-4 text-xs text-green-700">{info}</p>}
      {error && <p className="mt-4 text-xs text-pasha-red">{error}</p>}
      <button
        type="button"
        onClick={resendVerification}
        disabled={loading}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full border border-pasha-line bg-white px-5 py-2.5 text-sm font-medium text-pasha-ink hover:border-pasha-red hover:text-pasha-red transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Resend verification email
      </button>
      <button
        type="button"
        onClick={() => {
          setMode("login");
          setScreen("form");
          setRegStep(1);
          setInfo(null);
          setError(null);
        }}
        className="mt-3 text-sm font-medium text-pasha-red hover:text-pasha-red-dark transition-colors"
      >
        Back to sign in
      </button>
    </div>
  );

  // ── "Forgot password" screen ─────────────────────────────────────────────
  const forgotScreen = (
    info ? (
      // Confirmation screen after the reset link is sent.
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-green-600/10 grid place-items-center mb-5">
          <MailCheck className="w-6 h-6 text-green-700" />
        </div>
        <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">Email sent</h1>
        <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
          We&apos;ve sent a password reset link to{" "}
          <span className="font-medium text-pasha-ink">{email}</span>. Open it to set a new
          password. Don&apos;t forget to check your spam folder.
        </p>
        <button
          type="button"
          onClick={() => {
            setScreen("form");
            setMode("login");
            setError(null);
            setInfo(null);
            setEmailError(null);
          }}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors"
        >
          Back to sign in
        </button>
      </div>
    ) : (
      <>
        <div className="w-10 h-10 rounded-lg bg-pasha-red/10 grid place-items-center mb-5">
          <Rocket className="w-5 h-5 text-pasha-red" />
        </div>
        <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">Reset your password</h1>
        {linkExpired && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 leading-relaxed">
            That reset link couldn&apos;t be used — it may have already been opened, expired, or
            been opened on a different device than the one that requested it. Enter your email
            below and we&apos;ll send a fresh one.
          </p>
        )}
        <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
          Enter the email for your applicant account and we&apos;ll send a link to set a new
          password.
        </p>
        <form onSubmit={sendForgot} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-pasha-ink">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              required
              autoComplete="email"
              placeholder="you@startup.com"
              aria-invalid={emailError ? true : undefined}
              className={`${inputClass}${emailError ? " border-pasha-red focus-visible:border-pasha-red" : ""}`}
            />
            {emailError && <p className="mt-1.5 text-xs text-pasha-red">{emailError}</p>}
          </div>
          {error && (
            <div className="rounded-lg border border-pasha-red/30 bg-pasha-red/[0.04] p-3 flex items-start gap-2.5 text-xs text-pasha-red">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Send reset link
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setScreen("form");
            setMode("login");
            setError(null);
            setInfo(null);
            setEmailError(null);
          }}
          className="mt-4 block w-full text-center text-sm font-medium text-pasha-red hover:text-pasha-red-dark transition-colors"
        >
          Back to sign in
        </button>
      </>
    )
  );

  // ── Account fields (email + password) — shared by login and register step 1 ─
  const accountFields = (
    <>
      <div>
        <label className="text-sm font-medium text-pasha-ink">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          onBlur={() => {
            if (email.trim()) setEmailError(applicantEmailError(email));
          }}
          required
          autoComplete="email"
          placeholder="you@startup.com"
          aria-invalid={emailError ? true : undefined}
          className={`${inputClass}${emailError ? " border-pasha-red focus-visible:border-pasha-red" : ""}`}
        />
        {emailError && <p className="mt-1.5 text-xs text-pasha-red">{emailError}</p>}
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-pasha-ink">Password</label>
          {!isRegister && (
            <button
              type="button"
              onClick={openForgot}
              className="text-xs font-medium text-pasha-red hover:text-pasha-red-dark transition-colors"
            >
              Forgot password?
            </button>
          )}
        </div>
        <PasswordInput
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError(null);
          }}
          onBlur={() => {
            if (isRegister && password) setPasswordError(applicantPasswordError(password));
          }}
          required
          minLength={isRegister ? APPLICANT_MIN_PASSWORD_LENGTH : undefined}
          autoComplete={isRegister ? "new-password" : "current-password"}
          placeholder="••••••••"
          aria-invalid={passwordError ? true : undefined}
          wrapperClassName="mt-1.5"
          className={`${inputClass.replace("mt-1.5 ", "")}${passwordError ? " border-pasha-red focus-visible:border-pasha-red" : ""}`}
        />
        {passwordError ? (
          <p className="mt-1.5 text-xs text-pasha-red">{passwordError}</p>
        ) : isRegister ? (
          <p className="mt-1.5 text-xs text-pasha-muted">
            At least {APPLICANT_MIN_PASSWORD_LENGTH} characters.
          </p>
        ) : null}
      </div>
    </>
  );

  const errorBlock = error && (
    <div className="rounded-lg border border-pasha-red/30 bg-pasha-red/[0.04] p-3 flex items-start gap-2.5 text-xs text-pasha-red">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <div className="space-y-2">
        <span>{error}</span>
        {needsVerify && (
          <button
            type="button"
            onClick={resendVerification}
            disabled={loading}
            className="block font-medium underline underline-offset-2 hover:text-pasha-red-dark disabled:opacity-60"
          >
            Resend verification email
          </button>
        )}
        {accountExists && (
          <button
            type="button"
            onClick={switchToSignIn}
            className="block font-medium underline underline-offset-2 hover:text-pasha-red-dark"
          >
            Sign in instead
          </button>
        )}
      </div>
    </div>
  );

  let bodyContent: React.ReactNode;
  if (screen === "verify") {
    bodyContent = verifyScreen;
  } else if (screen === "forgot") {
    bodyContent = forgotScreen;
  } else if (isRegister && regStep === 2 && hasRegForm) {
    // Step 2 — the admin-configured §3 startup-basics fields.
    bodyContent = (
      <>
        <button
          type="button"
          onClick={() => {
            form.clearErrors();
            setRegStep(1);
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 text-sm text-pasha-muted hover:text-pasha-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to account details
        </button>
        <div className="mt-3">
          <h1 className="font-serif text-2xl tracking-tight text-pasha-ink">A few startup basics</h1>
          <p className="mt-1.5 text-sm text-pasha-muted leading-relaxed">
            You can complete the full profile after you create your account.
          </p>
        </div>
        <FormProvider {...form}>
          <OptionListsProvider value={optionLists}>
            <form
              onSubmit={(e) => e.preventDefault()}
              noValidate
              className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6"
            >
              {registrationConfig!.flatMap((section) =>
                section.fields.map((field) => (
                  <div key={field.id} className={registrationFieldSpan(field)}>
                    <DynamicField field={field} />
                    {field.field_key === "terms_accepted" && (
                      <button
                        type="button"
                        onClick={() => setTermsOpen(true)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-pasha-red hover:text-pasha-red-dark underline-offset-2 hover:underline"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View privacy & data-usage agreement
                      </button>
                    )}
                  </div>
                ))
              )}
              <TermsModal
                open={termsOpen}
                onClose={() => setTermsOpen(false)}
                title={terms?.title}
                body={terms?.body}
              />
              <div className="sm:col-span-2 space-y-4">
                {errorBlock}
                <button
                type="button"
                disabled={loading}
                onClick={() => form.handleSubmit((data) => submitRegister(data))()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </button>
              </div>
            </form>
          </OptionListsProvider>
        </FormProvider>
      </>
    );
  } else {
    // Login, or register step 1 (account details).
    bodyContent = (
      <>
        <div className="w-10 h-10 rounded-lg bg-pasha-red/10 grid place-items-center mb-5">
          <Rocket className="w-5 h-5 text-pasha-red" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-pasha-ink">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-pasha-muted leading-relaxed">
          {isRegister
            ? "Create an account to start your application. Save your progress and finish anytime."
            : "Sign in to continue your application. You can pick up right where you left off."}
        </p>

        <form
          onSubmit={isRegister ? continueFromAccount : submitLogin}
          className="mt-6 space-y-4"
        >
          {accountFields}
          {errorBlock}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-pasha-red px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-pasha-red-dark transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRegister ? "Please wait…" : "Signing in…"}
              </>
            ) : isRegister ? (
              hasRegForm ? (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                "Create account"
              )
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-pasha-muted">
          {isRegister ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-medium text-pasha-red hover:text-pasha-red-dark transition-colors"
          >
            {isRegister ? "Sign in" : "Create an account"}
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-pasha-stone/30">
        <div
          className={cn(
            "mx-auto w-full px-4 sm:px-8 py-12 sm:py-16",
            isRegistrationStep ? "max-w-3xl" : "max-w-md"
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
              "rounded-2xl border border-pasha-line bg-white shadow-sm",
              isRegistrationStep ? "p-5 sm:p-8 lg:p-10" : "p-6 sm:p-8"
            )}
          >
            {bodyContent}
            {captchaConfigured && (
              <div
                className={cn(
                  "mt-5 flex justify-center",
                  !captchaNeeded && "hidden"
                )}
              >
                <CaptchaWidget ref={captchaRef} onToken={setCaptchaToken} />
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function ApplyAuthForm({
  registrationConfig = null,
  optionLists = {},
  terms,
}: {
  registrationConfig?: FormConfig | null;
  optionLists?: OptionRegistry;
  terms?: { title: string; body: string };
}) {
  return (
    <Suspense fallback={null}>
      <AuthInner
        registrationConfig={registrationConfig}
        optionLists={optionLists}
        terms={terms}
      />
    </Suspense>
  );
}
