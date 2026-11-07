import { Link } from "@tanstack/react-router";
import { Heart, Mail } from "lucide-react";

/**
 * Ported from apps/web/src/components/footer.tsx — same link groups and
 * supporter CTA.
 */
const COLUMNS = [
  {
    heading: "Content",
    links: [
      { label: "Articles", to: "/articles" },
      { label: "Artists", to: "/artists" },
      { label: "Events", to: "/events" },
      { label: "Music", to: "/music" },
      { label: "Venues", to: "/venues" },
    ],
  },
  {
    heading: "Shop",
    links: [{ label: "Merch", to: "/merch" }],
  },
  {
    heading: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Writers", to: "/writers" },
      { label: "Support the Scene", to: "/donate" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0A0A0A]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <p className="font-black tracking-tight text-white">
              DEAD PARTY <span className="text-[#7CFC00]">MEDIA</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-gray-400">
              Your #1 digital outlet for Arkansas music and live events.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h3 className="mb-3 text-sm font-bold text-white">{column.heading}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link className="text-sm text-gray-400 hover:text-[#7CFC00]" to={link.to}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Dead Party Media. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <a
              className="flex items-center gap-1 hover:text-[#7CFC00]"
              href="mailto:deadpartyplaylist@gmail.com"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact
            </a>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-[#7CFC00]" />
              Made in Arkansas
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
