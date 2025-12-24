import { Routes, Route, Navigate } from "react-router-dom";

import MhsaHome from "./mhsa_home";
import TuggerMap from "./TuggerMap";
import RelationshipsERD from "./RelationshipsERD";
import Search from "./Search";

export default function ClubcarRouter() {
  return (
    <Routes>
      {/* default /clubcar */}
      <Route index element={<MhsaHome />} />
      {/* key demo pages */}
      <Route path="mhsa" element={<MhsaHome />} />
      <Route path="tugger-map" element={<TuggerMap />} />
      <Route path="relationships" element={<RelationshipsERD />} />

      {/**
       * Search routes * These allow: * /clubcar/search -> Search (defaults
      internally) * /clubcar/search/part -> Search (PartID mode) *
      /clubcar/search/anything -> Search (future modes) */}

      <Route path="search" element={<Search />} />
      <Route path="search/:mode" element={<Search />} />
      {/* fallback */}
      <Route path="*" element={<Navigate to="/clubcar" replace />} />
    </Routes>
  );
}
