"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(params.get("from") || "/");
      router.refresh();
    } else {
      setError("Wrong password — try again.");
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          Web<span>dog</span> Ledger
        </div>
        <div className="login-sub">Enter the password to open the dashboard.</div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn" type="submit" style={{ width: "100%" }}>
            Enter
          </button>
          {error && <div className="error-text">{error}</div>}
        </form>
      </div>
    </div>
  );
}
