import Navbar from '../components/Navbar'

function AboutUs() {
    return (
      <div className="container"><Navbar />
        <h1>About Us</h1>
        <p>
        <table width="100%">
          <tbody><tr>
            <td width="10%"><img src='/images/Uber_profile_pic.jpg' width='80' height='84'/>
            </td><td> <p>
            Mr. Zander is an innovative, customer-facing systems engineer with a widely varied background in system-of-systems integration and design.  He brings over twenty years of direct experience of requirements definition and software design in various industries ranging from U.S. Federal Government, Industrial / Manufacturing, and Embedded / Internet of Things (IoT). </p>
           </td>
        </tr>
        <tr><td colSpan='2'>
        <p>
        A proven leader in ambiguous situations; Mr. Zander experiences as a entrepreneur, engineer, and consultant to businesses and government agencies across the globe have set him apart in the IoT solution space.  
         Mr. Zander leveraged his background in Systems Engineering, Security Operations, and various software development approaches to create numerous, novel solutions – many for large corporations and NATO. 
           As a project leader, he has managed numerous successful projects that involve hybrid-cloud software integration (IBM QRadar, Nozomi Guardian, ServiceNow, etc), middleware and enterprise class (mobile-to-cloud) development (C++ / Python / Java); 
           Security Operations Centers and team building; OT Security, hybrid-cloud architectures, and full-stack web solution development.  This experience, coupled with strong communication skills and technical project management have resulted in repeated customer success and accolades. 
            His strength is leading technical implementation teams as a client-facing systems engineer with a keen appreciation for functional requirements and troubleshooting. 
             As a technical consultant, his interpersonal skills, innovation, and technical resourcefulness  have impressed clients and delivered exceptional results.</p>
          </td></tr>
        </tbody>
        </table>
        </p>
      </div>
    );
  }
  
  export default AboutUs;