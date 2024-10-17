import Navbar from '../components/Navbar'


const SmartHome = () => {
  return (
    <div className="container"><Navbar />
      <h1>SmartHome</h1>
      <div class="text-paragraph">
      <p>The first, most essential part of advancing the Internet of Things IoT in small business and residential scenarios, is to maintain cyber-security.  We achieve this by :</p>
      <p>1.  Ensuring that exposure to the public internet is controlled.  The dangers that exist on the internet must be blocked while, of course, the users inside the home or business need to maintain access to the resources of the internet. </p>
      <p>  At <b>Engineering-Z</b> we achieve this in much the same way  large corporations protect their networks, which is to block intruders, and keep those services that are exposed to the internet well separated from the users and assets within.</p>
      <p> 2.  Within the 'home' network, we segregate segments to reduce the risk that a single device could infect other devices.  In a small business, this also ensures that information types (such as finance, production, or personnel records) are appropriately protected. </p>
      </div>
      <img src='/images/smarthome/IoT_WAN_cloudflare.jpg' width='1000' height='800'/>
      <div class="text-paragraph">
        <p>In the diagram above, a home office segment is segregated from an IoT segment, and from a segments where users may have phone, tablets, and gaming systems.</p>
      <p>  The router that formulates and protects the Office segment is capable of establishing a 'tunnel' to a cloud-based server which hosts additional services through Docker containers.  In this instance , the office segments hosts additional services for all users including proxy and add-scraping.</p>
      <p>   
        Because the IoT segment may contain devices that may be of questionable origin - they are not allowed to communicate with any of the other segments and are only allowed to communicate with authorized 'cloud-based' services - such as an MQTT server.  This segment also hosts additional
        'Smart Home' functions such as 'NodeRed', automated irrigation, and wireless Single-Board computing platforms to collect telemetry and control lights, pumps, and other devices. </p></div>
   
    <div class="text-paragraph">
      <p> <b>Engineering-Z</b> leverages two cloud-based providers to achieve world-class performance for users while providing exceptional security protections to the entire network. </p>
        <p>The first provider, Digital Ocean in this example, hosts containerized services that provide an integrated web-based experience for visualizing the telemetry and controls of the IoT enabled smart-home - securely, from anywhere in the world.   It achieves this by hosting an OpenVPN server 
        - allowing mobile users to connect securely to appropriate resources within the network.  Wether its a camera feed, opening a garage door, or accessing high-density Network Storage - the users of a solution created by <b>Engineering-Z</b> will have secure, world-wide access.  </p>
<p>  The second provider, CloudFlare, provides  world-class Content Delivery, Domain Name resolution, web-hosting, and adaptive security controls from thousands of locations across the globe.   This provides exceptional security as well as fast-loading pages.</p>
    </div>
    </div>
  );
};

export default SmartHome;
