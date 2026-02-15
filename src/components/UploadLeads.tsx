"use client";

import { useState, useRef, useCallback } from "react";
import { DetectedLead, LeadStatus } from "@/lib/types";

interface UploadLeadsProps {
  propertyId: string;
  onImport: (leads: { name: string; email: string; phone: string; status: LeadStatus }[]) => void;
  onClose: () => void;
}

type UploadState = "idle" | "uploading" | "preview" | "error";

export default function UploadLeads({ propertyId, onImport, onClose }: UploadLeadsProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState("");
  const [detectedLeads, setDetectedLeads] = useState<DetectedLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv",
      "application/csv",
    ];
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setError("Please upload an Excel (.xlsx, .xls) or CSV file.");
      setState("error");
      return;
    }

    setState("uploading");
    setError("");
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyId", propertyId);

      const response = await fetch("/api/upload-leads", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (data.leads.length === 0) {
        setError("No leads detected in this file. Try a different file.");
        setState("error");
        return;
      }

      setDetectedLeads(data.leads);
      setSelectedLeads(new Set(data.leads.map((_: DetectedLead, i: number) => i)));
      setState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
      setState("error");
    }
  }, [propertyId]);

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

  function toggleLead(index: number) {
    setSelectedLeads((prev) => {
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
    if (selectedLeads.size === detectedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(detectedLeads.map((_, i) => i)));
    }
  }

  function handleImport() {
    const leadsToImport = detectedLeads
      .filter((_, i) => selectedLeads.has(i))
      .map((l) => ({
        name: l.name,
        email: l.email,
        phone: l.phone,
        status: l.status,
      }));
    onImport(leadsToImport);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload Leads</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Excel (.xlsx, .xls) or CSV files supported
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
                Drag & drop your file here
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
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-slate-400 mt-4">
                Supports Excel and Google Sheets exports. AI will detect leads automatically.
              </p>
            </div>
          )}

          {state === "uploading" && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-700">
                Analyzing {fileName}...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                AI is detecting leads in your file
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
                    {detectedLeads.length} lead{detectedLeads.length !== 1 ? "s" : ""} detected
                  </p>
                  <p className="text-xs text-slate-500">from {fileName}</p>
                </div>
                <button
                  onClick={toggleAll}
                  className="text-xs text-slate-600 hover:text-slate-900 underline transition-colors"
                >
                  {selectedLeads.size === detectedLeads.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {detectedLeads.map((lead, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLeads.has(i)
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLeads.has(i)}
                      onChange={() => toggleLead(i)}
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {lead.email && (
                          <span className="text-xs text-slate-500">{lead.email}</span>
                        )}
                        {lead.phone && (
                          <span className="text-xs text-slate-500">{lead.phone}</span>
                        )}
                      </div>
                      {lead.address && (
                        <p className="text-xs text-slate-400 mt-0.5">{lead.address}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {state === "preview" && (
          <div className="flex items-center justify-between p-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              {selectedLeads.size} of {detectedLeads.length} selected
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
                disabled={selectedLeads.size === 0}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedLeads.size} Lead{selectedLeads.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
