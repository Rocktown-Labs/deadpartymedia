"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, CheckCircle2, FilePenLine, Disc, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminSortHeader } from "@/components/admin/admin-sort-header";
import { DeleteConfirm } from "@/components/admin/delete-confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkUpdateMusicReleaseStatus, deleteMusicRelease } from "./actions";

export interface AdminMusicReleaseRow {
  id: number;
  title: string;
  slug: string;
  artistName: string;
  releaseType: string;
  genre: string;
  releaseDate: string | null;
  coverArt: string | null;
  status: "draft" | "published" | "archived";
  featured: boolean;
  authorId: string;
  createdAt: string;
}

interface MusicReleasesTableProps {
  currentOrder: "asc" | "desc";
  currentSearchParams: string;
  currentSort?: string;
  isSuperAdmin: boolean;
  page: number;
  releases: AdminMusicReleaseRow[];
  totalCount: number;
  userId: string;
}

export function MusicReleasesTable({
  currentOrder,
  currentSearchParams,
  currentSort,
  isSuperAdmin,
  page,
  releases,
  totalCount,
  userId,
}: MusicReleasesTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  const allSelected = releases.length > 0 && selectedIds.length === releases.length;
  const searchParams = useMemo(
    () => new URLSearchParams(currentSearchParams),
    [currentSearchParams],
  );

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? releases.map((r) => r.id) : []);
  };

  const toggleItem = (id: number, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  };

  const handleBulkStatus = (status: "draft" | "published" | "archived") => {
    startTransition(async () => {
      try {
        await bulkUpdateMusicReleaseStatus(selectedIds, status);
        toast.success(`Updated ${selectedIds.length} release(s) to ${status}`);
        setSelectedIds([]);
        router.refresh();
      } catch {
        toast.error("Failed to update status");
      }
    });
  };

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
          <span className="text-xs text-zinc-400 font-mono mr-2">
            {selectedIds.length} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleBulkStatus("published")}
            className="gap-1 text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#7CFC00]" /> Publish
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleBulkStatus("draft")}
            className="gap-1 text-xs"
          >
            <FilePenLine className="w-3.5 h-3.5" /> Draft
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleBulkStatus("archived")}
            className="gap-1 text-xs"
          >
            <Archive className="w-3.5 h-3.5 text-red-400" /> Archive
          </Button>
        </div>
      )}

      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-950">
            <TableRow className="border-gray-800">
              <TableHead className="w-12 px-4">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                  aria-label="Select all releases"
                />
              </TableHead>
              <TableHead className="w-16">Art</TableHead>
              <TableHead>
                <AdminSortHeader
                  currentOrder={currentOrder}
                  currentSort={currentSort}
                  defaultSort="createdAt"
                  field="title"
                  label="Title & Type"
                  pathname="/admin/music"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead>
                <AdminSortHeader
                  currentOrder={currentOrder}
                  currentSort={currentSort}
                  defaultSort="createdAt"
                  field="artistName"
                  label="Artist"
                  pathname="/admin/music"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead>
                <AdminSortHeader
                  currentOrder={currentOrder}
                  currentSort={currentSort}
                  defaultSort="createdAt"
                  field="genre"
                  label="Genre"
                  pathname="/admin/music"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead>
                <AdminSortHeader
                  currentOrder={currentOrder}
                  currentSort={currentSort}
                  defaultSort="createdAt"
                  field="status"
                  label="Status"
                  pathname="/admin/music"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead>
                <AdminSortHeader
                  currentOrder={currentOrder}
                  currentSort={currentSort}
                  defaultSort="createdAt"
                  field="releaseDate"
                  label="Release Date"
                  pathname="/admin/music"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead className="text-right px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {releases.length === 0 ? (
              <TableRow className="border-gray-800">
                <TableCell colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  No music releases found. Click &quot;Create New Release&quot; to add your first
                  record or single.
                </TableCell>
              </TableRow>
            ) : (
              releases.map((release) => (
                <TableRow key={release.id} className="border-gray-800 hover:bg-zinc-900/50">
                  <TableCell className="px-4">
                    <Checkbox
                      checked={selectedIds.includes(release.id)}
                      onCheckedChange={(checked) => toggleItem(release.id, checked === true)}
                      aria-label={`Select ${release.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative w-10 h-10 rounded bg-zinc-900 overflow-hidden border border-zinc-800">
                      {release.coverArt ? (
                        <img
                          src={release.coverArt}
                          alt={release.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Disc className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/music/${release.id}` as Route}
                        className="font-bold text-white hover:text-[#7CFC00] transition-colors"
                      >
                        {release.title}
                      </Link>
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-[#7CFC00] border border-[#7CFC00]/20">
                        {release.releaseType}
                      </span>
                      {release.featured && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-500/30">
                          Featured
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-300">{release.artistName}</TableCell>
                  <TableCell className="text-zinc-400 text-xs">{release.genre}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        release.status === "published"
                          ? "default"
                          : release.status === "draft"
                            ? "secondary"
                            : "destructive"
                      }
                      className="capitalize"
                    >
                      {release.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs font-mono">
                    {release.releaseDate || "-"}
                  </TableCell>
                  <TableCell className="text-right px-4">
                    <div className="flex items-center justify-end gap-2">
                      {release.status === "published" && (
                        <Link
                          href={`/music/${release.slug}` as Route}
                          target="_blank"
                          className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                          title="View on site"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                      <Link href={`/admin/music/${release.id}` as Route}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      {(isSuperAdmin || release.authorId === userId) && (
                        <DeleteConfirm
                          action={deleteMusicRelease.bind(null, release.id)}
                          title="Delete Music Release"
                          description={`Are you sure you want to delete "${release.title}"? This action cannot be undone.`}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        pathname="/admin/music"
        searchParams={searchParams}
        page={page}
        totalItems={totalCount}
      />
    </div>
  );
}
