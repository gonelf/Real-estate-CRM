"use client";

import { useState, useRef, useCallback } from "react";
import { PropertyStatus, LeadStatus } from "@/lib/types";
import { PropertyStatusBadge } from "@/components/StatusBadge";

interface ParsedLead {
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  comment: string;
}

interface ParsedProperty {
  address: string;
  status: PropertyStatus;
  leads: ParsedLead[];
}

interface UploadPropertiesProps {
  onImport: (properties: ParsedProperty[]) => void;
  onClose: () => void;
}

type UploadState = "idle" | "uploading" | "preview" | "error";

export default function UploadProperties({ onImport, onClose }: UploadPropertiesProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState("");
  const [properties, setProperties] = useState<ParsedProperty[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    const validExtensions = [".xlsx", ".xls"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setError("Please upload an Excel file (.xlsx or .xls).");
      setState("error");
      return;
    }

    setState("uploading");
    setError("");
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-properties", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (data.properties.length === 0) {
        setError("No properties with leads found in this file.");
        setState("error");
        return;
      }

      setProperties(data.properties);
      setSelectedProperties(new Set(data.properties.map((_: ParsedProperty, i: number) => i)));
      setState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setState("error");
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function toggleProperty(index: number) {
    setSelectedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedProperties.size === properties.length) {
      setSelectedProperties(new Set());
    } else {
      setSelectedProperties(new Set(properties.map((_, i) => i)));
    }
  }

  function handleImport() {
    const propertiesToImport = properties.filter((_, i) => selectedProperties.has(i));
    onImport(propertiesToImport);
  }

  const selectedLeadCount = properties
    .filter((_, i) => selectedProperties.has(i))
    .reduce((sum, p) => sum + p.leads.length, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload Properties</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Excel file with multiple sheets (one property per sheet)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {state === "idle" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                dragOver
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-300 hover:border-slate-400"
              }`}
            >
              <svg className="mx-auto mb-4 text-slate-400" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm font-medium text-slate-700 mb-1">
                Drag & drop your Excel file here
              </p>
              <p className="text-xs text-slate-500 mb-4">
                or click to browse
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mt-6 text-left max-w-md mx-auto bg-slate-50 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-700 mb-2">Expected format:</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Each sheet = one property</li>
                  <li>• Sheet name or first cell = property address</li>
                  <li>• Property status in sheet (available/cpcv/sold)</li>
                  <li>• Each row = one lead (name, email, phone)</li>
                  <li>• Row color = lead status (green=good, red=bad, other=maybe)</li>
                </ul>
              </div>
            </div>
          )}

          {state === "uploading" && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-700">
                Processing {fileName}...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Extracting properties and leads from sheets
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-red-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-red-600 mb-2">{error}</p>
              <button
                onClick={() => { setState("idle"); setError(""); }}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {state === "preview" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {properties.length} propert{properties.length !== 1 ? "ies" : "y"} detected
                  </p>
                  <p className="text-xs text-slate-500">from {fileName}</p>
                </div>
                <button
                  onClick={toggleAll}
                  className="text-xs text-slate-600 hover:text-slate-900 underline transition-colors"
                >
                  {selectedProperties.size === properties.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {properties.map((property, i) => (
                  <div
                    key={i}
                    className={`border rounded-lg transition-colors ${
                      selectedProperties.has(i)
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <label className="flex items-start gap-3 p-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProperties.has(i)}
                        onChange={() => toggleProperty(i)}
                        className="mt-0.5 rounded border-slate-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {property.address}
                          </h3>
                          <PropertyStatusBadge status={property.status} />
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                          {property.leads.length} lead{property.leads.length !== 1 ? "s" : ""}
                        </p>

                        {/* Show first 3 leads as preview */}
                        <div className="space-y-1">
                          {property.leads.slice(0, 3).map((lead, j) => (
                            <div
                              key={j}
                              className="bg-white rounded px-2 py-1.5 border border-slate-100"
                            >
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    lead.status === "good"
                                      ? "bg-green-500"
                                      : lead.status === "bad"
                                      ? "bg-red-500"
                                      : "bg-amber-500"
                                  }`}
                                />
                                <span className="font-medium text-slate-700">{lead.name}</span>
                                {lead.email && (
                                  <span className="text-slate-500">{lead.email}</span>
                                )}
                                {lead.phone && (
                                  <span className="text-slate-500">{lead.phone}</span>
                                )}
                              </div>
                              {lead.comment && (
                                <p className="text-xs text-slate-400 mt-1 pl-4 italic">
                                  {lead.comment}
                                </p>
                              )}
                            </div>
                          ))}
                          {property.leads.length > 3 && (
                            <p className="text-xs text-slate-400 pl-2">
                              +{property.leads.length - 3} more lead{property.leads.length - 3 !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {state === "preview" && (
          <div className="flex items-center justify-between p-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              {selectedProperties.size} propert{selectedProperties.size !== 1 ? "ies" : "y"} ({selectedLeadCount} lead{selectedLeadCount !== 1 ? "s" : ""}) selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selectedProperties.size === 0}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedProperties.size} Propert{selectedProperties.size !== 1 ? "ies" : "y"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
