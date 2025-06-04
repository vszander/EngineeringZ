import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

const backendURL = import.meta.env.VITE_BACKEND_URL;

function HamRadio() {
  return (
    <div className="container" scrolling="yes">
      <Navbar />
      <h1>Ham Radio - Online Store</h1>
      <p>
        <table width="100%">
          <tbody>
            <tr>
              <td width="10%">
                <img
                  src="/images/hamradio/FieldDay1.jpg"
                  width="202"
                  height="140"
                />
              </td>
              <td>
                {" "}
                <p>
                  After so many encouraged me to share some of the hobby that I
                  love... I am offering most of my projects for sale here.{" "}
                </p>
                <p>
                  {" "}
                  I'm happy to say that I still have a 100% satisfaction rating
                  on my ebay store - so shop here with confidence and save a
                  little. The storefront is available for browsing available
                  products... the shopping cart is under construction but it
                  will accept PayPal, Venmo, and GoDaddy secure payments. I have
                  personally tested each of these and modified the designs to
                  suit me - but I'd be happy to modify to suit your needs.
                  Please browse around and feel free to <b>order </b> or ask
                  questions{" "}
                  <Link to="mailto:sales@engineering-z.com">via email </Link>{" "}
                  while the shopping cart is being finalized.{" "}
                </p>
              </td>
            </tr>
            <tr>
              <td></td>
              <td>
                {" "}
                <p>
                  My Personal interest and 'About me' page is
                  <Link to="/aboutme"> here </Link>.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </p>

      <p>
        <iframe
          align="top"
          frameborder="0"
          scrolling="yes"
          id="shoppingiframe"
          src={`${backendURL}/storefront/product_list/`}
          width="100%"
          height="600"
        ></iframe>
      </p>
    </div>
  );
}
export default HamRadio;
