import { Link } from "react-router-dom";
import "../assets/css/Home.css";
import Navbar from "../components/Navbar";
import "../assets/css/HeroSection.css";
import HomeExtras from "./HomeExtras";

function Home() {
  return (
    <div className="container-fluid p-0">
      <Navbar />

      {/* HERO SECTION (above the fold) */}
      <div
        className="hero-container"
        style={{ backgroundImage: "url('/images/xlights/gifs/Cover1.gif')" }}
      >
        <div className="hero-overlay"></div>

        <div className="hero-content text-center text-white">
          <h1 className="hero-title">Fantastical Lighting</h1>
          <p className="hero-subtitle">
            White glove lighting displays for holidays, parties, and life’s
            brightest moments
          </p>
          <div className="mt-4">
            <Link to="/services" className="btn btn-primary me-3">
              Explore Services
            </Link>
            <Link to="/lights" className="btn btn-outline-light">
              See Light Shows
            </Link>
          </div>
        </div>
      </div>

      {/* SERVICES OVERVIEW SECTION */}
      <section className="services-overview py-5 bg-cream">
        <div className="container text-center">
          <h2 className="mb-4 text-dark">What We Offer</h2>
          <p className="mb-5 text-muted">
            From permanent trim lighting to unforgettable seasonal displays,
            we’ve got you covered.
          </p>

          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card shadow border-0 h-100">
                  <div className="card-body d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-center mb-2">
                        <div className="icon icon-shape bg-gradient-primary text-white rounded-circle me-3">
                          <i className="material-icons">design_services</i>
                        </div>
                        <h5 className="card-title mb-0">Custom Design</h5>
                      </div>

                      <p className="card-text">
                        Our team works with you to design a year-round lighting
                        layout that accentuates your home's features and
                        enhances every holiday.
                      </p>
                    </div>
                    <Link to="/packages" className="btn btn-outline-primary">
                      Learn More
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="icon icon-shape bg-gradient-success text-white rounded-circle me-3">
                      <i className="material-icons">handshake</i>
                    </div>
                    <h5 className="card-title mb-0">White Glove Service</h5>
                  </div>

                  <p className="card-text">
                    From mounting to wiring to emplacement and retrieval — we
                    handle it all while you relax.
                    <br />
                    Our service-after-the-sale is second to none.
                  </p>

                  <Link to="/services" className="btn btn-outline-success">
                    See Process
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="icon icon-shape bg-gradient-info text-white rounded-circle me-3">
                      <i className="material-icons">event_repeat</i>
                    </div>
                    <h5 className="card-title mb-0">Seasonal Refresh</h5>
                  </div>

                  <p className="card-text">
                    We update elements and themes for each celebration, then
                    store them securely in the off-season.
                  </p>

                  <Link to="/lights" className="btn btn-outline-info">
                    See Examples
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeExtras />
    </div>
  );
}

export default Home;
