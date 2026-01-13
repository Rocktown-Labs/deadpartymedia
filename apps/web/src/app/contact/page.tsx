"use client";

import { ArrowLeft, Instagram, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";

const INSTAGRAM_URL = "https://www.instagram.com/deadpartyy?igsh=MWJxZDdyMXF2MWd5MA==";

export default function ContactPage() {
  const handleInstagramClick = () => {
    posthog.capture("contact_instagram_clicked", {
      source: "contact_page",
    });
    window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer");
  };

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
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-8">
              Get in Touch
            </h1>
            <div className="w-24 h-1 bg-[#7CFC00] mx-auto mb-8"></div>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Have a comment, question, or submission? We'd love to hear from you!
            </p>
          </div>

          <Card className="bg-[#111111] border-gray-800 p-8 md:p-12">
            <div className="text-center space-y-8">
              {/* Instagram Icon */}
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center">
                  <Instagram className="w-12 h-12 text-white" />
                </div>
              </div>

              {/* Main Content */}
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-bold text-white">
                  Connect with us on Instagram
                </h2>
                <p className="text-gray-300 leading-relaxed text-lg max-w-2xl mx-auto">
                  The fastest way to reach us is through Instagram! Whether you're an artist looking
                  to get featured, have a story idea, want to submit an event, or just want to say
                  hello—we're all ears.
                </p>

                <div className="bg-[#0A0A0A] border border-gray-700 rounded-lg p-6 space-y-4">
                  <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">
                    What we're looking for:
                  </p>
                  <ul className="text-gray-300 space-y-2 text-left max-w-md mx-auto">
                    <li className="flex items-start">
                      <span className="text-[#7CFC00] mr-3">•</span>
                      <span>Artist submissions and features</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#7CFC00] mr-3">•</span>
                      <span>Event announcements and coverage</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#7CFC00] mr-3">•</span>
                      <span>Story ideas and collaborations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-[#7CFC00] mr-3">•</span>
                      <span>General questions and feedback</span>
                    </li>
                  </ul>
                </div>

                {/* Instagram Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleInstagramClick}
                    className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white font-bold px-8 py-6 text-lg rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    size="lg"
                  >
                    <Instagram className="w-6 h-6 mr-3" />
                    Follow us on Instagram
                    <ExternalLink className="w-5 h-5 ml-3" />
                  </Button>
                </div>

                <p className="text-gray-500 text-sm pt-4">
                  Click the button above to visit our Instagram profile and send us a DM
                </p>
              </div>
            </div>
          </Card>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              We typically respond within 24-48 hours. Looking forward to connecting with you! 🎵
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
