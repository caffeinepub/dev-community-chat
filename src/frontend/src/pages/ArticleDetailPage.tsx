import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Clock,
  Edit2,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Article } from "../backend.d";
import { backendService as backend } from "../services/backendService";
import { formatArticleDateFull, getReadTime } from "../utils/articleUtils";
import { getAvatarColor, getInitials } from "../utils/chatUtils";

export default function ArticleDetailPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const articleIdStr = (params as Record<string, string>).articleId;
  const sessionToken = localStorage.getItem("sessionToken") || "";
  const currentUsername = localStorage.getItem("currentUsername") || "";

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadArticle = async () => {
    try {
      const raw = await backend.getArticle(BigInt(articleIdStr));
      // Handle both direct null and ICP Option array
      const data = Array.isArray(raw) ? (raw[0] ?? null) : raw;
      setArticle(data as Article | null);
    } catch {
      setError("Failed to load article");
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load on mount
  useEffect(() => {
    if (!sessionToken) {
      navigate({ to: "/login" });
      return;
    }
    loadArticle().finally(() => setLoading(false));
  }, [articleIdStr]);

  // Poll every 5 seconds
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadArticle intentionally excluded
  useEffect(() => {
    pollingRef.current = setInterval(loadArticle, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleIdStr]);

  const handleDelete = async () => {
    if (!article) return;
    setDeleting(true);
    try {
      await backend.deleteArticle(sessionToken, article.id);
      navigate({ to: "/articles" });
    } catch {
      setError("Failed to delete article");
      setDeleting(false);
    }
  };

  const isAuthor = article?.authorName === currentUsername;

  if (loading) {
    return (
      <div
        data-ocid="article_detail.loading_state"
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F8FAFC" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "#25D366", borderTopColor: "transparent" }}
          />
          <p style={{ color: "#6B7280" }}>Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div
        data-ocid="article_detail.error_state"
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#F8FAFC" }}
      >
        <AlertTriangle className="w-12 h-12" style={{ color: "#EF4444" }} />
        <h2 className="font-bold text-xl" style={{ color: "#111827" }}>
          Article not found
        </h2>
        <p style={{ color: "#6B7280" }}>
          {error || "This article may have been deleted."}
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/articles" })}
          className="px-5 py-2 rounded-full text-sm font-medium text-white"
          style={{ background: "#25D366" }}
        >
          Back to Articles
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      {/* Top Nav */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 py-3"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <button
          type="button"
          data-ocid="article_detail.link"
          onClick={() => navigate({ to: "/articles" })}
          className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "#6B7280" }}
        >
          <ArrowLeft className="w-4 h-4" />
          All Articles
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#25D366" }}
          >
            <MessageCircle className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span
            className="font-bold text-sm hidden sm:inline"
            style={{ color: "#111827" }}
          >
            DevCommunity
          </span>
        </div>
        {isAuthor && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-ocid="article_detail.edit_button"
              onClick={() =>
                navigate({
                  to: "/articles/$articleId/edit",
                  params: { articleId: article.id.toString() },
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-gray-100"
              style={{ color: "#374151" }}
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              type="button"
              data-ocid="article_detail.delete_button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-red-50"
              style={{ color: "#EF4444" }}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        )}
      </header>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto px-4 md:px-8 py-10"
      >
        {/* Cover image */}
        <AnimatePresence>
          {article.imageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full rounded-2xl overflow-hidden mb-8 shadow-card"
              style={{ maxHeight: 420 }}
            >
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover"
                style={{ maxHeight: 420 }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title */}
        <h1
          className="text-3xl md:text-4xl font-extrabold leading-tight mb-6"
          style={{ color: "#111827" }}
        >
          {article.title}
        </h1>

        {/* Author + meta */}
        <div
          className="flex items-center justify-between pb-6 mb-8"
          style={{ borderBottom: "2px solid #F3F4F6" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ background: getAvatarColor(article.authorName) }}
            >
              {getInitials(article.authorName)}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: "#111827" }}>
                {article.authorName}
              </p>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                {formatArticleDateFull(article.createdAt)}
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 text-sm"
            style={{ color: "#9CA3AF" }}
          >
            <Clock className="w-4 h-4" />
            <span>{getReadTime(article.content)}</span>
          </div>
        </div>

        {/* Content */}
        <div
          className="prose prose-gray max-w-none"
          style={{ color: "#374151", lineHeight: 1.8 }}
        >
          {article.content.split("\n").map((para, i) => {
            const lineKey = `para-${i}`;
            return para.trim() ? (
              <p
                key={lineKey}
                className="mb-4 text-base"
                style={{ color: "#374151" }}
              >
                {para}
              </p>
            ) : (
              <br key={lineKey} />
            );
          })}
        </div>

        {/* Author footer */}
        <div
          className="mt-12 p-6 rounded-2xl flex items-center gap-4"
          style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
            style={{ background: getAvatarColor(article.authorName) }}
          >
            {getInitials(article.authorName)}
          </div>
          <div>
            <p className="font-bold" style={{ color: "#111827" }}>
              {article.authorName}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
              Member of DevCommunity
            </p>
          </div>
          {!isAuthor && (
            <div className="ml-auto">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                style={{ background: "rgba(37,211,102,0.1)", color: "#15803D" }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Community Article</span>
              </div>
            </div>
          )}
        </div>
      </motion.main>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent data-ocid="article_detail.dialog">
          <DialogHeader>
            <DialogTitle>Delete Article?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The article will be permanently
              removed from DevCommunity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              data-ocid="article_detail.cancel_button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              data-ocid="article_detail.confirm_button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer
        className="mt-16 py-8 text-center"
        style={{ borderTop: "1px solid #E5E7EB" }}
      >
        <p className="text-xs" style={{ color: "#9CA3AF" }}>
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-gray-600"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
