// Additional Home Page Sections (below the Hero)

import { Link } from "react-router-dom";

function HomeExtras() {
  return (
    <>
      {/* Section 1: How It Works */}
      <section className="bg-cream text-dark py-5">
        <div className="container text-center">
          <h2 className="mb-4">How It Works</h2>
          <div className="row text-center">
            {/* STEP 1 */}
            <div className="col-md-4 mb-4">
              <div className="p-4 shadow rounded bg-white h-100">
                <div className="icon icon-shape bg-gradient-primary text-white rounded-circle mb-3 mx-auto">
                  <i className="material-icons">design_services</i>
                </div>
                <h5 className="text-primary mb-2">1. Design</h5>
                <p>
                  We visit your home or business, take measurements, and plan
                  your dream display — whether elegant or extravagant.
                </p>
              </div>
            </div>

            {/* STEP 2 */}
            <div className="col-md-4 mb-4">
              <div className="p-4 shadow rounded bg-white h-100">
                <div className="icon icon-shape bg-gradient-success text-white rounded-circle mb-3 mx-auto">
                  <i className="material-icons">construction</i>
                </div>
                <h5 className="text-success mb-2">2. Install</h5>
                <p>
                  Our team installs trim lighting and decorative elements with
                  precision and care — no ladders or hassle for you.
                </p>
              </div>
            </div>

            {/* STEP 3 */}
            <div className="col-md-4 mb-4">
              <div className="p-4 shadow rounded bg-white h-100">
                <div className="icon icon-shape bg-gradient-info text-white rounded-circle mb-3 mx-auto">
                  <i className="material-icons">celebration</i>
                </div>
                <h5 className="text-info mb-2">3. Enjoy</h5>
                <p>
                  Sit back and admire your display — whether it’s a festive
                  animated show or a warm, classic glow. We’ll handle the rest.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Why Choose Us */}
      <section className="bg-white text-dark py-5">
        <div className="container text-center">
          <h2 className="mb-4">Why Choose Us?</h2>
          <div className="row justify-content-center">
            <div className="col-md-8">
              <ul className="list-unstyled text-start">
                <li className="mb-3">
                  <i className="material-icons text-success me-2">verified</i>
                  Veteran-Owned & Family-Operated in Jackson County, Georgia
                </li>
                <li className="mb-3">
                  <i className="material-icons text-success me-2">
                    emoji_events
                  </i>
                  White Glove Service From Design to Takedown
                </li>
                <li className="mb-3">
                  <i className="material-icons text-success me-2">
                    celebration
                  </i>
                  Customizable for Holidays, Parties, Birthdays, and More
                </li>
                <li className="mb-3">
                  <i className="material-icons text-success me-2">
                    auto_awesome
                  </i>
                  Unique Animated Light Shows Set to Music
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Final CTA */}
      <section className="bg-dark text-white text-center py-5">
        <h2 className="mb-3">Ready to Light Up Your Season?</h2>
        <p className="lead mb-4">
          Let us design a show your neighbors will never forget.
        </p>
        <Link to="/services" className="btn btn-primary btn-lg">
          Get a Free Consultation
        </Link>
      </section>
    </>
  );
}

export default HomeExtras;
