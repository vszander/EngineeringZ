import React, { createContext, useContext, useMemo, useState } from "react";

const MapNavContext = createContext(null);

/**
 * MapNavContext
 * - mapLayerId: current layer
 * - stack: navigation stack to support "zoom in" / "zoom out"
 * - viewportByLayer: optional (store pan/zoom per layer)
 * - focus: optional selection/focus pin used by pages (Cockpit/HUD/Search)
 *
 * Stack entry shape:
 *   { layerId, viewport, focus }
 */
export function MapNavProvider({ initialLayerId, children }) {
  const [mapLayerId, setMapLayerId] = useState(initialLayerId || null);

  const [stack, setStack] = useState([]);
  const [viewportByLayer, setViewportByLayer] = useState({}); // { [layerId]: viewport }
  const [focus, setFocus] = useState(null); // { type, id, layerId, x, y, meta }

  const setViewport = (layerId, viewport) => {
    if (!layerId) return;
    setViewportByLayer((prev) => ({ ...prev, [layerId]: viewport || null }));
  };

  const getViewport = (layerId) => {
    if (!layerId) return null;
    return viewportByLayer[layerId] || null;
  };

  const pushCurrent = () => {
    if (!mapLayerId) return;
    setStack((prev) => [
      ...prev,
      {
        layerId: mapLayerId,
        viewport: getViewport(mapLayerId),
        focus: focus || null,
      },
    ]);
  };

  /**
   * goToLayer
   * opts:
   * - pushCurrent: push current layer+viewport+focus onto stack before changing
   * - clearFocus: clear focus after changing layers (default true)
   */
  const goToLayer = (
    layerId,
    { pushCurrent: doPush = false, clearFocus = true } = {},
  ) => {
    if (!layerId) return;
    if (doPush && mapLayerId && layerId !== mapLayerId) {
      pushCurrent();
    }
    setMapLayerId(layerId);
    if (clearFocus) setFocus(null);
  };

  const zoomInToLayer = (layerId, opts = {}) =>
    goToLayer(layerId, { pushCurrent: true, clearFocus: true, ...opts });

  /**
   * zoomOut
   * - Pops stack (preferred UX)
   * - If stack empty, optionally falls back to a known parentLayerId
   * - Restores focus from the stack entry (nice for Cockpit)
   */
  const zoomOut = ({ parentLayerId } = {}) => {
    setStack((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        setMapLayerId(last.layerId);
        setFocus(last.focus || null);
        return prev.slice(0, -1);
      }
      if (parentLayerId) {
        setMapLayerId(parentLayerId);
        setFocus(null);
      }
      return prev;
    });
  };

  /**
   * goToEntity
   * - sets focus
   * - if entity is on another layer, switches layers and pushes current
   */
  const goToEntity = (entityFocus) => {
    if (!entityFocus) return;

    const targetLayerId = entityFocus.layerId || null;
    if (targetLayerId && targetLayerId !== mapLayerId) {
      // jump and keep breadcrumb
      goToLayer(targetLayerId, { pushCurrent: true, clearFocus: false });
    }
    setFocus(entityFocus);
  };

  /**
   * resetNav
   * - clears stack, focus, and returns to initial layer
   * - optional: clear viewport cache too
   */
  const resetNav = ({ clearViewports = false } = {}) => {
    setStack([]);
    setFocus(null);
    setMapLayerId(initialLayerId || null);
    if (clearViewports) setViewportByLayer({});
  };

  const value = useMemo(
    () => ({
      mapLayerId,
      setMapLayerId,

      stack,
      pushCurrent,

      focus,
      setFocus,

      setViewport,
      getViewport,

      goToLayer,
      zoomInToLayer,
      zoomOut,
      goToEntity,

      resetNav,
    }),
    // include viewportByLayer so getViewport reflects latest cache in consumers
    [mapLayerId, stack, focus, viewportByLayer, initialLayerId],
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
