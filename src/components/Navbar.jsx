import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../assets/css/customStyles.css";

export default function Navbar() {
  // State variables for cart icon and quantity
  const [cartQuantity, setCartQuantity] = useState(0);
  const [cartIcon, setCartIcon] = useState("shopping_cart");
  // State to hold cart status and quantity
  const [cartStatus, setCartStatus] = useState(0); // 0 = empty, 1 = items in cart
  const [fallingProduct, setFallingProduct] = useState(null);
  const cartIconRef = useRef(null);

  const BACKEND_BASE_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:8000"
      : "https://backend.engineering-z.com";

  // 🔁 Central state for auth

  const backendURL = import.meta.env.VITE_BACKEND_URL;

  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    isStaff: false,
    username: null,
  });

  // const isDev = window.location.hostname === "localhost";

  const handleAuthClick = () => {
    let mode = "login";

    if (authStatus.isAuthenticated) {
      mode = authStatus.isStaff ? "admin" : "logout";
    }

    // Always go to the /auth page so it renders Admin.jsx and iframe
    const target = `/auth?mode=${mode}`;
    window.location.href = target;
  };

  // 🛒 Cart icon click handler
  const handleCartClick = () => {
    const iframe = document.getElementById("shoppingiframe");
    const currentUrl = window.location.href;

    if (!iframe) {
      console.error("🛑 Iframe not found!");
      return;
    }

    if (cartQuantity > 0) {
      iframe.src = `${BACKEND_BASE_URL}/storefront/lightscart`;
    } else if (currentUrl.includes("/store")) {
      iframe.src = `${BACKEND_BASE_URL}/storefront/lights_product_list`;
    } else if (currentUrl.includes("/hamradio")) {
      iframe.src = `${BACKEND_BASE_URL}/storefront/product_list`;
    } else {
      window.location.href = "/lights";
    }
  };

  // 📬 Unified message handler from iframe
  const handleMessage = (event) => {
    const allowedOrigins = [
      "https://backend.engineering-z.com",
      "https://www.engineering-z.com",
      "http://localhost:8000",
      "http://localhost:5173",
    ];

    if (!allowedOrigins.includes(event.origin)) {
      console.warn("Blocked message from untrusted origin:", event.origin);
      return;
    }

    const data = event.data;

    // ✅ Handle cart update
    if (data.status === 1 && data.quantity != null) {
      console.log("🛒 Cart update:", data.quantity);
      setCartQuantity(data.quantity);
      setCartStatus(data.quantity > 0 ? 1 : 0);

      const cartRect = cartIconRef.current?.getBoundingClientRect();
      if (cartRect) {
        setFallingProduct({
          product: data.product,
          cartX: cartRect.x + cartRect.width / 2,
          cartY: cartRect.y + cartRect.height / 2,
        });
      }
    }

    // ✅ Handle auth update
    if (event.data && event.data.auth) {
      const auth = event.data.auth;
      console.log("🔐 Auth data received:", auth);
      setAuthStatus({
        isAuthenticated: auth.isAuthenticated,
        isStaff: auth.isStaff,
        username: auth.username,
      });
    }
  };

  // Log fallingProduct whenever it changes
  // useEffect(() => {
  //  console.log('Falling Product State:', fallingProduct);
  // }, [fallingProduct]);

  // Track whether a message has been received
  const messageReceivedRef = useRef(false);

  // 1️⃣ Listen for postMessage from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      const allowedOrigins = [
        "https://backend.engineering-z.com",
        "https://www.engineering-z.com",
        "http://localhost:8000",
        "http://localhost:5173",
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.warn("Message from untrusted origin:", event.origin);
        return;
      }

      if (event.data && event.data.auth) {
        const auth = event.data.auth;
        setAuthStatus({
          isAuthenticated: auth.isAuthenticated,
          isStaff: auth.isStaff,
          username: auth.username,
        });
        messageReceivedRef.current = true;
      }

      // Cart update handling
      const { status, quantity, product } = event.data;
      if (status === 1) {
        setCartQuantity(quantity);
        setCartStatus(quantity > 0 ? 1 : 0);

        if (cartIconRef.current) {
          const cartRect = cartIconRef.current.getBoundingClientRect();
          setFallingProduct({
            product,
            cartX: cartRect.x + cartRect.width / 2,
            cartY: cartRect.y + cartRect.height / 2,
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // 2️⃣ Cleanup fallingProduct animation
  useEffect(() => {
    if (fallingProduct) {
      const timer = setTimeout(() => {
        setFallingProduct(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [fallingProduct]);

  // 3️⃣ Fallback auth status check (if no postMessage)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!messageReceivedRef.current) {
        fetch(`${backendURL}/auth/status/`, {
          // will adapt to prod vs dev
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((auth) => {
            setAuthStatus({
              isAuthenticated: auth.isAuthenticated,
              isStaff: auth.isStaff,
              username: auth.username,
            });
          })
          .catch((err) => {
            console.warn("Auth status fetch failed:", err);
          });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <nav
      className="navbar navbar-expand-lg navbar-dark"
      style={{ backgroundColor: "#496dba" }}
    >
      <div className="container-fluid">
        <table width="100%">
          <tbody>
            <tr>
              <td width="65%"></td>
              <td>
                &nbsp;
                <button
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#navbarNav"
                  aria-controls="navbarNav"
                  aria-expanded="false"
                  aria-label="Toggle navigation"
                >
                  <span>
                    <Link to="/home">Home</Link>
                  </span>
                </button>
              </td>
              <td>
                <div className="collapse navbar-collapse" id="navbarNav">
                  <Link className="nav-link" to="/services">
                    Services
                  </Link>
                  <Link className="nav-link" to="/contact">
                    Contact
                  </Link>
                  <Link className="nav-link" to="/about">
                    About
                  </Link>
                  <Link to="/clubcar/tugger-map">MHSA Tugger Map</Link>

                  <div
                    className="nav-link"
                    role="button"
                    onClick={handleAuthClick}
                  >
                    {authStatus.isAuthenticated
                      ? authStatus.isStaff
                        ? "Admin"
                        : "Log off"
                      : "Log in"}
                  </div>

                  {/* Shopping Cart Anchor */}
                  <a
                    href="javascript:;"
                    className="nav-link text-body p-0 position-relative"
                    onClick={handleCartClick}
                    id="shoppingButton"
                  >
                    <i
                      className="material-icons cursor-pointer"
                      id="shopping_cart"
                      ref={cartIconRef}
                    >
                      {cartStatus === 1 ? "shopping_cart_checkout" : cartIcon}
                    </i>
                    <span className="position-absolute top-5 start-100 translate-middle badge rounded-pill bg-danger border border-white small py-1 px-2">
                      <span className="small" id="cart_quantity">
                        {cartQuantity}
                      </span>
                      <span className="visually-hidden">
                        unread notifications
                      </span>
                    </span>
                  </a>
                  {/* Render falling product animation */}
                  {fallingProduct && (
                    <div
                      className="falling-product"
                      style={{
                        "--start-x": `${window.innerWidth / 2}px`,
                        "--start-y": `${window.innerHeight / 2}px`,
                        "--cart-x": `${fallingProduct.cartX}px`,
                        "--cart-y": `${fallingProduct.cartY}px`,
                      }}
                    >
                      {fallingProduct.product}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="navbar-decoration ">
          <img
            className="img-fluid"
            src="/images/navbar.png"
            width="100%"
            height="12"
            alt="Navbar Decoration"
          />
        </div>
      </div>
    </nav>
  );
}
