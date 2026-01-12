"use client";

import { useDashboardStats } from "@/lib/api/user-activity";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { BookOpen, Bookmark, MessageSquare, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import type { Route } from "next";

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { user } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <BookOpen className="w-12 h-12 text-gray-400" />
                </EmptyMedia>
                <EmptyTitle>Unable to load dashboard</EmptyTitle>
                <EmptyDescription>
                  There was an error loading your dashboard statistics. Please try refreshing the
                  page.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </main>
      </div>
    );
  }

  const statsCards: Array<{
    title: string;
    value: number;
    icon: typeof BookOpen;
    href: Route;
    color: string;
  }> = [
    {
      title: "Articles Read",
      value: stats.articles_read_count,
      icon: BookOpen,
      href: "/dashboard/history" as Route,
      color: "text-[#7CFC00]",
    },
    {
      title: "Articles Saved",
      value: stats.articles_saved_count,
      icon: Bookmark,
      href: "/dashboard/saved" as Route,
      color: "text-[#9400D3]",
    },
    {
      title: "Comments Made",
      value: stats.comments_count,
      icon: MessageSquare,
      href: "/dashboard/comments" as Route,
      color: "text-[#7CFC00]",
    },
  ];

  const actionButtons: Array<{
    title: string;
    description: string;
    icon: typeof History;
    href: Route;
  }> = [
    {
      title: "Reading History",
      description: "View articles you've read",
      icon: History,
      href: "/dashboard/history" as Route,
    },
    {
      title: "Saved Articles",
      description: "Access your saved articles",
      icon: Bookmark,
      href: "/dashboard/saved" as Route,
    },
    {
      title: "My Comments",
      description: "View your comments and replies",
      icon: MessageSquare,
      href: "/dashboard/comments" as Route,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">Dashboard</h1>
            <p className="text-gray-400">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.title} href={card.href}>
                  <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 hover:border-[#7CFC00] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <Icon className={`w-8 h-8 ${card.color}`} />
                    </div>
                    <div className="text-3xl font-black mb-1">{card.value}</div>
                    <div className="text-sm text-gray-400">{card.title}</div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-3 gap-4">
            {actionButtons.map((button) => {
              const Icon = button.icon;
              return (
                <Link key={button.title} href={button.href}>
                  <Button className="w-full h-auto p-6 flex flex-col items-start gap-3 bg-[#111111] border border-gray-800 hover:border-[#7CFC00] text-white">
                    <Icon className="w-6 h-6 text-[#7CFC00]" />
                    <div className="text-left">
                      <h3 className="font-bold text-base">{button.title}</h3>
                      <p className="text-sm text-gray-400">{button.description}</p>
                    </div>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
