import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { getAbsoluteUrl } from "../lib/seo";

/**
 * Ported from apps/web/src/app/contact/page.tsx. The interactive submission
 * form (contact-page-client) arrives with the UI parity pass.
 */
export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    links: [{ href: getAbsoluteUrl("/contact"), rel: "canonical" }],
    meta: [
      {
        content:
          "Contact Dead Party Media for artist submissions, event coverage, story tips, and collaborations.",
        name: "description",
      },
      { title: "Contact | Dead Party Media" },
    ],
  }),
});

function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <Link className="mb-8 inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80" to="/">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Link>

      <h1 className="mb-4 text-4xl font-black">Contact</h1>
      <p className="mb-8 max-w-2xl text-gray-400">
        Artist submissions, event coverage requests, story tips, and collaborations — reach the Dead
        Party Media team.
      </p>

      <div className="rounded-md border border-white/10 p-6">
        <p className="mb-3 flex items-center gap-2 text-sm text-gray-300">
          <Mail className="h-4 w-4 text-[#7CFC00]" />
          Email the team:
        </p>
        <a className="text-[#7CFC00] underline" href="mailto:deadpartyplaylist@gmail.com">
          deadpartyplaylist@gmail.com
        </a>
      </div>
    </main>
  );
}
