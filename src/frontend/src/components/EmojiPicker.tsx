import { useEffect, useRef } from "react";

interface EmojiPickerProps {
  emojis: string[];
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({
  emojis,
  onSelect,
  onClose,
}: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="bg-white rounded-2xl shadow-card border p-3"
      style={{ borderColor: "#E5E7EB", width: "240px" }}
    >
      <div className="grid grid-cols-5 gap-1">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-xl hover:bg-gray-100 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
