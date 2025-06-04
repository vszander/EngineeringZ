//import React from 'react';
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

function Lights() {
  return (
    <div className="container" scrolling="yes">
      <Navbar />
      <h1>Holiday Lights Page</h1>

      <p>This page contains information about Lights.</p>
      <img
        src="/images/xlights/gifs/Many_elements1.gif"
        width="800"
        height="540"
      />
      <p>
        <Link to="/store"> click here </Link>.
      </p>
    </div>
  );
}

export default Lights;
