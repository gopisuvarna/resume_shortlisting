"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";

import ErrorAlert from "@/components/shared/ErrorAlert";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

type RegisterFormShellProps = Readonly<{
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconContainerClassName: string;
  cardClassName: string;
  buttonClassName: string;
  signInLinkClassName: string;
  signInHref: string;
  signInLabel: string;
  submitLabel: string;
  loadingLabel: string;
  error: string;
  onCloseError: () => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}>;

export default function RegisterFormShell(props: RegisterFormShellProps) {
  const {
    title,
    subtitle,
    icon,
    iconContainerClassName,
    cardClassName,
    buttonClassName,
    signInLinkClassName,
    signInHref,
    signInLabel,
    submitLabel,
    loadingLabel,
    error,
    onCloseError,
    loading,
    onSubmit,
    children,
  } = props;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={iconContainerClassName}>{icon}</div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            {title}
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">{subtitle}</p>
        </div>

        <div className={cardClassName}>
          {error && (
            <ErrorAlert
              message={error}
              onClose={onCloseError}
              className="mb-5"
            />
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {children}

            <button
              type="submit"
              disabled={loading}
              className={buttonClassName}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" /> {loadingLabel}
                </>
              ) : (
                submitLabel
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-600">
            {signInLabel}{" "}
            <Link href={signInHref} className={signInLinkClassName}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
