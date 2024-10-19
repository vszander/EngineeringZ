import Navbar from '../components/Navbar'
import { Link } from 'react-router-dom';

function PowerZ() {
    return (
        <div className="container"><Navbar />
          <h1>Introducing the Z-Power IoT Power Pack </h1>
          <p>The Z-Power IoT Power Pack is a Meshtastic enabled , ‘smart’, IoT product to provide portable,temporary, re-chargable, managed 12v Power and MQTT control to a variety of sensors or power consuming devices.</p>
<p>
Example ‘power consumer’ use cases include:
<ul>
<li>
    Temporary (emergency?) Repeater power for HamRadio / SOTA activation</li>
    <li>   An easily deployed, long-duration, remote sensor ( i.e. Water pH & Temperature in a largely inaccessible stream) that can operate for weeks at a time, 
        and can be quickly replaced/recharged (through intervention?)  without interruption.</li>
    <li>   The ‘Parking Attendant’:  A Raspi controlled-PTZ camera with Raspi Object Detection / License Plate recognition (w/ real-time Mesh Reporting ) at a special event ( outdoor concert, NASCAR race, etc) or private lot ( construction site, hunting lodge, etc).
    </li>
    </ul>  </p>


<p>
The beauty of the Meshtastic enabled Z-Power managed remote power solution is:  it can leverage/manage solar, but doesn’t have to be sized as large as an un-managed power management system is.  If the battery storage is below a threshold and more cloudy weather is eminent … this solution will allow a battery swap OR re-charge WITHOUT interruption as it will support additional external (LiFePo) batteries.

</p>
<p>In the interest of extreme (backpack) portability, the Z-Power management board provides self-contained LiPo battery and a ‘keyhole’ module plug that will expose the Meshtastic ESP32 pins to provide open expandability. The Z-Power management board leverages a serial-parallel (74595 ) output bus to provide power-management, LED indicators, and an ‘unlimited’ number of channels through daisy-chaining. PWM is available (has been tested with 16 channels on Arduino UNO at 16 PWM levels (which provides smooth dimming) ), but may be limited (especially with longer ‘daisy-chains’).</p>

<h2>What is the state of the product ?</h2>
<p>
Prototype Circuit boards are being tested.

</p>
<img src='/images/powerz/Testing_buck-300x158.jpg' width='300' height='158'/>
<p>
We have working Arduino code / libraries to control the internal circuits ( 3ea ADS1015 ADC sensors and a multi-chain 74HC595 serial-parallel bus).   We Need assistance from a more experienced MeshTastic developer to provide guidance on our draft PlatformIO code. We will offer a free prototype Z-Power system to someone who can review / correct our code.
</p>
<h2>Modular Design - Carrier Board</h2>
<p>
Modular Board Design Allows future support of other LoRA Micro-controllers.  The initial design is around the HelTec V3 – a well supported Meshtastic LoRA Microcontroller.
</p>
<p>
The diagram below depicts how a supported LoRA equipped micro-controller (HelTec v3) plugs into a ‘Carrier Board’ which routes selected GPIO pins to a 2×15 header arrangement.   I plan to ‘open-source’ the Carrier Board.
</p>
<img src='/images/powerz/Modular_Design_V0-1.png' width='230' height='286'/>
<p>
The LoRA Carrier Board maps ‘unused’ GPIO pins to the ‘back board’.   The diagram (v 0.1)  depicts a HelTec V3 with pins that I selected. This modular design will allow future support for other LoRA boards. This design utilizes a SDA/SCL (I2C) (using HelTec GPIO 47/48 respectively) and UART RX/TX (HelTec RXD (pin 5) and TXD (pin 6) both of which are passed through to the ‘keyhole’ at 3.3 logic levels.  GPIO pins 2,3,4,6,7 are passed to the ‘backboard’ and GPIO pins 4,6,7 are passed directly to the keyhole.
GPIO 6 can be used as an alternate ‘DATA’ line (DOUT) to the daisy-chain.</p>
<img src='/images/powerz/HelTec_Carrier_Pinout.png' width='653' height='286'/>

<h2>Modular Design - BackBoard</h2>

<p>
The ‘Backboard’ provides a ‘managed’ connection to an internal 15v LiPo Battery pack and hosts 2ea 5v regulated power supplies: one (5A) for the esp32 board, all related internal circuits, and the unswitched power at the keyhole. The other 5A is switched and available via a female USB port or pins. Currently, the backboard manages a 12v, 3A power ‘input’. An internal solar MPPT circuit is planned but it will accept 20v (sufficient for ‘12v’ solar systems). Additionally, the backboard hosts 16 channels of 5v outputs. 8 for indicators, 8 for power management circuitry, and passes the ‘daisy-chain’ on.
</p>
<img src='/images/powerz/Backboard-768x328.png' width='669' height='286'/>
<p>
The ‘keyhole’ is what provides modularity to the Z-Power Management design. Meshtastic enthusiasts will now have ‘unlimited’ number of 5v output channels, RX/TX, I2C, and esp32 Reset (RST) passthrough,  a high-quality I2C Analog-to-Digital Channel, 2 default 5v channels ( Keyhole 1&2) (without daisy-chaining), 5v Power (one switched and one un-switched (sufficient to easily power an external Raspi3B+).
</p>
<img src='/images/powerz/Keyhole_Pinout.png' width='680' height='264'/>
<p>
We call this a ‘keyhole’ .. because the supporting case will have a modular ‘slide-in’ design to allow easy attachment of future modules and provide sufficient mechanical connection for future designs.
</p>
</div>


);
}
export default PowerZ;