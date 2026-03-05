"use client";

import { useEffect } from "react";
import { useDashboardStats } from "@/lib/api/user-activity";
import type { DashboardStats } from "@/lib/api/user-activity";
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
import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Default stats for new users

  const defaultStats: DashboardStats = {
    articles_read_count: 0,
    articles_saved_count: 0,
    comments_count: 0,
  };

  // Use default stats if no error and no data (new user)

  const displayStats = stats || (!error ? defaultStats : null);

  // Comprehensive error logging

  useEffect(() => {
    if (error) {
      // Log to Sentry for error monitoring

      Sentry.captureException(error, {
        extra: {
          errorMessage: error.message,
          errorStack: error.stack,
          userId: user?.id,
          userRole: user?.publicMetadata?.role,
        },
        tags: {
          component: "dashboard",
          route: "fan-dashboard",
        },
      });

      // Track error event in PostHog

      posthog.capture("dashboard_stats_error", {
        error_message: error.message,
        error_type: error.name || "Unknown",
        user_id: user?.id,
        user_role: user?.publicMetadata?.role || "unknown",
      });
    } else if (!stats && !isLoading) {
      // Track new user scenario (not an error, but useful for analytics)

      posthog.capture("dashboard_stats_empty", {
        is_new_user: true,
        user_id: user?.id,
        user_role: user?.publicMetadata?.role || "unknown",
      });
    } else if (stats) {
      // Track successful dashboard load

      posthog.capture("dashboard_stats_loaded", {
        articles_read: stats.articles_read_count,
        articles_saved: stats.articles_saved_count,
        comments_count: stats.comments_count,
        user_role: user?.publicMetadata?.role || "unknown",
      });
    }
  }, [error, stats, isLoading, user]);

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ["user", "stats"] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6">
            <div className="mb-8">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <Skeleton className="h-28 sm:h-32" />
              <Skeleton className="h-28 sm:h-32" />
              <Skeleton className="h-28 sm:h-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state only if there's an actual error

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <BookOpen className="w-12 h-12 text-gray-400" />
                </EmptyMedia>
                <EmptyTitle>Unable to load dashboard</EmptyTitle>
                <EmptyDescription>
                  There was an error loading your dashboard statistics. Please try again.
                </EmptyDescription>
              </EmptyHeader>
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleRetry}
                  className="bg-[#7CFC00] text-black hover:bg-[#6EE600]"
                >
                  Retry
                </Button>
              </div>
            </Empty>
          </div>
        </main>
      </div>
    );
  }

  // If no stats and no error, show dashboard with zero stats (new user)

  if (!displayStats) {
    // This shouldn't happen, but fallback
    return null;
  }

  const statsCards: {
    title: string;
    value: number;
    icon: typeof BookOpen;
    href: Route;
    color: string;
  }[] = [
    {
      color: "text-[#7CFC00]",
      href: "/dashboard/history" as Route,
      icon: BookOpen,
      title: "Articles Read",
      value: displayStats.articles_read_count,
    },
    {
      color: "text-[#9400D3]",
      href: "/dashboard/saved" as Route,
      icon: Bookmark,
      title: "Articles Saved",
      value: displayStats.articles_saved_count,
    },
    {
      color: "text-[#7CFC00]",
      href: "/dashboard/comments" as Route,
      icon: MessageSquare,
      title: "Comments Made",
      value: displayStats.comments_count,
    },
  ];

  const actionButtons: {
    title: string;
    description: string;
    icon: typeof History;
    href: Route;
  }[] = [
    {
      description: "View articles you've read",
      href: "/dashboard/history" as Route,
      icon: History,
      title: "Reading History",
    },
    {
      description: "Access your saved articles",
      href: "/dashboard/saved" as Route,
      icon: Bookmark,
      title: "Saved Articles",
    },
    {
      description: "View your comments and replies",
      href: "/dashboard/comments" as Route,
      icon: MessageSquare,
      title: "My Comments",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">Dashboard</h1>
            <p className="text-gray-400">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
            </p>
          </div>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-3 gap-3 md:gap-6">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.title} href={card.href}>
                  <div className="cursor-pointer rounded-lg border border-gray-800 bg-[#111111] p-3 transition-colors hover:border-[#7CFC00] sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Icon className={`h-5 w-5 sm:h-8 sm:w-8 ${card.color}`} />
                    </div>
                    <div className="mb-1 text-xl font-black sm:text-3xl">{card.value}</div>
                    <div className="text-[11px] leading-tight text-gray-400 sm:text-sm">
                      {card.title}
                    </div>
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
