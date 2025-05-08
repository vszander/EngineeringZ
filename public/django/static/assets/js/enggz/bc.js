async function bc() {
  var callingURL = getbcURL();
  var requestData = "{}";

  //    var location = getClientInfo();
  //var username = "Bohdee";
  let session = sessionStorage.getItem("sessionId");

  if (!session) {
    // If not, generate a new session ID (you can use any method you prefer for generating IDs)
    session = "session_" + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("sessionId", session);
    // now gather IP address and start a breadcrumb
    const ipaddress = await getPublicIP(); //getClientInfo();
    console.log("returned Payload:", JSON.stringify(ipaddress));
    requestData = {
      request: [
        { data: session },
        { thisurl: getbcURL() },
        { ip: JSON.stringify(ipaddress) },
        { referrer: getbcreferrer() },
        { click: "initial" },
        { u: username },
      ],
    };
  } else {
    // there is a session... just send click data
    //alert("click data");
    // Now you can use sessionId in your requests
    console.log("BC Session ID:", session);
    const userInfo = document.getElementById("user-info");
    const isLoggedIn = userInfo.getAttribute("data-logged-in") === "true";
    username = userInfo.getAttribute("data-username");
    isAdmin2 = userInfo.getAttribute("data-is-admin") === "true";
    console.log("I'm in  BC");

    requestData = {
      request: [
        { data: session },
        { thisurl: getbcURL() },
        { referrer: getbcreferrer() },
        { click: "pageload" },
        { u: username },
        { staff: isAdmin2 },
        //   { loggedin: isLoggedIn },
      ],
    };
  }

  console.log({ username, isAdmin2 }); // this shows as 'OBJECT' in the browser console

  // Define the URL of the Django endpoint
  //  const url = 'https://backend.engineering-z.com/bc/';  // Replace with the actual endpoint
  const url = "http://localhost:8000/bc/";
  /*    Breadcrumbs (bc)  is used to collect information about user(or malware) behavior by recording session information

      The urls.py  resolution is  achieved in the /engineeringz/home/urls.py   and the method is contained in /engineeringz/home/enggz_views.py
        the method  is  enggz_views.breadcrumbs
        data is stored in the database at        public.home_breadcrumbs

      This file bc.js  should be loaded last ... as page loading functions will collect user data and page variables
    
    */

  // const url = 'https://backend.engineering-z.com/sbc/';

  // Send POST request to the server
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getBCToken(), // Use a helper function to include the CSRF token
    },
    body: JSON.stringify(requestData),
    credentials: "include", // ensure cookies are sent
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json(); // Expecting HTML snippet as response
    })
    .then((jsonresponse) => {
      // .then((htmlSnippet) => {
      // Update the div with the received HTML snippet
      // document.getElementById('thisList').innerHTML = htmlSnippet;
      //  alert(htmlSnippet);
      console.log("BC response:", jsonresponse);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function getbcURL() {
  return window.location.href;
}

function getbcreferrer() {
  return document.referrer;
}

async function getPublicIP() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    console.log("Client Public IP:", data.ip);
    return data.ip;
  } catch (error) {
    console.error("Error fetching IP:", error);
  }
}

async function getClientInfo() {
  const controller = new AbortController();
  const timeout = 5000; // Set timeout in milliseconds (e.g., 5000ms = 5 seconds)

  // Set a timeout to abort the fetch request
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch("http://ip-api.com/json", {
      signal: controller.signal,
    });

    clearTimeout(timeoutId); // Clear the timeout if fetch completes in time

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success") {
      // Create your custom JSON object using the parsed data
      const customPayload = {
        status: data.status,
        country: data.country,
        countryCode: data.countryCode,
        region: data.region,
        regionName: data.regionName,
        city: data.city,
        zip: data.zip,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        organization: data.org,
        as: data.as,
        queryIP: data.query,
      };

      //  console.log('Custom Payload:', JSON.stringify(customPayload));

      return customPayload;
    } else {
      console.error("Failed to fetch IP data:", data.message);
      return "status:Failed to fetch IP data";
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("Fetch request timed out");
      return "status:Fetch request timed out";
    } else {
      console.error("Error fetching IP data:", error);
      return "status:Error fetching IP data:";
    }
  }
}

// Helper function to get CSRF token from Django's CSRF cookie
function getBCToken() {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith("csrftoken=")) {
        cookieValue = cookie.substring("csrftoken=".length, cookie.length);
        break;
      }
    }
  }
  return cookieValue;
}
