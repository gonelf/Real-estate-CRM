"use client";

import { useState } from "react";
import { LeadStatus, Lead } from "@/lib/types";

interface LeadFormProps {
  lead?: Lead;
  onSubmit: (data: { name: string; email: string; phone: string; status: LeadStatus }) => void;
  onCancel: () => void;
}

export default function LeadForm({ lead, onSubmit, onCancel }: LeadFormProps) {
  const [name, setName] = useState(lead?.name ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [phone, setPhone] = useState(lead?.phone ?? "");
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? "maybe");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim(), status });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">
        {lead ? "Edit Lead" : "Add Lead"}
      </h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 234 567 890"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <div className="flex gap-2">
          {(["good", "maybe", "bad"] as LeadStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                status === s
                  ? s === "good"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : s === "maybe"
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "border-red-500 bg-red-50 text-red-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "good" ? "Good" : s === "maybe" ? "Maybe" : "Bad"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          {lead ? "Save Changes" : "Add Lead"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
