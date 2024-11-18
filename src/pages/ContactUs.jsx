import Navbar from '../components/Navbar'

function ContactUs() {
    return (
      <div className="container"><Navbar />
        <h1>Contact Us</h1>
        <p> <iframe align="top" frameborder="0" scrolling="yes" src="https://backend.engineering-z.com/contactus/" width="100%" height="600"></iframe></p>
        <p>
          Or you can  <a href="mailto:contact@engineering-z.com" >email us </a></p>
        <p> </p>
      </div>
    );
  }
  
  export default ContactUs;