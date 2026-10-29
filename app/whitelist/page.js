import ResourcePage from "@/app/components/ResourcePage";
import { RESOURCES } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const metadata = { title: RESOURCES.whitelisted_emails.title };

export default function Page({ searchParams }) {
  return <ResourcePage resourceKey="whitelisted_emails" searchParams={searchParams} />;
}
