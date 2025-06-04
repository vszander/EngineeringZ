import React, { useEffect, useRef } from "react";
//import "../assets/css/adminStyles.css";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import "../assets/css/Home.css";
import Navbar from "../components/Navbar";

export default function Admin() {
  const iframeRef = useRef(null);
  const location = useLocation();
  const isDev = window.location.hostname === "localhost";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");

    let baseURL = isDev
      ? "http://localhost:8000/"
      : "https://backend.engineering-z.com/";

    let targetURL = baseURL;

    switch (mode) {
      case "login":
        targetURL += "accounts/login/";
        break;
      case "logout":
        targetURL += "accounts/logout/";
        break;
      case "admin":
        targetURL += "admin/";
        break;
      default:
        targetURL += "admin/";
    }

    if (iframeRef.current) {
      // Delay assignment slightly to avoid NS_BINDING_ABORTED
      setTimeout(() => {
        iframeRef.current.src = targetURL;
      }, 200); // You can adjust the delay if needed
    }
  }, [location.search]);

  return (
    <div style={{ padding: "1rem" }}>
      <Navbar />
      <iframe
        ref={iframeRef}
        title="admin-iframe"
        width="1600"
        height="800"
        frameBorder="0"
        scrolling="yes"
      />
    </div>
  );
}
