import { Link } from "react-router-dom";
function NavButtons() {
  const buttons = [
    { name: "Lights", link: "/lights", image: "/images/xlights/button2.png" },
    { name: "3D", link: "/3d", image: "/images/3D/3D1.png" },
    {
      name: "Smart Home",
      link: "/smarthome",
      image: "/images/smarthome/SmartHome.png",
    },
    {
      name: "Ham Radio",
      link: "/hamradio",
      image: "/images/hamradio/HamRadioButton.png",
    },
    {
      name: "Gazebo",
      link: "/gazebo",
      image: "/images/gazebo/Gazebo_button.png",
    },
  ];

  return (
    <>
      <div className="container">
        <h1 className="my-4">Welcome to My Website</h1>
        <table className="table">
          <tbody>
            <tr>
              {buttons.map((button) => (
                <td key={button.name} className="text-center">
                  <Link to={button.link}>
                    <img
                      src={button.image}
                      alt={button.name}
                      className="img-button"
                      onMouseOver={(e) =>
                        (e.currentTarget.style.transform = "scale(1.1)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    />
                  </Link>
                  <p>{button.name}</p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default NavButtons;
