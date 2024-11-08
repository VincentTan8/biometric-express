// Fetch data from the Node server and display it on the page
async function getUsers() {
    try {
        const response = await fetch('/api/users'); // Send request to the server
        const data = await response.json();        // Parse JSON response

        // Display the data
        document.getElementById('result').textContent = data.result;
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading data';
        console.error('Error:', error);
    }
}

async function readUsers() {
    try {
        const response = await fetch('/api/readUsers'); 
        const data = await response.json();        // Parse JSON response

        // Display the data
        document.getElementById('result').textContent = data.result;
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading data';
        console.error('Error:', error);
    }
}

async function getTransactions() {
    try {
        const response = await fetch('/api/transactions'); 
        const data = await response.json();        // Parse JSON response

        // Display the data
        document.getElementById('result').textContent = data.result;
    } catch (error) {
        document.getElementById('result').textContent = 'Error loading data';
        console.error('Error:', error);
    }
}

async function addUser() {
    // Get input values
    const id = document.getElementById('id').value;
    const name = document.getElementById('name').value;
    const card = document.getElementById('card').value;

    // Prepare data to send
    const data = { id, name, card }
    try {
        // Send POST request using fetch
        const response = await fetch('/api/addUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        // Handle the response
        const result = await response.json();
        document.getElementById('status').textContent = result.message;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').textContent = 'Failed to send data.';
    }
}

async function deleteUser() {
    // Get input values
    const deviceID = document.getElementById('deviceID').value;

    // Prepare data to send
    const data = { deviceID }
    try {
        // Send POST request using fetch
        const response = await fetch('/api/deleteUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        // Handle the response
        const result = await response.json();
        document.getElementById('status').textContent = result.message;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').textContent = 'Failed to send data.';
    }
}

const socket = io();  // Connect to the Socket.IO server
// Listen for 'status-update' event from the server
socket.on('status-update', (data) => {
    document.getElementById('status').innerHTML = `Status: ${data.status}`;
})
// fetch('/start-task').then(response => response.text()).then(console.log);