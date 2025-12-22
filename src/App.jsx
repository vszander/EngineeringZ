import "./assets/css/customStyles.css";
import Home from "./pages/Home";
import Lights from "./pages/Lights";
import SmartHome from "./pages/SmartHome";
import Gazebo from "./pages/Gazebo";
import HamRadio from "./pages/HamRadio";
import ThreeD from "./pages/ThreeD";
import Admin from "./pages/Admin";
import HamRadioAbout from "./pages/HamRadio/aboutmeham";

import OurServices from "./pages/Services";
import ContactUs from "./pages/ContactUs";
import AboutUs from "./pages/AboutUs";
import PowerZ from "./pages/powerz";
import LightsStore from "./pages/Lights_store";
import TuggerMap from "./pages/clubcar/TuggerMap"; // <- your new JSX component
import Packages from "./pages/Packages";
import ClubCarRouter from "./pages/clubcar/ClubCarRouter";

import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
      <div>
        <BrowserRouter>
          <Routes>
            <Route index element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/smarthome" element={<SmartHome />} />
            <Route path="/lights" element={<Lights />} />
            <Route path="/store" element={<LightsStore />} />
            <Route path="/powerz" element={<PowerZ />} />
            <Route path="/gazebo" element={<Gazebo />} />
            <Route path="/hamradio" element={<HamRadio />} />
            <Route path="/aboutme" element={<HamRadioAbout />} />
            <Route path="/3d" element={<ThreeD />} />
            <Route path="/services" element={<OurServices />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/clubcar/*" element={<ClubCarRouter />} />
            <Route path="/clubcar/tugger-map" element={<TuggerMap />} />
            <Route path="/auth" element={<Admin />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;
