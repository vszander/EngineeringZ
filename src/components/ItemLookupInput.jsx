/* eslint-disable react/prop-types */

import { useEffect, useMemo, useRef, useState } from "react";
import "./ItemLookupInput.css";

export function ItemLookupInput({
  backendBase,
  label = "Part Number",
  placeholder = "Enter part number...",
  minChars = 1,
  debounceMs = 180,
  onSubmitPartNumber,
  onPickHint,
}) {
  const [value, setValue] = useState("");
  const [hints, setHints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const abortRef = useRef(null);

  const canHint = useMemo(
    () => value.trim().length >= minChars,
    [value, minChars]
  );

  useEffect(() => {
    setErr("");

    if (!backendBase) {
      setHints([]);
      setErr("VITE_BACKEND_URL is not set (backendBase is empty).");
      return;
    }

    if (!canHint) {
      setHints([]);
      return;
    }

    const t = setTimeout(async () => {
      // cancel in-flight
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        setLoading(true);

        const url = `${backendBase}/mhsa/search/items/hints?q=${encodeURIComponent(
          value.trim()
        )}`;
        console.log("[hints] value=", value.trim(), "url=", url);

        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) throw new Error(`hint HTTP ${res.status}`);

        const data = await res.json();
        setHints(Array.isArray(data.hints) ? data.hints : []);
      } catch (e) {
        if (e?.name !== "AbortError") setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(t);
  }, [backendBase, value, canHint, debounceMs]);

  return (
    <div className="mhsa-field">
      <label className="mhsa-label">{label}</label>

      <div className="mhsa-inputrow">
        <input
          className="mhsa-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmitPartNumber?.(value.trim());
          }}
        />
        <button
          className="mhsa-btn"
          onClick={() => onSubmitPartNumber?.(value.trim())}
          disabled={!value.trim()}
        >
          Search
        </button>
      </div>

      <div className="mhsa-subrow">
        {loading && <span className="mhsa-dim">Loading hints…</span>}
        {err && <span className="mhsa-err">{err}</span>}
      </div>

      {hints.length > 0 && (
        <div className="mhsa-hints">
          {hints.slice(0, 30).map((h, idx) => (
            <button
              key={`${h.part_number}-${idx}`}
              className="mhsa-hint"
              onClick={() => onPickHint?.(h)}
              title={h.description || ""}
              type="button"
            >
              <div className="mhsa-hint-top">{h.part_number}</div>
              <div className="mhsa-hint-bot">{h.description || ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
