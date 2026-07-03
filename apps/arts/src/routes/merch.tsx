import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { createSeoMeta } from "#/lib/seo.ts";

export const Route = createFileRoute("/merch")({
  component: MerchPage,
  head: () =>
    createSeoMeta({
      description:
        "Dead Party Arts merch and future artist-supporting collections for Arkansas visual culture.",
      path: "/merch",
      title: "Merch",
    }),
});

function MerchPage() {
  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto">
        <PageTitleHeader
          eyebrow="Storefront"
          title="MERCH"
          description="The arts collection is queued up for Fourthwall. This page is ready for the dedicated drop once the products are created."
        />

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-gray-800 bg-[#111111] p-6">
            <ShoppingBag className="size-10 text-[#7CFC00]" />
            <h2 className="mt-5 font-black text-2xl">Arts collection pending</h2>
            <p className="mt-3 text-gray-400 leading-7">
              We can plug in the same Fourthwall product/cart system from the web app here. Once a
              Dead Party Arts collection exists, this route can filter to that collection.
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-gray-800 bg-[#080808] p-8">
            <p className="font-black text-[#7CFC00] text-xs uppercase tracking-[0.28em]">
              Coming drop
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {["Prints", "Shirts", "Studio goods"].map((item) => (
                <div
                  key={item}
                  className="aspect-square rounded-lg border border-gray-800 bg-black p-4"
                >
                  <p className="font-black text-gray-300">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
