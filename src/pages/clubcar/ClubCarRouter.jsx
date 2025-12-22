import { Routes, Route, Navigate } from "react-router-dom";

import MhsaHome from "./mhsa_home";
import TuggerMap from "./TuggerMap";
import RelationshipsERD from "./RelationshipsERD";

// future placeholders
// import PartSearch from "./PartSearch";
// import RelationshipsERD from "./RelationshipsERD";

export default function ClubcarRouter() {
  return (
    <Routes>
      {/* default /clubcar */}
      <Route index element={<MhsaHome />} />

      {/* key demo pages */}
      <Route path="mhsa" element={<MhsaHome />} />
      <Route path="tugger-map" element={<TuggerMap />} />
      <Route path="relationships" element={<RelationshipsERD />} />

      {/* future */}
      {/* <Route path="search/part" element={<PartSearch />} /> */}

      {/* fallback */}
      <Route path="*" element={<Navigate to="/clubcar" replace />} />
    </Routes>
  );
}
