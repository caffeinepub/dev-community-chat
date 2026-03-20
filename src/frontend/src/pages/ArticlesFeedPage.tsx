import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronLeft,
  Clock,
  MessageCircle,
  PenLine,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Article } from "../backend.d";
import { backendService as backend } from "../services/backendService";
import { formatArticleDate, getReadTime } from "../utils/articleUtils";
import { getAvatarColor, getInitials } from "../utils/chatUtils";

function ArticleCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="flex items-center gap-2 mt-4">
          <div className="w-7 h-7 rounded-full bg-gray-200" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  );
}

export default function ArticlesFeedPage() {
  const navigate = useNavigate();
  const sessionToken = localStorage.getItem("sessionToken");

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run on mount only
  useEffect(() => {
    if (!sessionToken) {
      navigate({ to: "/login" });
      return;
    }
    backend
      .getAllArticles()
      .then((data) => {
        const sorted = [...data].sort((a, b) =>
          Number(b.createdAt - a.createdAt),
        );
        setArticles(sorted);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 3 seconds
  useEffect(() => {
    pollingRef.current = setInterval(async () => {
      try {
        const data = await backend.getAllArticles();
        const sorted = [...data].sort((a, b) =>
          Number(b.createdAt - a.createdAt),
        );
        setArticles(sorted);
      } catch {
        // ignore
      }
    }, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.authorName.toLowerCase().includes(search.toLowerCase()),
  );

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
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="articles.link"
            onClick={() => navigate({ to: "/chat" })}
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: "#6B7280" }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Chat</span>
          </button>
          <div
            className="w-px h-5 hidden sm:block"
            style={{ background: "#E5E7EB" }}
          />
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "#25D366" }}
            >
              <MessageCircle className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span
              className="font-bold text-base hidden sm:inline"
              style={{ color: "#111827" }}
            >
              DevCommunity
            </span>
            <span
              className="font-semibold text-base"
              style={{ color: "#6B7280" }}
            >
              · Articles
            </span>
          </div>
        </div>
        <button
          type="button"
          data-ocid="articles.primary_button"
          onClick={() => navigate({ to: "/articles/new" })}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95"
          style={{ background: "#25D366" }}
        >
          <PenLine className="w-4 h-4" />
          <span>Write</span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Page title + search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: "#111827" }}
            >
              Articles Feed
            </h1>
            <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
              {loading
                ? "Loading..."
                : `${articles.length} article${
                    articles.length !== 1 ? "s" : ""
                  } from the community`}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "#9CA3AF" }}
            />
            <input
              data-ocid="articles.search_input"
              type="text"
              placeholder="Search articles or authors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-full text-sm outline-none transition-all"
              style={{
                background: "white",
                border: "1.5px solid #E5E7EB",
                color: "#111827",
              }}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div
            data-ocid="articles.loading_state"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            data-ocid="articles.empty_state"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(37,211,102,0.1)" }}
            >
              <BookOpen className="w-10 h-10" style={{ color: "#25D366" }} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-xl" style={{ color: "#111827" }}>
                {search ? "No articles found" : "No articles yet"}
              </h3>
              <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                {search
                  ? "Try a different search term"
                  : "Be the first to share your story with the community"}
              </p>
            </div>
            {!search && (
              <button
                type="button"
                data-ocid="articles.secondary_button"
                onClick={() => navigate({ to: "/articles/new" })}
                className="mt-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:brightness-110"
                style={{ background: "#25D366" }}
              >
                Write First Article
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filtered.map((article, i) => (
                <motion.article
                  key={article.id.toString()}
                  data-ocid={`articles.item.${i + 1}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group flex flex-col"
                  onClick={() =>
                    navigate({
                      to: "/articles/$articleId",
                      params: { articleId: article.id.toString() },
                    })
                  }
                >
                  {/* Cover image */}
                  {article.imageUrl ? (
                    <div className="h-44 overflow-hidden">
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div
                      className="h-44 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${getAvatarColor(article.title)}22, ${getAvatarColor(article.authorName)}33)`,
                      }}
                    >
                      <BookOpen
                        className="w-10 h-10 opacity-40"
                        style={{ color: getAvatarColor(article.title) }}
                      />
                    </div>
                  )}

                  {/* Card body */}
                  <div className="p-5 flex flex-col flex-1">
                    <h2
                      className="font-bold text-base leading-snug mb-2 line-clamp-2 group-hover:text-green-600 transition-colors"
                      style={{ color: "#111827" }}
                    >
                      {article.title}
                    </h2>
                    <p
                      className="text-sm leading-relaxed mb-4 flex-1 line-clamp-3"
                      style={{ color: "#6B7280" }}
                    >
                      {article.content.slice(0, 150)}
                      {article.content.length > 150 ? "…" : ""}
                    </p>

                    {/* Author + meta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{
                            background: getAvatarColor(article.authorName),
                          }}
                        >
                          {getInitials(article.authorName)}
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: "#374151" }}
                        >
                          {article.authorName}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "#9CA3AF" }}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{getReadTime(article.content)}</span>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between mt-3 pt-3"
                      style={{ borderTop: "1px solid #F3F4F6" }}
                    >
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>
                        {formatArticleDate(article.createdAt)}
                      </span>
                      <button
                        type="button"
                        data-ocid={`articles.secondary_button.${i + 1}`}
                        className="text-xs font-semibold transition-colors"
                        style={{ color: "#25D366" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({
                            to: "/articles/$articleId",
                            params: { articleId: article.id.toString() },
                          });
                        }}
                      >
                        Read More →
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

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
