"use client";

import React, { useEffect, useState } from "react";
import { documentsApi } from "../services/api";
import type { DocumentDTO } from "../services/types";

interface LoadedDoc extends DocumentDTO {
  url: string | null; // object URL for the authenticated blob
}

/** Shows the evidence (photos + PDFs) a client uploaded for a claim. */
export default function EvidenceGallery({ claimId }: { claimId: string }) {
  const [docs, setDocs] = useState<LoadedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LoadedDoc | null>(null);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];

    (async () => {
      setLoading(true);
      setError(null);
      const res = await documentsApi.list(claimId);
      if (!res.ok || !res.data) {
        if (!cancelled) {
          setError(res.error || "Could not load evidence.");
          setLoading(false);
        }
        return;
      }
      const loaded = await Promise.all(
        res.data.map(async (d) => {
          const blob = await documentsApi.fetchBlob(d.id);
          const url = blob ? URL.createObjectURL(blob) : null;
          if (url) created.push(url);
          return { ...d, url };
        })
      );
      if (!cancelled) {
        setDocs(loaded);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [claimId]);

  const images = docs.filter((d) => d.kind === "image");
  const files = docs.filter((d) => d.kind !== "image");

  return (
    <div className="p-3.5 bg-[#f8f9ff] border border-[#e5eeff] rounded-xl text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-[#0b1c30] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#4059aa]">photo_library</span>
          Uploaded Evidence
        </span>
        {!loading && !error && (
          <span className="text-[11px] text-[#45464d]">
            {images.length} photo{images.length === 1 ? "" : "s"} • {files.length} document
            {files.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading && <p className="text-[#76777d]">Loading evidence…</p>}
      {error && <p className="text-[#ba1a1a] font-semibold">{error}</p>}
      {!loading && !error && docs.length === 0 && (
        <p className="text-[#76777d]">No evidence has been uploaded for this claim.</p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {images.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => d.url && setPreview(d)}
              className="group relative aspect-square rounded-lg overflow-hidden border border-[#d3e4fe] bg-white cursor-zoom-in"
              title={d.original_name}
            >
              {d.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.url} alt={d.original_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-[#ba1a1a] p-2 block">Unavailable</span>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[10px] px-1.5 py-0.5 truncate">
                {d.original_name}
              </span>
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {files.map((d) => (
            <a
              key={d.id}
              href={d.url ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 bg-white rounded border border-[#e5eeff] hover:border-[#4059aa]"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">picture_as_pdf</span>
                <span className="truncate">{d.original_name}</span>
              </span>
              <span className="text-[11px] text-[#45464d] shrink-0">
                {(d.size_bytes / 1024).toFixed(0)} KB • Open
              </span>
            </a>
          ))}
        </div>
      )}

      {preview && preview.url && (
        <div
          className="fixed inset-0 z-[70] bg-[#0f172a]/80 flex items-center justify-center p-6"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-[#0b1c30] shadow flex items-center justify-center"
              title="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt={preview.original_name}
              className="max-h-[85vh] max-w-full rounded-lg shadow-2xl bg-white"
            />
            <p className="text-white text-xs mt-2 text-center">{preview.original_name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
