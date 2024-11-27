
import { Link } from 'react-router-dom';
import '../assets/css/Home.css';
import Navbar from '../components/Navbar'

function Home() {

  const buttons = [
    { name: 'Holiday Lights', link: '/lights', image: '/images/xlights/button2.png' },
    { name: '3D', link: '/3d', image: '/images/3D/3D1.png' },
    { name: 'Smart Home', link: '/smarthome', image: '/images/smarthome/SmartHome1.png' },
    { name: 'Ham Radio', link: '/hamradio', image: '/images/hamradio/HamRadioButton.png' },
    { name: 'Gazebo', link: '/gazebo', image: '/images/gazebo/Gazebo_button.png' }
  ];
  
  return (

    <div className="container"><Navbar />
      <h1 className="my-4">Engineering-Z</h1>
      <img class="img-fluid border-radius-lg" src='/images/Webpage_collage.png' width='1000' height='500'/>
      <table className="table">
         <tbody>
          <tr>
            {buttons.map(button => (
              <td key={button.name} className="text-center">
                  <Link to={button.link}>
                    <img 
                      src={button.image} 
                      alt={button.name}
                      className="img-button" 
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} 
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </Link>
                  <p>{button.name}</p>
                </td>
            ))}
            </tr>
        </tbody>
      </table>
    </div>
  );
}

export default Home;