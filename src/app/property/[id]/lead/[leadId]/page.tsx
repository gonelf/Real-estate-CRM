"use client";

import { useState, useEffect, use } from "react";
import { Property, Lead } from "@/lib/types";
import { getProperty, getLead, addComment, deleteComment } from "@/lib/store";
import { PropertyStatusBadge, LeadStatusBadge } from "@/components/StatusBadge";
import CommentSection from "@/components/CommentSection";

export default function LeadPage({
  params,
}: {
  params: Promise<{ id: string; leadId: string }>;
}) {
  const { id, leadId } = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);

  useEffect(() => {
    const p = getProperty(id);
    if (p) setProperty(p);
    const l = getLead(id, leadId);
    if (l) setLead(l);
  }, [id, leadId]);

  function refresh() {
    const p = getProperty(id);
    if (p) setProperty(p);
    const l = getLead(id, leadId);
    if (l) setLead(l);
  }

  function handleAddComment(text: string) {
    addComment(id, leadId, text);
    refresh();
  }

  function handleDeleteComment(commentId: string) {
    deleteComment(id, leadId, commentId);
    refresh();
  }

  if (!property || !lead) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Lead not found.</p>
        <a href="/" className="text-sm text-slate-900 underline mt-2 inline-block">
          Back to properties
        </a>
      </div>
    );
  }

  return (
    <div>
      <a
        href={`/property/${id}`}
        className="text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4 inline-block"
      >
        &larr; Back to {property.address}
      </a>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
              <div className="flex-shrink-0">
                <LeadStatusBadge status={lead.status} />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {lead.email && <span>{lead.email}</span>}
              {lead.phone && <span>{lead.phone}</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0 self-start">
            <p className="text-xs text-slate-400">Property</p>
            <p className="text-sm font-medium text-slate-700">{property.address}</p>
            <div className="mt-1">
              <PropertyStatusBadge status={property.status} />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Lead added {new Date(lead.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <CommentSection
          comments={lead.comments}
          onAdd={handleAddComment}
          onDelete={handleDeleteComment}
        />
      </div>
    </div>
  );
}
