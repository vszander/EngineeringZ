//import React from 'react';
import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom';

function Lights() {
  return (

<div className="container" scrolling="yes">
    <Navbar />
     <h1>Holiday Lights Page</h1>
      <p>This page contains information about Lights.</p>

      <p><Link to='/store'>  here </Link>.</p>
    </div>
  
  );
}

export default Lights;