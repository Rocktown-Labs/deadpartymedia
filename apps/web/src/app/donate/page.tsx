import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, HeartHandshake, DollarSign, ExternalLink, Sparkles } from "lucide-react";
import { PageTitleHeader } from "@/components/page-title-header";
import { getAbsoluteUrl, getSiteDefaults } from "@/lib/seo";

const { siteUrl, siteName } = getSiteDefaults();
const ogImage = `${siteUrl}/images/dead-party-logo-og.jpg`;

export const metadata: Metadata = {
  alternates: {
    canonical: getAbsoluteUrl("/donate"),
  },
  description:
    "Support Dead Party Media and Arkansas music journalists, photographers, and scene contributors via Cash App.",
  openGraph: {
    description: "Support Dead Party Media and Arkansas music journalists via Cash App.",
    images: [{ alt: "Support Dead Party Media", height: 630, url: ogImage, width: 1200 }],
    locale: "en_US",
    siteName,
    title: `Support the Scene | ${siteName}`,
    type: "website",
    url: getAbsoluteUrl("/donate"),
  },
  title: "Support Dead Party Media",
};

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <PageTitleHeader
            title="SUPPORT THE SCENE"
            description="Direct community tips to fund independent music journalism, live coverage, and local scene documentation"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {/* General Fund Card */}
            <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#7CFC00]/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#7CFC00]/10 border border-[#7CFC00]/30 flex items-center justify-center mb-6">
                  <DollarSign className="w-6 h-6 text-[#7CFC00]" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Dead Party General Fund</h2>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Funds web hosting, printing zines, show promotion, photographer equipment, and
                  maintaining the Arkansas music directory.
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-2">
                  Cash App Cashtag
                </span>
                <a
                  href="https://cash.app/$deadpartymedia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full py-3 px-6 rounded-xl bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-black uppercase tracking-wider text-sm transition-colors shadow-lg"
                >
                  Tip on Cash App ($deadpartymedia)
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            </div>

            {/* Writers & Photographers Tip Jar */}
            <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-6">
                  <HeartHandshake className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">
                  Writers & Photographers Tip Jar
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Every dollar sent here is distributed directly to our volunteer writers,
                  interviewers, and photographers who document Arkansas gigs and releases.
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-800">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-2">
                  Contributor Pool
                </span>
                <a
                  href="https://cash.app/$deadpartywriters"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-wider text-sm transition-colors shadow-lg"
                >
                  Tip Writers ($deadpartywriters)
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-center text-xs text-zinc-500">
            <Sparkles className="w-4 h-4 text-[#7CFC00] inline mr-1" />
            Dead Party Media operates as a grassroots DIY collective. We appreciate every
            contribution that keeps local Arkansas culture alive.
          </div>
        </div>
      </main>
    </div>
  );
}
