"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const GROUPS = [
  {
    label: "Overview",
    links: [
      { href: "/", label: "Dashboard" },
      { href: "/media", label: "AI media" },
      { href: "/votes", label: "Votes" },
    ],
  },
  { label: "Clients", links: [{ href: "/users", label: "All clients" }] },
  { label: "User permissions", links: [{ href: "/permissions", label: "Admin roles" }] },
  {
    label: "Access",
    links: [
      { href: "/domains", label: "Signup domains" },
      { href: "/whitelist", label: "Whitelisted emails" },
    ],
  },
  {
    label: "Prompts",
    links: [
      { href: "/chains", label: "Prompt chains" },
      { href: "/mix", label: "Chain mix" },
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
  { label: "Bugs", links: [{ href: "/bugs", label: "Bug reports", badge: "openBugs" }] },
];

// Left sidebar: each category is a collapsible group. The group holding the
// current page opens automatically; the others remember what you toggled.
export default function NavLinks({ counts = {} }) {
  const pathname = usePathname();
  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const activeGroup = GROUPS.find((g) => g.links.some((l) => isActive(l.href)))?.label;

  const [open, setOpen] = useState(() => new Set(activeGroup ? [activeGroup] : ["Overview"]));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    if (activeGroup) setOpen((s) => (s.has(activeGroup) ? s : new Set(s).add(activeGroup)));
  }, [pathname, activeGroup]);

  function toggle(label) {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
      <button
        type="button"
        className="sidebar-toggle"
        aria-expanded={mobileOpen}
        aria-controls="admin-menu"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        ☰ {mobileOpen ? "Close menu" : "Menu"}
      </button>
      <nav id="admin-menu" className="side-nav" aria-label="Admin">
        {GROUPS.map((g) => {
          const isOpen = open.has(g.label);
          const id = `grp-${g.label.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <div key={g.label} className={`side-group ${g.label === activeGroup ? "has-active" : ""}`}>
              <button
                type="button"
                className="side-group-btn"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => toggle(g.label)}
              >
                <span>{g.label}</span>
                <span className="chev" aria-hidden="true">
                  ▸
                </span>
              </button>
              {isOpen && (
                <ul id={id} className="side-links">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className={isActive(l.href) ? "active" : ""}
                        aria-current={isActive(l.href) ? "page" : undefined}
                      >
                        {l.label}
                        {l.badge && counts[l.badge] > 0 && <span className="side-badge">{counts[l.badge]}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
