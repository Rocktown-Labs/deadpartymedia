import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, DollarSign, ExternalLink, HeartHandshake } from "lucide-react";
import { getAbsoluteUrl } from "../lib/seo";

/**
 * Ported from apps/web/src/app/donate/page.tsx (content cards; the full
 * visual treatment arrives with the UI parity pass).
 */
export const Route = createFileRoute("/donate")({
  component: DonatePage,
  head: () => ({
    links: [{ href: getAbsoluteUrl("/donate"), rel: "canonical" }],
    meta: [
      {
        content:
          "Support Dead Party Media and Arkansas music journalists, photographers, and scene contributors via Cash App.",
        name: "description",
      },
      { title: "Support Dead Party Media" },
    ],
  }),
});

function DonatePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <Link className="mb-8 inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80" to="/">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Link>

      <h1 className="mb-2 text-4xl font-black">SUPPORT THE SCENE</h1>
      <p className="mb-12 max-w-2xl text-gray-400">
        Direct community tips to fund independent music journalism, live coverage, and local scene
        documentation
      </p>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7CFC00]/30 bg-[#7CFC00]/10">
              <DollarSign className="h-6 w-6 text-[#7CFC00]" />
            </div>
            <h2 className="mb-2 text-2xl font-black text-white">Dead Party General Fund</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Funds web hosting, printing zines, show promotion, photographer equipment, and
              maintaining the Arkansas music directory.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7CFC00]/30 bg-[#7CFC00]/10">
              <HeartHandshake className="h-6 w-6 text-[#7CFC00]" />
            </div>
            <h2 className="mb-2 text-2xl font-black text-white">Contributor Fund</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              Tips split directly with the writers, photographers, and scene contributors whose work
              keeps Arkansas music documented.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-10 flex items-center gap-2 text-sm text-gray-400">
        <ExternalLink className="h-4 w-4 text-[#7CFC00]" />
        Cash App contributions — the full page port (cashtag links + Sparkles card) lands with the
        UI parity pass.
      </p>
    </main>
  );
}
