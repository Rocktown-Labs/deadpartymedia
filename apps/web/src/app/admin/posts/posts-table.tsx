"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, CheckCircle2, FilePenLine } from "lucide-react";
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
import {
  approveDeletePost,
  bulkUpdatePostStatus,
  deletePost,
  denyDeletePost,
  requestDeletePost,
} from "./actions";

interface AdminPostRow {
  authorId: string;
  category: string;
  createdAt: string;
  deleteRequested: boolean;
  id: number;
  isCoverStory: boolean;
  status: "draft" | "published" | "archived";
  title: string;
}

interface PostsTableProps {
  currentOrder: "asc" | "desc";
  currentSearchParams: string;
  currentSort?: string;
  isSuperAdmin: boolean;
  page: number;
  posts: AdminPostRow[];
  totalCount: number;
  userId: string;
}

function BulkStatusButton({
  disabled,
  icon,
  label,
  status,
}: {
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  status: "draft" | "published" | "archived";
}) {
  return (
    <Button
      type="submit"
      name="status"
      value={status}
      variant={status === "published" ? "default" : "outline"}
      size="sm"
      disabled={disabled}
      className="gap-2"
    >
      {icon}
      {label}
    </Button>
  );
}

export function PostsTable({
  currentOrder,
  currentSearchParams,
  currentSort,
  isSuperAdmin,
  page,
  posts,
  totalCount,
  userId,
}: PostsTableProps) {
  const router = useRouter();
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();
  const searchParams = useMemo(() => new URLSearchParams(currentSearchParams), [currentSearchParams]);
  const selectedPostIdSet = useMemo(() => new Set(selectedPostIds), [selectedPostIds]);
  const visiblePostIds = posts.map((post) => post.id);
  const hasRows = posts.length > 0;
  const allVisibleSelected =
    visiblePostIds.length > 0 && visiblePostIds.every((id) => selectedPostIdSet.has(id));
  const selectedCount = selectedPostIds.length;

  const togglePost = (postId: number, checked: boolean) => {
    setSelectedPostIds((previous) =>
      checked ? [...new Set([...previous, postId])] : previous.filter((id) => id !== postId),
    );
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedPostIds((previous) => {
      if (!checked) {
        return previous.filter((id) => !visiblePostIds.includes(id));
      }
      return [...new Set([...previous, ...visiblePostIds])];
    });
  };

  const handleBulkStatusUpdate = (formData: FormData) => {
    formData.set("postIds", selectedPostIds.join(","));
    const nextStatus = formData.get("status");

    startTransition(async () => {
      try {
        await bulkUpdatePostStatus(formData);
        setSelectedPostIds([]);
        router.refresh();
        toast.success(
          `${selectedCount} post${selectedCount === 1 ? "" : "s"} moved to ${nextStatus}.`,
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update selected posts");
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111111]">
      <form
        action={handleBulkStatusUpdate}
        className="flex flex-col gap-3 border-b border-gray-800 bg-[#0A0A0A] px-4 py-3 md:flex-row md:items-center md:justify-between"
      >
        <input type="hidden" name="postIds" value={selectedPostIds.join(",")} />
        <p className="text-sm text-gray-400">
          {selectedCount === 0
            ? "Select posts to apply a bulk status update."
            : `${selectedCount} selected`}
        </p>
        <div className="flex flex-wrap gap-2">
          <BulkStatusButton
            disabled={selectedCount === 0 || isPending}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Publish"
            status="published"
          />
          <BulkStatusButton
            disabled={selectedCount === 0 || isPending}
            icon={<FilePenLine className="h-3.5 w-3.5" />}
            label="Draft"
            status="draft"
          />
          <BulkStatusButton
            disabled={selectedCount === 0 || isPending}
            icon={<Archive className="h-3.5 w-3.5" />}
            label="Archive"
            status="archived"
          />
        </div>
      </form>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-[#0A0A0A]">
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="w-12 px-6">
                <Checkbox
                  checked={allVisibleSelected}
                  disabled={!hasRows}
                  aria-label="Select all visible posts"
                  onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                />
              </TableHead>
              <TableHead>
                <AdminSortHeader
                  currentOrder={currentOrder}
                  currentSort={currentSort}
                  defaultSort="createdAt"
                  field="title"
                  label="Title"
                  pathname="/admin/posts"
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
                  pathname="/admin/posts"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead>
                <AdminSortHeader
                  currentOrder={currentOrder}
                  currentSort={currentSort}
                  defaultSort="createdAt"
                  field="category"
                  label="Category"
                  pathname="/admin/posts"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead>
                <AdminSortHeader
                  currentOrder={currentOrder}
                  currentSort={currentSort}
                  defaultSort="createdAt"
                  field="isCoverStory"
                  label="Cover Story"
                  pathname="/admin/posts"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead>
                <AdminSortHeader
                  currentOrder={currentOrder}
                  currentSort={currentSort}
                  defaultSort="createdAt"
                  field="createdAt"
                  label="Created"
                  pathname="/admin/posts"
                  searchParams={searchParams}
                />
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow className="border-gray-800">
                <TableCell colSpan={7} className="px-6 py-4 text-center text-gray-400">
                  No posts found
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id} className="border-gray-800 hover:bg-gray-900">
                  <TableCell className="px-6 py-4">
                    <Checkbox
                      checked={selectedPostIdSet.has(post.id)}
                      aria-label={`Select ${post.title}`}
                      onCheckedChange={(checked) => togglePost(post.id, checked === true)}
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="font-bold transition-colors hover:text-[#7CFC00]"
                    >
                      {post.title}
                    </Link>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${
                          post.status === "published"
                            ? "bg-green-500/20 text-green-400"
                            : post.status === "draft"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {post.status}
                      </span>
                      {post.deleteRequested && (
                        <Badge variant="destructive" className="text-xs">
                          Delete Requested
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-400">
                    {post.category}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {post.isCoverStory ? (
                      <span className="font-bold text-[#7CFC00]">★</span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/posts/${post.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      {post.deleteRequested && isSuperAdmin ? (
                        <>
                          <form action={approveDeletePost.bind(null, post.id)} className="inline">
                            <Button type="submit" variant="destructive" size="sm">
                              Approve Delete
                            </Button>
                          </form>
                          <form action={denyDeletePost.bind(null, post.id)} className="inline">
                            <Button type="submit" variant="outline" size="sm">
                              Deny
                            </Button>
                          </form>
                        </>
                      ) : isSuperAdmin ? (
                        <DeleteConfirm
                          action={deletePost.bind(null, post.id)}
                          title="Delete Post"
                          description={`Are you sure you want to delete "${post.title}"? This action cannot be undone.`}
                        />
                      ) : post.authorId === userId && !post.deleteRequested ? (
                        <form action={requestDeletePost.bind(null, post.id)} className="inline">
                          <Button type="submit" variant="outline" size="sm">
                            Request Delete
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination
        pathname="/admin/posts"
        searchParams={searchParams}
        page={page}
        totalItems={totalCount}
      />
    </div>
  );
}
