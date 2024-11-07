const express = require('express')
const path = require('path')
const http = require('http');
const socketIo = require('socket.io');

const app = express()
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000

const Bio = require('./bio')
const XLSX = require('xlsx')
const fs = require('fs')

const biometric = new Bio('171.16.109.24', 4370, 10000, 4000)
const logsFileName = 'phihopeLogs.json'
const usersFileName = 'phihopeUsers.json'

// Route to get the result of the Node code
app.get('/api/readUsers', (req, res) => {
    fs.readFile(usersFileName, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading file')
        } else {
            res.json({ result: data })
        }
    })
})

app.get('/api/users', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        io.emit('status-update', { status: 'Connected!' })
        io.emit('status-update', { status: 'User Count: ' + info.userCounts})

        const users = await biometric.getUsers().catch(err => {
            console.error('Unhandled error in getUsers:', err)
        })

        await biometric.disconnect()
        io.emit('status-update', { status: 'Disconnected!' });

        biometric.toJSON(users.data, usersFileName)
        const jsonData = JSON.stringify(users.data, null, 2)

        res.setHeader('Content-Type', 'application/json');
        res.json({ result: jsonData })
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
})

app.get('/api/transactions', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        io.emit('status-update', { status: 'Connected!' })
        io.emit('status-update', { status: 'Log Counts: ' + info.logCounts})

        const logs = await biometric.getTransactions().catch(err => {
            // Handle any uncaught errors from the test function
            console.error('Unhandled error in getTransactions:', err)
        })

        await biometric.disconnect()
        io.emit('status-update', { status: 'Disconnected!' });

        biometric.toJSON(logs.data, logsFileName)
        const jsonData = JSON.stringify(logs.data, null, 2)

        res.setHeader('Content-Type', 'application/json');
        res.json({ result: jsonData })
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
})

// app.get('/start-task', (req, res) => {
//     // Send an initial response immediately
//     res.send('Task started, check for updates.');

//     // Notify the client about progress updates
//     let progress = 0;

//     const interval = setInterval(() => {
//         progress += 10;
//         io.emit('status-update', { progress, status: 'Processing...' });
//         if (progress >= 100) {
//         clearInterval(interval);
//         io.emit('status-update', { progress: 100, status: 'Completed' });
//         }
//     }, 1000);  // Simulating a long task with a 1-second delay between updates
// });

// Serve static files (the HTML file) from the "public" directory
app.use('/', express.static(path.join(__dirname + '/public')))

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
