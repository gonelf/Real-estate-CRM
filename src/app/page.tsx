"use client";

import { useState, useEffect, useMemo } from "react";
import { Property, PropertyStatus, LeadStatus } from "@/lib/types";
import { loadProperties, addProperty, updateProperty, deleteProperty, bulkAddLeads } from "@/lib/store";
import { PropertyStatusBadge } from "@/components/StatusBadge";
import PropertyForm from "@/components/PropertyForm";
import UploadProperties from "@/components/UploadProperties";

const PROPERTY_STATUS_ORDER: Record<PropertyStatus, number> = {
  available: 0,
  cpcv: 1,
  sold: 2,
};

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    setProperties(loadProperties());
  }, []);

  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties;

    if (statusFilter !== "all") {
      filtered = properties.filter((p) => p.status === statusFilter);
    }

    return filtered.sort((a, b) => PROPERTY_STATUS_ORDER[a.status] - PROPERTY_STATUS_ORDER[b.status]);
  }, [properties, statusFilter]);

  function handleAdd(data: { address: string; status: PropertyStatus; photos: string[] }) {
    addProperty(data.address, data.status, data.photos);
    setProperties(loadProperties());
    setShowForm(false);
  }

  function handleEdit(data: { address: string; status: PropertyStatus; photos: string[] }) {
    if (!editing) return;
    updateProperty(editing.id, data);
    setProperties(loadProperties());
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this property and all its leads?")) return;
    deleteProperty(id);
    setProperties(loadProperties());
  }

  function handleImportProperties(importedProperties: Array<{
    address: string;
    status: PropertyStatus;
    leads: Array<{ name: string; email: string; phone: string; status: LeadStatus; comment?: string }>;
  }>) {
    // Add each property with its leads
    importedProperties.forEach((prop) => {
      const newProperty = addProperty(prop.address, prop.status, []);
      if (newProperty && prop.leads.length > 0) {
        bulkAddLeads(newProperty.id, prop.leads);
      }
    });
    setProperties(loadProperties());
    setShowUpload(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filteredAndSortedProperties.length} of {properties.length} properties
          </p>
        </div>
        {!showForm && !editing && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Upload Excel
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              + Add Property
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter("available")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === "available"
              ? "bg-green-600 text-white"
              : "bg-green-50 text-green-700 hover:bg-green-100"
          }`}
        >
          Available
        </button>
        <button
          onClick={() => setStatusFilter("cpcv")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === "cpcv"
              ? "bg-amber-600 text-white"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          }`}
        >
          CPCV
        </button>
        <button
          onClick={() => setStatusFilter("sold")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            statusFilter === "sold"
              ? "bg-slate-600 text-white"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100"
          }`}
        >
          Sold
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <PropertyForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {editing && (
        <div className="mb-6">
          <PropertyForm property={editing} onSubmit={handleEdit} onCancel={() => setEditing(null)} />
        </div>
      )}

      {filteredAndSortedProperties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-slate-400">&#8962;</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {properties.length === 0 ? "No properties yet" : "No properties match filter"}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {properties.length === 0 ? "Add your first property to get started." : "Try a different filter."}
          </p>
          {properties.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              + Add Property
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedProperties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {property.photos.length > 0 ? (
                <div className="h-40 overflow-hidden">
                  <img
                    src={property.photos[0]}
                    alt={property.address}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-40 bg-slate-100 flex items-center justify-center">
                  <span className="text-4xl text-slate-300">&#8962;</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm leading-tight flex-1 min-w-0">
                    {property.address}
                  </h3>
                  <div className="flex-shrink-0">
                    <PropertyStatusBadge status={property.status} />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {property.leads.length} lead{property.leads.length !== 1 ? "s" : ""}
                  {property.photos.length > 0 &&
                    ` · ${property.photos.length} photo${property.photos.length !== 1 ? "s" : ""}`}
                </p>
                <div className="flex gap-2">
                  <a
                    href={`/property/${property.id}`}
                    className="flex-1 text-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    View
                  </a>
                  <button
                    onClick={() => setEditing(property)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
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

      {showUpload && (
        <UploadProperties
          onImport={handleImportProperties}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
