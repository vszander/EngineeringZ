import React from "react";
import { Link } from "react-router-dom";
import bootstrap from "bootstrap/dist/css";

const ListGroup: React.FC = () => {
  //  https://getbootstrap.com/docs/5.3/components/list-group/
  //
  return (
    <>
      <h1 className="my-4">ListGroup 1</h1>
      <ul className="list-group">
        <li className="list-group-item">An item</li>
        <li className="list-group-item">A second item</li>
        <li className="list-group-item">A third item</li>
        <li className="list-group-item">A fourth item</li>
        <li className="list-group-item">And a fifth one</li>
      </ul>

      <div>
        <nav>
          <Link to="/SmartHome">
            <img
              src="/images/smarthome/SmartHome.png"
              className="img-button"
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "scale(1.1)")
              }
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          </Link>
        </nav>
      </div>

      <img
        src="/images/EngineeringZ.png"
        className="img-button"
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      />
      <img
        src="/images/EnggZ_logo3d.png"
        className="img-button"
        onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
      />
    </>
  );
};
export default ListGroup;
