"use client";

import { useState } from "react";
import { Comment } from "@/lib/types";

interface CommentSectionProps {
  comments: Comment[];
  onAdd: (text: string) => void;
  onDelete: (commentId: string) => void;
}

export default function CommentSection({ comments, onAdd, onDelete }: CommentSectionProps) {
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-900">Comments ({comments.length})</h3>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          Add
        </button>
      </form>

      {comments.length === 0 ? (
        <p className="text-sm text-slate-500">No comments yet.</p>
      ) : (
        <div className="space-y-2">
          {[...comments].reverse().map((comment) => (
            <div
              key={comment.id}
              className="flex items-start justify-between gap-2 bg-slate-50 rounded-lg p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{comment.text}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => onDelete(comment.id)}
                className="text-slate-400 hover:text-red-500 text-sm flex-shrink-0 transition-colors"
                title="Delete comment"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
