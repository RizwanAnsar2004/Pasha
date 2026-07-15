"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "outline" | "solid" | "light" | "outline-light";

const VARIANT_CLS: Record<Variant, string> = {
  outline:
    "border border-pasha-ink/15 bg-white text-pasha-ink hover:bg-pasha-ink hover:text-white hover:border-pasha-ink",
  solid: "bg-pasha-red text-white border border-pasha-red hover:bg-pasha-red-dark hover:border-pasha-red-dark",
  light: "bg-white text-pasha-ink border border-white hover:bg-pasha-stone",
  "outline-light": "border border-white/25 bg-white/[0.06] text-white hover:bg-white hover:text-pasha-ink",
};

type CommonProps = {
  children: React.ReactNode;
  variant?: Variant;
  dot?: boolean;
  arrow?: boolean;
  className?: string;
};

type LinkProps = CommonProps & {
  href: string;
  onClick?: never;
  type?: never;
};

type ButtonProps = CommonProps & {
  href?: never;
  onClick?: () => void;
  type?: "button" | "submit";
};

export function PillButton(props: LinkProps | ButtonProps) {
  const { children, variant = "outline", dot = variant === "outline", arrow = true, className } = props;

  const content = (
    <>
      {dot && (
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pasha-red text-white"
        >
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      )}
      <span className="inline-flex items-center gap-2 whitespace-nowrap">{children}</span>
      {!dot && arrow && <ArrowUpRight className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} />}
    </>
  );

  const cls = cn(
    "group inline-flex items-center gap-2.5 rounded-full py-2.5 pl-2.5 pr-6 text-xs font-bold transition-all duration-300 hover:-translate-y-0.5",
    !dot && "pl-5",
    VARIANT_CLS[variant],
    className
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={cls}>
        {content}
      </Link>
    );
  }

  return (
    <button type={(props as ButtonProps).type ?? "button"} onClick={(props as ButtonProps).onClick} className={cls}>
      {content}
    </button>
  );
}
