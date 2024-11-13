const express = require('express')
const path = require('path')
const http = require('http');
const socketIo = require('socket.io');

const app = express()
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000

const Bio = require('./bio')
const fs = require('fs')

// User defined 
const biometric = new Bio('171.16.114.76', 4370, 10000, 4000)
const logsFileName = 'testLogs.json'
const usersFileName = 'testUsers.json'

//Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files (the HTML file) from the "public" directory
app.use('/', express.static(path.join(__dirname + '/public')))

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

app.get('/api/readTransactions', (req, res) => {
    fs.readFile(logsFileName, 'utf8', (err, data) => {
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
        
        let users = { data: [] }
        if(info.userCounts > 0) {
            io.emit('status-update', { status: 'Getting users...'})
            users = await biometric.getUsers().catch(err => {
                io.emit('status-update', { status: 'Unhandled error in getUsers: ' + err})
            })
            io.emit('status-update', { status: 'Done!'})
        }
        await biometric.disconnect()

        biometric.toJSON(users.data, usersFileName)
        const jsonData = JSON.stringify(users.data, null, 2)

        res.setHeader('Content-Type', 'application/json');
        res.json({ result: jsonData })
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
})

//todo check if logs is 0
app.get('/api/transactions', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        io.emit('status-update', { status: 'Connected!' })
        io.emit('status-update', { status: 'Log Counts: ' + info.logCounts})
        io.emit('status-update', { status: 'Loading Transactions...'})
        const logs = await biometric.getTransactions().catch(err => {
            // Handle any uncaught errors from the test function
            io.emit('status-update', { status:'Unhandled error in getTransactions: ' + err})
        })
        io.emit('status-update', { status: 'Done!'})
        await biometric.disconnect()

        biometric.toJSON(logs.data, logsFileName)
        const jsonData = JSON.stringify(logs.data, null, 2)

        res.setHeader('Content-Type', 'application/json');
        res.json({ result: jsonData })
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
})

app.post('/api/addUser', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        io.emit('status-update', { status: 'Connected!' })
        io.emit('status-update', { status: 'User Count: ' + info.userCounts})

        let users = { data: [] }
        if(info.userCounts > 0) {
            users = await biometric.getUsers().catch(err => {
                io.emit('status-update', { status: 'Unhandled error in getUsers: ' + err})
            })
        }

        //Employee ID, Name, Card Num
        const { id, name, card } = req.body
        io.emit('status-update', { status: "Adding user..." });
        await biometric.addUser(users.data, id, name, card)
        io.emit('status-update', { status: "Added " + name });
        await biometric.disconnect()
        io.emit('status-update', { status: 'Disconnected!' });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ result: 'Failed to fetch data' });
    }
})

app.post('/api/deleteUser', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        io.emit('status-update', { status: 'Connected!' })
        io.emit('status-update', { status: 'User Count: ' + info.userCounts})

        //Device ID
        const { deviceID } = req.body
        io.emit('status-update', { status: "Deleting user..." });
        await biometric.deleteUser(deviceID)
        io.emit('status-update', { status: "Deleted uid: " + deviceID});
        await biometric.disconnect()
        io.emit('status-update', { status: 'Disconnected!' });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ result: 'Failed to fetch data' });
    }
})

app.post('/api/updateUserbase', async (req, res) => {
    try {
        const { filename } = req.body
        
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        io.emit('status-update', { status: 'Connected!' })

        // get device users and make backup
        let users = { data: [] }
        if(info.userCounts > 0) {
            io.emit('status-update', { status: 'Getting users for backup...'})
            users = await biometric.getUsers().catch(err => {
                io.emit('status-update', { status: 'Unhandled error in getUsers: ' + err})
            })
        }
        biometric.toJSON(users.data, "userBackup " + new Date() + ".json")

        //delete everything on device (3000 is the user limit)
        for (const user of users.data) {
           await biometric.deleteUser(user.uid)
           io.emit('status-update', { status: "Deleted uid: " + user.uid});
        }

        //add everything from filename
        io.emit('status-update', { status: "Uploading " + filename + "..."})
        const newFile = await fs.promises.readFile(filename, 'utf-8')
        const newFileJson = JSON.parse(newFile)
        
        //since we are updating from scratch
        users = { data: [] }
        for(const user of newFileJson) {
            const id = user.userId
            const name = user.name
            const card = user.cardno

            const newUID = await biometric.addUser(users.data, id, name, card)
            users.data.push({"uid": newUID})
            io.emit('status-update', { status: "Added user: " + name });
        }
        await biometric.disconnect()
        io.emit('status-update', { status: 'Disconnected!' });
        
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ result: 'Failed to fetch data' });
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

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
