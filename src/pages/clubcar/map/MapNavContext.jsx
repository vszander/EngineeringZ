import React, { createContext, useContext, useMemo, useState } from "react";

const MapNavContext = createContext(null);

export function MapNavProvider({ initialLayerId, children }) {
  const [mapLayerId, setMapLayerId] = useState(initialLayerId || null);

  // stack entries: { layerId, viewport }
  const [stack, setStack] = useState([]);

  // optional: store per-layer viewport so you return to the same view
  const [viewportByLayer, setViewportByLayer] = useState({}); // { [layerId]: {...} }

  const setViewport = (layerId, viewport) => {
    setViewportByLayer((prev) => ({ ...prev, [layerId]: viewport }));
  };

  const getViewport = (layerId) => viewportByLayer[layerId] || null;

  const goToLayer = (layerId, { pushCurrent = false } = {}) => {
    if (!layerId) return;
    if (pushCurrent && mapLayerId) {
      setStack((prev) => [
        ...prev,
        { layerId: mapLayerId, viewport: getViewport(mapLayerId) },
      ]);
    }
    setMapLayerId(layerId);
  };

  const zoomInToLayer = (layerId) => goToLayer(layerId, { pushCurrent: true });

  const zoomOut = ({ parentLayerId } = {}) => {
    // Prefer explicit stack pop (best UX)
    setStack((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        setMapLayerId(last.layerId);
        return prev.slice(0, -1);
      }
      // If stack empty, fall back to known parent (optional)
      if (parentLayerId) setMapLayerId(parentLayerId);
      return prev;
    });
  };

  // generic “focus pin” / “selection” mechanism
  const [focus, setFocus] = useState(null);
  // focus: { type: "cart"|"location"|"zone"|..., id, layerId, x, y, meta }

  const goToEntity = (entityFocus) => {
    if (!entityFocus) return;
    // if entity is in another layer, jump there and push current
    if (entityFocus.layerId && entityFocus.layerId !== mapLayerId) {
      goToLayer(entityFocus.layerId, { pushCurrent: true });
    }
    setFocus(entityFocus);
  };

  const value = useMemo(
    () => ({
      mapLayerId,
      setMapLayerId,
      stack,
      focus,
      setFocus,
      setViewport,
      getViewport,
      goToLayer,
      zoomInToLayer,
      zoomOut,
      goToEntity,
    }),
    [mapLayerId, stack, focus, viewportByLayer],
  );

  return (
    <MapNavContext.Provider value={value}>{children}</MapNavContext.Provider>
  );
}

export function useMapNav() {
  const ctx = useContext(MapNavContext);
  if (!ctx) throw new Error("useMapNav must be used within MapNavProvider");
  return ctx;
}
