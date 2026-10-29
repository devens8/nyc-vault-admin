import Link from "next/link";
import { getAdminStatus } from "@/lib/auth";
import NavLinks from "./NavLinks";

export default async function AdminNav() {
  const { user, isAdmin, profile } = await getAdminStatus();
  const name = profile?.first_name || user?.email;

  return (
    <header className="nav">
      <div className="nav-top">
        <Link href="/" className="nav-brand">
          <span className="nav-lock" aria-hidden="true">⬡</span>
          <span className="nav-wordmark">
            LITTLE<span className="nav-dot">·</span>SPOTS
          </span>
          <span className="nav-badge">ADMIN</span>
        </Link>

        {user && (
          <div className="nav-access">
            <span className="nav-user" title={user.email}>
              {name}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="nav-btn">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
      {isAdmin && <NavLinks />}
    </header>
  );
}
