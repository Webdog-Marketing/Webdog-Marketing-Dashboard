"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Overview" },
  { href: "/clients", label: "Clients & capacity" },
  { href: "/time", label: "Time" },
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenditure" },
  { href: "/tech-stack", label: "Tech stack" },
  { href: "/tasks", label: "Tasks (Trello)" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        Web<span>dog</span> Ledger
      </div>
      {links.map((l) => {
        const isActive = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`nav-link ${isActive ? "active" : ""}`}>
            {l.label}
          </Link>
        );
      })}
      <div className="sidebar-foot">
        Webdog Marketing
        <form
          onSubmit={(e) => {
            e.preventDefault();
            logout();
          }}
        >
          <button type="submit">Log out</button>
        </form>
      </div>
    </aside>
  );
}
