document.getElementById('submitButton').addEventListener('click', function() {
    // Get values from dropdown, hidden input, and selected radio button
    const filterValue = document.getElementById('filter').value;
    const pageValue = document.getElementById('page').value;
    const numberValue = document.querySelector('input[name="number"]:checked').value;

    // Construct the request payload
    const requestData = {
        request: [
            { page: pageValue },
            { number: parseInt(numberValue, 10) },
            { filter: parseInt(filterValue, 10) }
        ]
    };
   // Define the URL of the Django endpoint
   const url = 'http://localhost:8000/storefront/mcard/';  // Replace with the actual endpoint

   alert("sending request!");
    // Send POST request to the server
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()  // Use a helper function to include the CSRF token
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();  // Expecting HTML snippet as response
    })
    .then(htmlSnippet => {
        // Update the div with the received HTML snippet
        document.getElementById('thisProduct').innerHTML = htmlSnippet;
    })
    .catch(error => {
        console.error('Error:', error);
    });
});

// Helper function to get CSRF token from Django's CSRF cookie
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
