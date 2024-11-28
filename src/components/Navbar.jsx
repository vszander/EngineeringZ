import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../assets/css/customStyles.css';

export default function Navbar() {
  // State variables for cart icon and quantity
  const [cartQuantity, setCartQuantity] = useState(0);
  const [cartIcon, setCartIcon] = useState('shopping_cart');
   // State to hold cart status and quantity
   const [cartStatus, setCartStatus] = useState(0); // 0 = empty, 1 = items in cart
 

  // Function to handle cart icon click
  const handleCartClick = () => {
    const currentUrl = window.location.href; // Get the current browser URL
    if (currentUrl.includes('/hamradio')) {
      // Redirect the iframe to /storefront/product_list/
      const iframe = document.querySelector('iframe');
      if (iframe) {
        iframe.src = 'https://backend.engineering-z.com/storefront/cart';
      } else {
        console.error('Iframe not found!');
      }
    } else {
      // Redirect the entire browser to /lights
      window.location.href = '/lights';
    }
  };

  const handleMessage = (event) => {
    console.log("Message received:", event); // Debugging

    // Check origin for security
    if (event.origin !== "https://backend.engineering-z.com") {
        console.warn("Message from untrusted origin:", event.origin);
        return;
    }

    const { status, quantity } = event.data;
    if (status === 1) {
        console.log("Updating cart with quantity:", quantity); // Debugging
        setCartQuantity(quantity);
        alert(`Cart updated with quantity: ${quantity}`); // Test alert
    }
};

const testMessage = () => {
  const testEvent = {
      data: { status: 1, quantity: 11 },
      origin: "https://backend.engineering-z.com",
  };
  console.log("Simulated message:", testEvent); // Debugging
  handleMessage(testEvent); // Call the global handler
};

  // Listen for messages from iframe
useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
        window.removeEventListener("message", handleMessage);
    };
}, []);



  

 

  return (
    <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: '#496dba' }}>
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
                  <span >
                    <Link  to="/home">Home</Link>
                  </span>
                </button>
                <button onClick={testMessage}>Test Message</button>
              </td>
              <td>
                <div className="collapse navbar-collapse" id="navbarNav">
                  <Link className="nav-link" to="/services">Services</Link>
                  <Link className="nav-link" to="/contact">Contact</Link>
                  <Link className="nav-link" to="/about">About</Link>
                  <a className="nav-link" href="https://backend.engineering-z.com/accounts/cover-login/">Sign In</a>
                  {/* Shopping Cart Anchor */}
                  <a
                    href="javascript:;"
                    className="nav-link text-body p-0 position-relative"
                    onClick={handleCartClick}
                    id="shoppingButton"
                  >
                    <i className="material-icons cursor-pointer" id="shopping_cart">
                      {cartStatus === 1 ? 'shopping_cart_checkout' : cartIcon}
                      </i>
                    <span className="position-absolute top-5 start-100 translate-middle badge rounded-pill bg-danger border border-white small py-1 px-2">
                      <span className="small" id="cart_quantity">{cartQuantity}</span>
                      <span className="visually-hidden">unread notifications</span>
                    </span>
                  </a>
                </div>
              </td>
            </tr>
          </tbody>
          
        </table>
        <div className="navbar-decoration ">
  <img class="img-fluid" src="/images/navbar.png" width="1000" height="12" alt="Navbar Decoration" />
</div>

      </div>
      
    </nav>
  );
}
