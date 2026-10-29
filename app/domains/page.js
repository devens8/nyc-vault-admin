import ResourcePage from "@/app/components/ResourcePage";
import { RESOURCES } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const metadata = { title: RESOURCES.allowed_signup_domains.title };

export default function Page({ searchParams }) {
  return <ResourcePage resourceKey="allowed_signup_domains" searchParams={searchParams} />;
}
