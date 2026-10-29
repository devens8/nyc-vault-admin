"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  {
    label: "Content",
    links: [
      { href: "/", label: "Overview" },
      { href: "/media", label: "AI media" },
      { href: "/images", label: "Images" },
      { href: "/votes", label: "Votes" },
    ],
  },
  {
    label: "Prompts",
    links: [
      { href: "/chains", label: "Chains" },
      { href: "/mix", label: "Mix" },
      { href: "/terms", label: "Terms" },
      { href: "/examples", label: "Examples" },
    ],
  },
  {
    label: "LLM",
    links: [
      { href: "/requests", label: "Requests" },
      { href: "/responses", label: "Responses" },
      { href: "/models", label: "Models" },
      { href: "/providers", label: "Providers" },
    ],
  },
  {
    label: "Access",
    links: [
      { href: "/users", label: "Users" },
      { href: "/domains", label: "Domains" },
      { href: "/whitelist", label: "Whitelist" },
    ],
  },
];

export default function NavLinks() {
  const pathname = usePathname();
  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="nav-links" aria-label="Admin">
      {GROUPS.map((g) => (
        <div key={g.label} className="nav-group">
          <span className="nav-group-label">{g.label}</span>
          {g.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? "active" : ""}
              aria-current={isActive(l.href) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
