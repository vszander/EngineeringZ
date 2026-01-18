import { Routes, Route, Navigate } from "react-router-dom";

import MhsaHome from "./mhsa_home";
import TuggerMap from "./TuggerMap";
import RelationshipsERD from "./RelationshipsERD";
import Search from "./Search";
import Maintenance from "./Maintenance";
import CartMoveMenu from "./CartMoveMenu";
import Carts from "./Carts";
import MhsaWorkflowMenu from "./MhsaWorkflowMenu";

//import "./mhsa.theme.clubcar.css";
import "../../components/mhsa.theme.clubcar.css";
import "./mhsa_home.css"; // or mhsa.base.css when you rename it

// future placeholders
// import PartSearch from "./PartSearch";
// import RelationshipsERD from "./RelationshipsERD";

export default function ClubcarRouter() {
  return (
    <div className="mhsa-home mhsa-dark">
      <Routes>
        {/* default /clubcar */}
        <Route index element={<MhsaHome />} />
        {/* key demo pages */}
        <Route path="mhsa" element={<MhsaHome />} />
        <Route path="tugger-map" element={<TuggerMap />} />
        <Route path="relationships" element={<RelationshipsERD />} />
        {/* NEW: Search */}
        <Route path="search" element={<Search />} />
        <Route path="search/:mode" element={<Search />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="maintenance/:tool" element={<Maintenance />} />
        <Route path="cart-move" element={<CartMoveMenu />} />
        <Route path="carts" element={<Carts />} />
        <Route path="workflows" element={<MhsaWorkflowMenu />} />

        {/* <Route path="/mhsa/maintenance" element={<Maintenance />} /> */}
        {/* fallback */}
        <Route path="*" element={<Navigate to="/clubcar" replace />} />
      </Routes>
    </div>
  );
}
