import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import "../assets/css/customStyles.css";

const backendBase = import.meta.env.VITE_BACKEND_URL;

function normalizeAuthStatus(auth) {
  if (!auth) {
    return {
      isAuthenticated: false,
      isStaff: false,
      username: null,
      email: "",
      loginUrl: "/auth",
    };
  }

  // New global /auth/status/ shape:
  // {
  //   ok: true,
  //   authenticated: true,
  //   user: { username, email, is_staff, is_superuser, login_url }
  // }
  if ("authenticated" in auth || "user" in auth) {
    return {
      isAuthenticated: auth.authenticated === true,
      isStaff: auth.user?.is_staff === true || auth.user?.is_superuser === true,
      username: auth.user?.username || null,
      email: auth.user?.email || "",
      loginUrl: auth.user?.login_url || "/auth",
    };
  }

  // Legacy AppSeed/postMessage shape:
  // {
  //   isAuthenticated: true,
  //   isStaff: true,
  //   username: "..."
  // }
  return {
    isAuthenticated: auth.isAuthenticated === true,
    isStaff: auth.isStaff === true,
    username: auth.username || null,
    email: auth.email || "",
    loginUrl: auth.loginUrl || "/auth",
  };
}

export default function Navbar() {
  // State variables for cart icon and quantity
  const [cartQuantity, setCartQuantity] = useState(0);
  const [cartIcon, setCartIcon] = useState("shopping_cart");
  // State to hold cart status and quantity
  const [cartStatus, setCartStatus] = useState(0); // 0 = empty, 1 = items in cart
  const [fallingProduct, setFallingProduct] = useState(null);
  const cartIconRef = useRef(null);
  const location = useLocation();
  const inMhsa = location.pathname.startsWith("/clubcar");

  // 🔁 Central state for auth

  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    isStaff: false,
    username: null,
    email: "",
    loginUrl: "/auth",
  });

  // const isDev = window.location.hostname === "localhost";

  const handleAuthClick = () => {
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );

    if (!authStatus.isAuthenticated) {
      window.location.href = `/auth?mode=login&next=${next}`;
      return;
    }

    if (authStatus.isStaff) {
      window.location.href = `${backendBase}/admin/`;
      return;
    }

    window.location.href = `/auth?mode=logout&next=${next}`;
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
      iframe.src = `${backendBase}/storefront/lightscart`;
    } else if (currentUrl.includes("/store")) {
      iframe.src = `${backendBase}/storefront/lights_product_list`;
    } else if (currentUrl.includes("/hamradio")) {
      iframe.src = `${backendBase}/storefront/product_list`;
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
      const auth = normalizeAuthStatus(event.data.auth);
      setAuthStatus(auth);
      messageReceivedRef.current = true;
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
        const auth = normalizeAuthStatus(event.data.auth);
        console.log("🔐 Auth data received:", auth);
        setAuthStatus(auth);
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
        fetch(`${backendBase}/auth/status/`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        })
          .then((res) => res.json())
          .then((auth) => {
            const normalized = normalizeAuthStatus(auth);
            console.log("🔐 Auth status fetched:", normalized);
            setAuthStatus(normalized);
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
                  {authStatus.isAuthenticated && (
                    <>
                      <Link className="nav-link" to="/clubcar/mhsa">
                        MHSA
                      </Link>

                      {/* Only show while *in* MHSA, and only for staff */}
                      {inMhsa && authStatus.isStaff && (
                        <Link className="nav-link" to="/clubcar/maintenance">
                          Maintenance
                        </Link>
                      )}
                    </>
                  )}

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
