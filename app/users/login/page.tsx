"use client";

import { FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { toast } from "sonner";

type LoginResponse = {
  message?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) {
        toast.error("NEXT_PUBLIC_API_URL is not set.");
        return;
      }

      const response = await api.post<LoginResponse>(
        "/users/login",
        { email, password },
        { baseURL: baseUrl },
      );
      const data = response.data;

      queryClient.setQueryData(["auth-status"], true);
      toast.success(data.message || "Login successful.");
      setEmail("");
      setPassword("");
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative flex items-center justify-center overflow-hidden bg-black px-8 py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#2c2c2c,transparent_45%)]" />
          <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-6 text-center">
            <svg
              className="mono-wordmark h-28 w-full max-w-md"
              viewBox="0 0 900 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="MONO"
            >
              <text x="50%" y="62%" textAnchor="middle">
                MONO
              </text>
            </svg>
            <p className="text-sm tracking-[0.2em] text-gray-400">
              CLOTHES DASHBOARD
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 md:p-8">
          <div className="w-full max-w-md p-6">
            <h1 className="text-2xl font-semibold text-gray-900">User Login</h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in using your account credentials.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-1">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div className="grid gap-1">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mono-wordmark text {
          fill: transparent;
          stroke: #f5f5f5;
          stroke-width: 2;
          stroke-dasharray: 1400;
          stroke-dashoffset: 1400;
          animation: mono-draw 3s ease-out forwards;
          font-size: 162px;
          font-family: "Times New Roman", "Georgia", serif;
          letter-spacing: 20px;
          font-weight: 700;
        }

        @keyframes mono-draw {
          0% {
            stroke-dashoffset: 1400;
            fill: transparent;
          }
          75% {
            stroke-dashoffset: 0;
            fill: transparent;
          }
          100% {
            stroke-dashoffset: 0;
            fill: #ffffff;
          }
        }
      `}</style>
    </section>
  );
}
