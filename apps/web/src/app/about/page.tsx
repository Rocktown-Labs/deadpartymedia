"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Main Content */}
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <div className="text-center mb-16">
            <div className="mb-8">
              <Image
                src="/images/dead-party-logo.png"
                alt="Dead Party Media Logo"
                width={150}
                height={150}
                className="mx-auto"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-8">
              What is Dead Party Media?
            </h1>
            <div className="w-24 h-1 bg-[#7CFC00] mx-auto"></div>
          </div>

          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-gray-300 leading-relaxed mb-8 text-lg">
              We are your premier destination for all things music in Arkansas! Whether you're
              looking for local rappers, country singers, hardcore bands or EDM DJs, we celebrate it
              all. Our mission is to shine an equal spotlight on every artist in the local scene
              ensuring everyone gets a chance to be seen and heard!
            </p>

            <p className="text-gray-300 leading-relaxed mb-8 text-lg">
              We are a collective of local artists, writers, journalists, musicians, editors and
              creatives. We use our creativity to highlight local music, artists and events. We'll
              keep you up-to-date with the local music buzz so you're never out of the loop when it
              comes to local talent!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
