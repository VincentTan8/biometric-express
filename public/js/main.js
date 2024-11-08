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



const socket = io();  // Connect to the Socket.IO server
// Listen for 'status-update' event from the server
socket.on('status-update', (data) => {
    document.getElementById('status').innerHTML = `Status: ${data.status}`;
})
// fetch('/start-task').then(response => response.text()).then(console.log);