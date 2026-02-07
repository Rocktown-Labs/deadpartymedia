import Link from "next/link";
import type { Route } from "next";
import type { ComponentType, SVGProps } from "react";
import { ExternalLink } from "lucide-react";
import { AppleMusicIcon } from "@/components/ui/svgs/appleMusicIcon";
import { FacebookIcon } from "@/components/ui/svgs/facebookIcon";
import { InstagramIcon } from "@/components/ui/svgs/instagramIcon";
import { Reddit } from "@/components/ui/svgs/reddit";
import { Spotify } from "@/components/ui/svgs/spotify";
import { Threads } from "@/components/ui/svgs/threads";
import { Youtube } from "@/components/ui/svgs/youtube";

type SocialLink = {
  name: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const SOCIAL_LINKS: SocialLink[] = [
  { name: "Instagram", href: "https://www.instagram.com/deadpartyy", Icon: InstagramIcon },
  { name: "Facebook", href: "https://www.facebook.com/deadpartymedia", Icon: FacebookIcon },
  { name: "Threads", href: "https://www.threads.com/@deadpartyy", Icon: Threads },
  { name: "YouTube", href: "https://www.youtube.com/@DeadPartyMedia", Icon: Youtube },
  { name: "Reddit", href: "https://www.reddit.com/r/ArkansasMusic", Icon: Reddit },
  {
    name: "Spotify",
    href: "https://open.spotify.com/user/e7jciehecnifykwzhvjpkdtj0?si=1fdb6a6a5a274ee8&nd=1&dlsi=af196eeb88cb4e0b",
    Icon: Spotify,
  },
  {
    name: "Apple Music",
    href: "https://music.apple.com/us/playlist/the-dead-party-monthly-playlist/pl.u-4Jomaj3CJ8Mr348",
    Icon: AppleMusicIcon,
  },
  { name: "All Links", href: "https://linktr.ee/deadpartyy", Icon: ExternalLink },
];

const FOOTER_NAV_LINKS: Array<{ label: string; href: Route }> = [
  { label: "About", href: "/about" },
  { label: "Meet Our Writers", href: "/writers" },
  { label: "Contact", href: "/contact" },
];

const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

export default function Footer() {
  return (
    <>
      {/* Social/Connect Section */}
      <section className="py-20 px-6 border-t border-gray-800">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="text-sm tracking-[0.4em] text-gray-500 mb-4 uppercase font-bold">
              Stay Connected
            </div>
            <h2 className="text-4xl font-black tracking-tight">Follow The Scene</h2>
          </div>
          <div className="max-w-6xl mx-auto lg:overflow-x-auto lg:pb-4">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-6 justify-items-center lg:flex lg:flex-nowrap lg:gap-8 lg:w-fit lg:mx-auto mt-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="group text-center transition-all duration-300 hover:scale-105 lg:shrink-0 lg:w-24"
                  aria-label={social.name}
                  {...EXTERNAL_LINK_PROPS}
                >
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full border-2 border-gray-800 group-hover:border-[#7CFC00] flex items-center justify-center transition-all duration-300">
                    <social.Icon className="w-7 h-7 text-gray-400 group-hover:text-[#7CFC00] transition-colors" />
                  </div>
                  <span className="text-xs uppercase tracking-wider text-gray-500 group-hover:text-[#7CFC00] font-medium transition-colors">
                    {social.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Magazine Colophon Style */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="text-2xl font-black tracking-tighter mb-2">
                <span className="text-[#7CFC00]">DEAD</span>{" "}
                <span className="text-white">PARTY</span>{" "}
                <span className="text-purple-500">MEDIA</span>
              </div>

              <p className="text-sm text-gray-400 leading-relaxed">
                Celebrating and documenting Arkansas's diverse music scene since 2024.
              </p>
            </div>
            <div>
              <h3 className="text-xs tracking-[0.3em] text-gray-500 uppercase font-bold mb-4">
                Editorial
              </h3>
              <div className="space-y-2">
                {FOOTER_NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-gray-400 hover:text-[#7CFC00] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs tracking-[0.3em] text-gray-500 uppercase font-bold mb-4">
                Connect
              </h3>
              <div className="flex flex-wrap gap-4">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={`footer-${social.name}`}
                    href={social.href}
                    className="text-gray-400 hover:text-[#7CFC00] transition-colors"
                    aria-label={social.name}
                    {...EXTERNAL_LINK_PROPS}
                  >
                    <social.Icon className="w-6 h-6" />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
            <span>© {new Date().getFullYear()} Dead Party Media. All rights reserved.</span>
            <span className="tracking-wider uppercase">Little Rock, Arkansas</span>
          </div>
        </div>
      </footer>
    </>
  );
}
