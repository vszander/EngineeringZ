import React from "react";
import { Link } from "react-router-dom";
import "../assets/css/Packages.css"; // You'll define styles here

function Packages() {
  const packages = [
    {
      tier: "Modest",
      icon: "light_mode",
      color: "bg-light-green text-white",
      image: "/images/packages/basic1.png",
      price: "Starting at $2,500",
      description:
        "Simple trim lighting with one seasonal feature. Clean, elegant, and hassle-free.",
    },
    {
      tier: "Large",
      icon: "celebration",
      color: "bg-primary text-white",
      image: "/images/packages/basic2.png",
      price: "Starting at $6,500",
      description:
        "Trim lighting with multiple animated yard elements. Perfect for seasonal excitement.",
    },
    {
      tier: "Grandiose",
      icon: "music_note",
      color: "bg-dark text-white",
      image: "/images/packages/basic3.png",
      price: "Starting at $10,000",
      description:
        "Full home and yard display with synchronized music. The ultimate show-stopper.",
    },
  ];

  return (
    <div className="container py-5">
      <h2 className="text-center text-dark-blue mb-4">
        Choose Your Level of Wow
      </h2>
      <p className="text-center text-muted mb-5">
        All packages include installation, maintenance, removal, and white-glove
        service.
      </p>

      <div className="row g-4">
        <div className="col-md-4 mb-4">
          <div className="tier-card card shadow-sm">
            <div className="tier-image-wrapper">
              <img
                src="/images/xlights/tiers/Basic1_resized.png"
                alt="Modest Tier"
                className="tier-image"
              />
              <div className="price-overlay">💡 $600 – $1,200</div>
            </div>
            <div className="card-body">
              <h5 className="card-title text-primary">🎈 Modest</h5>
              <p className="card-text">
                Simple trim lighting and a single seasonal display. Great for
                first-timers or budget-friendly wow.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-4">
          <div className="card h-100 shadow-sm border-0 bg-white position-relative tier-card">
            <div className="tier-image-container">
              <img
                src="/images/xlights/tiers/Large-resized.png"
                className="card-img-top tier-image"
                alt="Large Package"
              />
              <div className="tier-price-overlay bg-primary text-white">
                $2,500–$4,500
              </div>
            </div>
            <div className="card-body">
              <h5 className="card-title text-primary">🎉 Large</h5>
              <p className="card-text">
                Includes all trim lighting, several animated shapes and seasonal
                displays. Perfect for families who love to celebrate in style.
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-4">
          <div className="card h-100 shadow-sm tier-card">
            <div className="image-container position-relative">
              <img
                src="/images/xlights/tiers/Grandios-resize.png"
                className="card-img-top tier-image"
                alt="Grandiose Tier"
              />
              <div className="price-overlay bg-dark text-white text-center">
                $3000 – $7500
              </div>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center mb-3">
                <div className="icon icon-shape bg-gradient-danger text-white rounded-circle me-2">
                  <i className="material-icons">celebration</i>
                </div>
                <h5 className="card-title mb-0">🎆 Grandiose</h5>
              </div>
              <p className="card-text">
                Full-home and yard display with advanced elements and
                synchronized music. Truly showstopping, customized
                installations.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-5">
        <Link to="/contact" className="btn btn-primary btn-lg">
          Book Your Free Design Consultation
        </Link>
      </div>
    </div>
  );
}

export default Packages;
