"use client";

import { useState, useEffect, use } from "react";
import { Property, LeadStatus } from "@/lib/types";
import { getProperty, addLead, updateLead, deleteLead } from "@/lib/store";
import { PropertyStatusBadge, LeadStatusBadge } from "@/components/StatusBadge";
import LeadForm from "@/components/LeadForm";

export default function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    const p = getProperty(id);
    if (p) setProperty(p);
  }, [id]);

  function refresh() {
    const p = getProperty(id);
    if (p) setProperty(p);
  }

  function handleAddLead(data: { name: string; email: string; phone: string; status: LeadStatus }) {
    addLead(id, data.name, data.email, data.phone, data.status);
    refresh();
    setShowForm(false);
  }

  function handleEditLead(data: { name: string; email: string; phone: string; status: LeadStatus }) {
    if (!editingLeadId) return;
    updateLead(id, editingLeadId, data);
    refresh();
    setEditingLeadId(null);
  }

  function handleDeleteLead(leadId: string) {
    if (!confirm("Delete this lead and all its comments?")) return;
    deleteLead(id, leadId);
    refresh();
  }

  if (!property) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Property not found.</p>
        <a href="/" className="text-sm text-slate-900 underline mt-2 inline-block">
          Back to properties
        </a>
      </div>
    );
  }

  const editingLead = editingLeadId ? property.leads.find((l) => l.id === editingLeadId) : undefined;

  return (
    <div>
      <a href="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4 inline-block">
        &larr; Back to properties
      </a>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        {property.photos.length > 0 && (
          <div className="relative h-64">
            <img
              src={property.photos[photoIndex]}
              alt={property.address}
              className="w-full h-full object-cover"
            />
            {property.photos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {property.photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === photoIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{property.address}</h1>
              <p className="text-xs text-slate-400 mt-1">
                Added {new Date(property.createdAt).toLocaleDateString()}
              </p>
            </div>
            <PropertyStatusBadge status={property.status} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Leads</h2>
          <p className="text-sm text-slate-500">{property.leads.length} total</p>
        </div>
        {!showForm && !editingLeadId && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            + Add Lead
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4">
          <LeadForm onSubmit={handleAddLead} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {editingLead && (
        <div className="mb-4">
          <LeadForm lead={editingLead} onSubmit={handleEditLead} onCancel={() => setEditingLeadId(null)} />
        </div>
      )}

      {property.leads.length === 0 && !showForm ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <h3 className="text-base font-semibold text-slate-900 mb-1">No leads yet</h3>
          <p className="text-sm text-slate-500 mb-4">Add leads for this property.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            + Add Lead
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {property.leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{lead.name}</h3>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {lead.email && <span>{lead.email}</span>}
                    {lead.phone && <span>{lead.phone}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {lead.comments.length} comment{lead.comments.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={`/property/${id}/lead/${lead.id}`}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Open
                  </a>
                  <button
                    onClick={() => setEditingLeadId(lead.id)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteLead(lead.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
