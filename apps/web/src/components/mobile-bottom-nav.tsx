import { Link } from "@tanstack/react-router";
import { Calendar, Home, Mic2, Music, ShoppingBag } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLocation } from "@tanstack/react-router";

export default function MobileBottomNav() {
  const pathname = useLocation({ select: (location) => location.pathname });

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/artist-dashboard")) {
    return null;
  }

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/music", icon: Music, label: "Music" },
    { href: "/events", icon: Calendar, label: "Events" },
    { href: "/merch", icon: ShoppingBag, label: "Merch" },
    { href: "/artists", icon: Mic2, label: "Artists" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-gray-800 lg:hidden">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-[#7CFC00]" : "text-gray-400",
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
