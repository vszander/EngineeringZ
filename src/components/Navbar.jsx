import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../assets/css/customStyles.css';

export default function Navbar() {
  // State variables for cart icon and quantity
  const [cartQuantity, setCartQuantity] = useState(0);
  const [cartIcon, setCartIcon] = useState('shopping_cart');
   // State to hold cart status and quantity
   const [cartStatus, setCartStatus] = useState(0); // 0 = empty, 1 = items in cart
   const [fallingProduct, setFallingProduct] = useState(null);
   const cartIconRef = useRef(null);
 
 // Function to handle cart icon click
const handleCartClick = () => {
  const iframe = document.getElementById('shoppingiframe'); // Ensure you have the correct iframe ID
  const currentUrl = window.location.href; // Get the current browser URL

  if (cartQuantity > 0) {
    // If there are items in the cart, redirect iframe to the cart page
    if (iframe) {
      
 //     iframe.src = 'http://localhost:8000/storefront/cart';
      iframe.src = 'https://backend.engineering-z.com/storefront/cart';

    } else {
      console.error('Iframe not found!');
    }
  } else if (currentUrl.includes('/hamradio')) {
    // If on /hamradio and no items in the cart, redirect iframe to product list
    if (iframe) {
    //  iframe.src = 'http://localhost:8000/storefront/product_list';
      iframe.src = 'https://backend.engineering-z.com/storefront/product_list';
    } else {
      console.error('Iframe not found!');
    }
  } else {
    // If not on /hamradio and no items in the cart, redirect the entire browser to /lights
    window.location.href = '/lights';
  }
};

  const handleMessage = (event) => {
    console.log("Message received:", event); // Debugging

        // Allowed origins
        const allowedOrigins = [
          "https://backend.engineering-z.com",
          "http://localhost:8000" // For local development
      ];
  
      // Check origin for security
      if (!allowedOrigins.includes(event.origin)) {
          console.warn("Message from untrusted origin:", event.origin);
          return;
      }


    const { status, quantity, product } = event.data;
    if (status === 1) {
        console.log("Updating cart with quantity:", quantity); // Debugging
        setCartQuantity(quantity);

            // Change the cart icon based on quantity
        setCartStatus(quantity > 0 ? 1 : 0);
        // Trigger the animation with the product name or image

        if (cartIconRef.current) {
          const rect = cartIconRef.current.getBoundingClientRect();
          console.log('Cart icon dimensions:', rect);
        } else {
          console.warn('cartIconRef is not available yet.');
        }

        
    // Trigger the animation
      const cartRect = cartIconRef.current.getBoundingClientRect();
      setFallingProduct({
      product: product,
      cartX: cartRect.x + cartRect.width / 2,
      cartY: cartRect.y + cartRect.height / 2,
        });
      

        
       // setTimeout(() => setFallingProduct(null), 1000); // Hide animation after 1s

        //alert(`Cart updated with quantity: ${quantity} \n with product: ${product}`); // Test alert
    }
};



  // Log fallingProduct whenever it changes
 // useEffect(() => {
  //  console.log('Falling Product State:', fallingProduct);
 // }, [fallingProduct]);


  // Listen for messages from iframe
useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => {
        window.removeEventListener("message", handleMessage);
    };
}, []);

useEffect(() => {
  if (fallingProduct) {
    const timer = setTimeout(() => {
      setFallingProduct(null); // Reset the fallingProduct state
    }, 1000); // Match the animation duration (1s)
    
    return () => clearTimeout(timer); // Cleanup timer on component unmount
  }
}, [fallingProduct]);



 

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
                  <i className="material-icons cursor-pointer" 
                  id="shopping_cart"
                  ref={cartIconRef}
                  >
                    {cartStatus === 1 ? 'shopping_cart_checkout' : cartIcon}
                  </i>
                  <span className="position-absolute top-5 start-100 translate-middle badge rounded-pill bg-danger border border-white small py-1 px-2">
                    <span className="small" id="cart_quantity">{cartQuantity}</span>
                    <span className="visually-hidden">unread notifications</span>
                  </span>
                </a>
                {/* Render falling product animation */}
                {fallingProduct && (
                  <div
                    className="falling-product"
                    style={{
                      '--start-x': `${window.innerWidth / 2}px`,
                      '--start-y': `${window.innerHeight / 2}px`,
                      '--cart-x': `${fallingProduct.cartX}px`,
                      '--cart-y': `${fallingProduct.cartY}px`,
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
          <img class="img-fluid" src="/images/navbar.png" width="1000" height="12" alt="Navbar Decoration" />
        </div>

      </div>
      
    </nav>
  );
}
