"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI, extractApiErrorMessage } from "@/lib/api";
import FormField from "@/components/ui/FormField";
import RegisterFormShell from "@/components/auth/RegisterFormShell";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.password2) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authAPI.registerApplicant(form);
      router.push("/auth/login?registered=1");
    } catch (error: unknown) {
      setError(
        extractApiErrorMessage(
          error,
          "Registration failed. Please try again.",
          true,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterFormShell
      title="Create Your Account"
      subtitle="Join and start applying for jobs"
      icon={
        <svg
          className="w-7 h-7 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      }
      iconContainerClassName="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-5 shadow-lg shadow-indigo-200/60"
      cardClassName="card p-7 sm:p-8"
      buttonClassName="w-full btn-primary py-3 text-base justify-center mt-1"
      signInHref="/auth/login"
      signInLabel="Already have an account?"
      signInLinkClassName="text-indigo-600 font-semibold hover:underline"
      submitLabel="Create Account"
      loadingLabel="Creating account…"
      error={error}
      onCloseError={() => setError("")}
      loading={loading}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First Name" required>
          <input
            type="text"
            required
            value={form.first_name}
            onChange={set("first_name")}
            placeholder="Riya"
            className="input"
            autoComplete="given-name"
          />
        </FormField>
        <FormField label="Last Name" required>
          <input
            type="text"
            required
            value={form.last_name}
            onChange={set("last_name")}
            placeholder="Sharma"
            className="input"
            autoComplete="family-name"
          />
        </FormField>
      </div>

      <FormField label="Email Address" required>
        <input
          type="email"
          required
          value={form.email}
          onChange={set("email")}
          placeholder="riya@example.com"
          className="input"
          autoComplete="email"
        />
      </FormField>

      <FormField label="Phone Number">
        <input
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          placeholder="+91 98765 43210"
          className="input"
          autoComplete="tel"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Password" required>
          <input
            type="password"
            required
            value={form.password}
            onChange={set("password")}
            placeholder="Min 8 characters"
            className="input"
            autoComplete="new-password"
          />
        </FormField>
        <FormField label="Confirm" required>
          <input
            type="password"
            required
            value={form.password2}
            onChange={set("password2")}
            placeholder="Repeat password"
            className="input"
            autoComplete="new-password"
          />
        </FormField>
      </div>
    </RegisterFormShell>
  );
}
