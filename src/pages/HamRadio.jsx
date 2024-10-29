import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom';

function HamRadio() {
  return (
    <div className="container"><Navbar />
      <h1>Ham Radio - Online Store</h1>
      <p>
      <table width="100%">
        <tbody><tr>
          <td width="10%"><img src='/images/hamradio/ft818.jpg' width='160' height='184'/>
          </td><td> <p>
          Dropdown for  </p>
         </td>
      </tr>
      <tr><td ></td>
      <td ><img src='/images/hamradio/TriCounty.png' width='100' height='100'/><img src='/images/hamradio/ARES.png' width='100' height='100'/><img src='/images/hamradio/skywarn_logo.png' width='100' height='100'/>
      <img src='/images/hamradio/SOTA-Logo.svg.png' width='100' height='100'/>
      <img src='/images/hamradio/pota-logo.png' width='100' height='100'/>
      
      </td>
</tr>      

      </tbody>
      </table>
      <p>
      My Personal interest and 'About me' page is 
      <Link to='/aboutme'>  here </Link>.</p>
     

      </p>
      <p> <iframe align="top" frameborder="0" scrolling="yes" src="https://backend.engineering-z.com/storefront/card/" width="100%"></iframe></p>

    </div>
  );
}
export default HamRadio;