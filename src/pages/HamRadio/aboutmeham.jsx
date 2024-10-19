import Navbar from '../../components/Navbar'
import { Link } from 'react-router-dom';

function HamRadioAbout() {
  return (
    <div className="container"><Navbar />
      <h1>My Interest in Ham Radio</h1>
      <p>
      <table width="100%">
        <tbody><tr>
          <td width="10%"><img src='/images/hamradio/ft818.jpg' width='160' height='184'/>
          </td><td> <p>
          I got my novice license (KA0ZKV) in 1986 while in high school... and upgraded to Tech+ while in Electrical Engineering at Kansas State ( W0QQQ  is still the club callsign). 
            I tried to upgrade to General / Advanced - but couldn't defeat the 13wpm 'wall'. &nbsp;&nbsp; Maybe this will be the year ! </p>
        <p>I joined the Army at the start of the 1st Gulf war and enjoyed 11yrs active duty and 2yrs in the Reserves thereafter. &nbsp; While serving in the states I continued to stay active in clubs at Ft Riley (Manhattan, KS)  
          and Ft Bragg (Fayetteville, NC) and have always had a passion for Emergency Comms.  Like some others,  I slipped away from the hobby as I started a family and a business.</p>
          <p>I now have an <Link to='/hamradio'>  online store <img src='/images/EnggZ_logo3d.png' width='30' height='30'/> </Link>  to showcase some of my HamRadio  inventions and customized 3D products.</p>
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
      <p><a href="http://s11.flagcounter.com/more/giA"><img src="https://s11.flagcounter.com/count2/giA/bg_FFFFFF/txt_000000/border_CCCCCC/columns_2/maxflags_10/viewers_0/labels_0/pageviews_0/flags_0/percent_0/" alt="Flag Counter" border="0"/></a></p>
      <p> <iframe align="top" frameborder="0" height="500" scrolling="yes" src="https://logbook.qrz.com/lbstat/KQ4EWW/" width="640"></iframe></p>
      <p> <iframe align="top" frameborder="0" height="850" scrolling="yes" src="https://pskreporter.info/pskmap.html?preset&callsign=KQ4EWW&txrx=tx&blankifnone=1&showsnr=1&hidetime=1&mapCenter=38.,-96,5" width="1340"></iframe></p>
      
      <p></p>
     
      </p>
    </div>
  );
}
export default HamRadioAbout;