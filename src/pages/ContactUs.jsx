import Navbar from "../components/Navbar";

function ContactUs() {
  const backendURL = import.meta.env.VITE_BACKEND_URL;
  return (
    <div className="container">
      <Navbar />
      <h1>Contact Us</h1>
      <p>
        {" "}
        <iframe
          align="top"
          frameborder="0"
          scrolling="yes"
          src={`${backendURL}/contactus/`}
          width="100%"
          height="600"
        ></iframe>
      </p>
      <p>
        Or you can <a href="mailto:contact@engineering-z.com">email us </a>
      </p>
      <p> </p>
    </div>
  );
}

export default ContactUs;
