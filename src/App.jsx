
import './assets/css/customStyles.css'
import Home from './pages/Home'
import Lights from './pages/Lights'
import SmartHome from './pages/SmartHome'
import Gazebo from './pages/Gazebo'
import HamRadio from './pages/HamRadio'
import ThreeD from './pages/ThreeD'
import Navbar from './components/Navbar'
import OurServices from './pages/Services'
import ContactUs from './pages/ContactUs'
import AboutUs from './pages/AboutUs'

import { BrowserRouter, Routes, Route  } from 'react-router-dom'

function App() {
  return (
    <>
    
      <div>
        <BrowserRouter>
          <Routes>
              <Route index element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/smarthome" element={<SmartHome />} />
              <Route path="/lights" element={<Lights />} />
              <Route path="/gazebo" element={<Gazebo />} />
              <Route path="/hamradio" element={<HamRadio />} />
              <Route path="/3d" element={<ThreeD />} />
              <Route path="/services" element={<OurServices />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/about" element={<AboutUs />} />


          </Routes>
        </BrowserRouter>
      </div>

    </>
  )
}

export default App;
