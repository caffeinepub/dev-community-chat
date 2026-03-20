import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Image, MessageCircle, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useFileUpload } from "../hooks/useFileUpload";
import { backendService as backend } from "../services/backendService";
import { extractErrorMessage } from "../utils/errorUtils";

export default function CreateArticlePage() {
  const navigate = useNavigate();
  const sessionToken = localStorage.getItem("sessionToken") || "";
  const { upload } = useFileUpload();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [contentError, setContentError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run on mount only
  useEffect(() => {
    if (!sessionToken) navigate({ to: "/login" });
  }, []);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await upload(file);
      setImageUrl(url);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    let valid = true;
    if (!title.trim()) {
      setTitleError("Title is required");
      valid = false;
    } else {
      setTitleError("");
    }
    if (!content.trim()) {
      setContentError("Content is required");
      valid = false;
    } else {
      setContentError("");
    }
    if (!valid) return;
    if (publishing) return;

    setPublishing(true);
    try {
      await backend.createArticle(
        sessionToken,
        title.trim(),
        content.trim(),
        imageUrl,
      );
      toast.success("Article published!");
      navigate({ to: "/articles" });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  };

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
          data-ocid="create_article.link"
          onClick={() => navigate({ to: "/articles" })}
          className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "#6B7280" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Articles
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "#25D366" }}
          >
            <MessageCircle className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="font-bold text-sm" style={{ color: "#111827" }}>
            DevCommunity
          </span>
        </div>
        <button
          type="button"
          data-ocid="create_article.submit_button"
          onClick={handlePublish}
          disabled={publishing}
          className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
          style={{ background: "#25D366" }}
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-2xl mx-auto px-4 md:px-8 py-10"
      >
        <h1
          className="text-2xl font-extrabold mb-8"
          style={{ color: "#111827" }}
        >
          Write a New Article
        </h1>

        {/* Image upload */}
        <div className="mb-6">
          {imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden shadow-card">
              <img
                src={imageUrl}
                alt="Cover"
                className="w-full object-cover"
                style={{ maxHeight: 280 }}
              />
              <button
                type="button"
                data-ocid="create_article.delete_button"
                onClick={() => setImageUrl(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-90"
                style={{ background: "rgba(0,0,0,0.55)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-ocid="create_article.upload_button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 py-10 transition-all border-2 border-dashed hover:border-green-400"
              style={{ borderColor: "#D1FAE5", background: "#F0FDF4" }}
            >
              {uploading ? (
                <>
                  <div
                    className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
                    style={{
                      borderColor: "#25D366",
                      borderTopColor: "transparent",
                    }}
                  />
                  <span className="text-sm" style={{ color: "#6B7280" }}>
                    Uploading image...
                  </span>
                </>
              ) : (
                <>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(37,211,102,0.15)" }}
                  >
                    <Image className="w-6 h-6" style={{ color: "#25D366" }} />
                  </div>
                  <div className="text-center">
                    <p
                      className="font-medium text-sm"
                      style={{ color: "#374151" }}
                    >
                      Add a cover image
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium"
                    style={{
                      background: "#25D366",
                      color: "white",
                    }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </div>
                </>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />
        </div>

        {/* Title */}
        <div className="mb-6">
          <input
            data-ocid="create_article.input"
            type="text"
            placeholder="Article title..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError("");
            }}
            className="w-full text-2xl font-bold outline-none border-0 border-b-2 pb-3 transition-colors bg-transparent"
            style={{
              color: "#111827",
              borderColor: titleError ? "#EF4444" : "#E5E7EB",
            }}
          />
          {titleError && (
            <p
              data-ocid="create_article.error_state"
              className="text-xs mt-1.5"
              style={{ color: "#EF4444" }}
            >
              {titleError}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="mb-8">
          <textarea
            data-ocid="create_article.textarea"
            placeholder="Tell your story..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (contentError) setContentError("");
            }}
            className="w-full outline-none resize-none text-base leading-relaxed bg-transparent"
            style={{
              minHeight: 320,
              color: "#374151",
              border: contentError ? "2px solid #EF4444" : "none",
              borderRadius: contentError ? 8 : 0,
              padding: contentError ? 8 : 0,
            }}
          />
          {contentError && (
            <p
              data-ocid="create_article.error_state"
              className="text-xs mt-1.5"
              style={{ color: "#EF4444" }}
            >
              {contentError}
            </p>
          )}
        </div>

        {/* Publish button (bottom) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="create_article.primary_button"
            onClick={handlePublish}
            disabled={publishing}
            className="px-8 py-3 rounded-full font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
            style={{ background: "#25D366" }}
          >
            {publishing ? "Publishing..." : "Publish Article"}
          </button>
          <button
            type="button"
            data-ocid="create_article.cancel_button"
            onClick={() => navigate({ to: "/articles" })}
            className="px-6 py-3 rounded-full font-medium transition-colors hover:bg-gray-100"
            style={{ color: "#6B7280" }}
          >
            Cancel
          </button>
        </div>
      </motion.main>
    </div>
  );
}
