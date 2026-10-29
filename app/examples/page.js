import ResourcePage from "@/app/components/ResourcePage";
import { RESOURCES } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const metadata = { title: RESOURCES.generation_examples.title };

export default function Page({ searchParams }) {
  return <ResourcePage resourceKey="generation_examples" searchParams={searchParams} />;
}
