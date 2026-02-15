"use client";

import { PropertyStatus, LeadStatus } from "@/lib/types";

const propertyStatusConfig: Record<PropertyStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-emerald-100 text-emerald-800" },
  cpcv: { label: "CPCV", className: "bg-amber-100 text-amber-800" },
  sold: { label: "Sold", className: "bg-red-100 text-red-800" },
};

const leadStatusConfig: Record<LeadStatus, { label: string; className: string }> = {
  good: { label: "Good", className: "bg-emerald-100 text-emerald-800" },
  maybe: { label: "Maybe", className: "bg-amber-100 text-amber-800" },
  bad: { label: "Bad", className: "bg-red-100 text-red-800" },
};

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  const config = propertyStatusConfig[status];
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = leadStatusConfig[status];
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
