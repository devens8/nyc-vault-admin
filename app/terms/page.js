import ResourcePage from "@/app/components/ResourcePage";
import { RESOURCES } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const metadata = { title: RESOURCES.terms.title };

export default function Page({ searchParams }) {
  return <ResourcePage resourceKey="terms" searchParams={searchParams} />;
}
