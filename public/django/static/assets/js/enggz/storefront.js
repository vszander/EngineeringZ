// Helper function to get CSRF token from Django's CSRF cookie


function sale_item_request() {

    // Define the URL of the Django endpoint
//const url = 'http://localhost:8000/storefront/sale_item_request/';  // Replace with the actual endpoint
const url = 'https://backend.engineering-z.com/storefront/sale_item_request/';  // Replace with the actual endpoint

alert("Im there!");

  // Get the selected value from the dropdown
  const selectedValue = document.getElementById("dropdown").value;

   
// Define the data to send to the server as JSON
const data = {
  key1: selectedValue,
  received_data: 'value2'
};

alert("Im here!");

// Send JSON request to the server
fetch(url, {
  method: 'POST',                    // Specify the HTTP method
  headers: {
    'Content-Type': 'application/json',  // Set content type to JSON
    'X-CSRFToken': getCsrfToken()        // Include CSRF token if required
  },
  body: JSON.stringify(data)             // Convert data to JSON string
})
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  return response.json();                // Parse response as JSON
})
.then(jsonResponse => {
  console.log('Server response:', jsonResponse);  // Handle server response
})
.catch(error => {
  console.error('Error:', error);         // Handle errors
});

}

function getCsrfToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('csrftoken=')) {
          cookieValue = cookie.substring('csrftoken='.length, cookie.length);
          break;
        }
      }
    }
    return cookieValue;
  }