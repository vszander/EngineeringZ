import { Link } from 'react-router-dom';
import '../assets/css/customStyles.css';

export default function Navbar() {
  return (
    
    <nav className="navbar navbar-expand-lg navbar-dark" style={{ backgroundColor: '#496dba' }}>
      <div className="container-fluid">
        <table width="100%">
          <tbody><tr>
            <td width="65%"></td><td>
        &nbsp;
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"><Link className="navbar-brand" to="/home">Home</Link></span>
        </button></td>
        <td>
        <div className="collapse navbar-collapse" id="navbarNav">
          
              <Link className="nav-link" to="/services">Services   </Link>
           
              <Link className="nav-link" to="/contact">Contact   </Link>
          
              <Link className="nav-link" to="/about">About   </Link>
          
        </div>
        </td>
        </tr>
        </tbody>
        </table>
        <img src='/images/navbar.png' width='1000' height='12'/>
      </div>
    </nav>
    
  );
}

