import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom';

function LightsStore() {
  return (
    <div className="container" scrolling="yes"><Navbar />
      <h1>Light Shows</h1>
      <table width="100%">
        <tbody><tr>
          <td width="10%"><img src='/images/xlights/gifs/SingingBulbs.gif' width='800' height='450'/>
          </td><td> <p>  
            I am offering most of our Animated Lights products for sale here. </p>
            <p> The storefront is available for browsing available products... the shopping cart is under construction but it will accept PayPal, Venmo, and GoDaddy secure payments.  I have personally tested each of these and modified the designs to suit me - but I'd be happy to modify to suit your needs.
            Please browse around and feel free to <b>order </b> or ask questions <Link to='mailto:sales@engineering-z.com'>via  email </Link>  while the shopping cart is being finalized. 
            </p>
         </td>
      </tr>
      <tr><td ></td>
      <td > </td>     
</tr>      

      </tbody>
      </table>

     
      <p> 

         <iframe align="top" frameBorder="0" scrolling="yes" id ="shoppingiframe" src="https://backend.engineering-z.com/storefront/lights_product_list/" width="100%" height="600"></iframe> 

     {/*  <iframe align="top" frameBorder="0" scrolling="yes" id ="shoppingiframe" src="http://localhost:8000/storefront/lights_product_list/" width="100%" height="600"></iframe>  */}
      </p>

    </div>
  );
}
export default LightsStore;
