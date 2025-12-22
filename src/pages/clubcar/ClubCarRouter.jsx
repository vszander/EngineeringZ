import { Routes, Route, Navigate } from "react-router-dom";

import MhsaHome from "./mhsa_home";
import TuggerMap from "./TuggerMap";

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

      {/* future */}
      {/* <Route path="search/part" element={<PartSearch />} /> */}
      {/* <Route path="relationships" element={<RelationshipsERD />} /> */}

      {/* fallback */}
      <Route path="*" element={<Navigate to="/clubcar" replace />} />
    </Routes>
  );
}
