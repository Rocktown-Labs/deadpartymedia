"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Main Content */}
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6 max-w-2xl">
          <div className="text-center mb-16">
            <div className="w-24 h-1 bg-[#7CFC00] mx-auto mb-8"></div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-8">Contact us</h1>
            <p className="text-lg text-gray-400">
              Have a comment, question or submission? Then you've found the right place!
            </p>
          </div>

          <Card className="bg-[#111111] border-gray-800 p-8">
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <input
                    type="text"
                    placeholder="First name (required)"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#7CFC00] focus:outline-none text-white placeholder-gray-500"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Last name (required)"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#7CFC00] focus:outline-none text-white placeholder-gray-500"
                    required
                  />
                </div>
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email (required)"
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#7CFC00] focus:outline-none text-white placeholder-gray-500"
                  required
                />
              </div>
              <div>
                <textarea
                  placeholder="Message"
                  rows={6}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-700 rounded focus:border-[#7CFC00]  focus:outline-none text-white placeholder-gray-500 resize-none"
                ></textarea>
              </div>
              <div className="text-center">
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded">Send</Button>
              </div>
            </form>
          </Card>
        </div>
      </main>

    </div>
  )
}
