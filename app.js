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
const biometric = new Bio('171.16.114.76', 4370, 10000, 4000) //earthhouse
//const biometric = new Bio('171.16.114.88', 4370, 10000, 4000) //F18
const logsFileName = 'testLogs.json'
const usersFileName = 'testUsers.json'

// const biometric = new Bio('171.16.109.24', 4370, 10000, 4000)
// const logsFileName = 'phihopeLogs.json'
// const usersFileName = 'phihopeUsers.json'

//Wetalk
// const biometric = new Bio('171.16.113.238', 4370, 10000, 4000)

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
        if(info) {
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
        } else {
            io.emit('status-update', { status: 'Failed to get users' })
        }
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
})

app.get('/api/transactions', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'Log Counts: ' + info.logCounts})
            
            let logs = { data: [] }
            if(info.logCounts > 0) {
                io.emit('status-update', { status: 'Loading Transactions...'})
                logs = await biometric.getTransactions().catch(err => {
                    io.emit('status-update', { status:'Unhandled error in getTransactions: ' + err})
                })
                io.emit('status-update', { status: 'Done!'})
            }
            await biometric.disconnect()

            biometric.toJSON(logs.data, logsFileName)
            const jsonData = JSON.stringify(logs.data, null, 2)

            res.setHeader('Content-Type', 'application/json');
            res.json({ result: jsonData })
        } else {
            io.emit('status-update', { status: 'Failed to get transactions' })
        }
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
})

app.post('/api/addUser', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'User Count: ' + info.userCounts})

            let users = { data: [] }
            if(info.userCounts > 0) {
                users = await biometric.getUsers().catch(err => {
                    io.emit('status-update', { status: 'Unhandled error in getUsers: ' + err})
                })
            }

            //Employee ID, Name, Card Num
            const { id, name, card, password, role } = req.body
            io.emit('status-update', { status: "Adding user..." });
            await biometric.addUser(users.data, id, name, password, role, card)
            io.emit('status-update', { status: "Added " + name });
            await biometric.disconnect()
            io.emit('status-update', { status: 'Disconnected!' });
        } else {
            io.emit('status-update', { status: 'Failed to add user' })
        }
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ result: 'Failed to fetch data' });
    }
})

app.post('/api/deleteUser', async (req, res) => {
    try {
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })
            io.emit('status-update', { status: 'User Count: ' + info.userCounts})

            //Device ID
            const { deviceID } = req.body
            io.emit('status-update', { status: "Deleting user..." });
            await biometric.deleteUser(deviceID)
            io.emit('status-update', { status: "Deleted uid: " + deviceID});
            await biometric.disconnect()
            io.emit('status-update', { status: 'Disconnected!' });
        } else {
            io.emit('status-update', { status: 'Failed to delete user' })
        }
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ result: 'Failed to fetch data' });
    }
})

app.post('/api/updateUserbase', async (req, res) => {
    try {
        const { filename } = req.body

        //get file
        io.emit('status-update', { status: "Updating using " + filename + "..."})
        const newFile = await fs.promises.readFile(filename, 'utf-8')
        const newFileJson = JSON.parse(newFile)

        //get all operations from file
        let toAdd = []
        let toDel = []
        for(const user of newFileJson) {
            if(user.status === "ADD") {
                toAdd.push(user)
            } else if(user.status === "DELETE") {
                toDel.push(user)
            } 
        }

        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
            io.emit('status-update', { status: 'Connected!' })

            // get device users for searching
            let users = { data: [] }
            if(info.userCounts > 0) {
                io.emit('status-update', { status: 'Getting users for searching...'})
                users = await biometric.getUsers().catch(err => {
                    io.emit('status-update', { status: 'Unhandled error in getUsers: ' + err})
                })
            }

            // Search for user with given employee ID to delete
            for(const userDel of toDel) {
                const result = users.data.find(user => user.userId === userDel.userId);
                if(result) {
                    await biometric.deleteUser(result.uid)
                    io.emit('status-update', { status: "Deleted uid: " + result.uid});
                } else {
                    io.emit('status-update', { status: "Not found: " + userDel.name});
                }
            }

            // Add everything from toAdd
            for(const userAdd of toAdd) {
                const id = userAdd.userId
                const name = userAdd.name
                const password = userAdd.password
                const role = userAdd.role
                const card = userAdd.cardno

                const newUID = await biometric.addUser(users.data, id, name, password, role, card)
                users.data.push({"uid": newUID})
                io.emit('status-update', { status: "Added user: " + name });
            }

            await biometric.disconnect()
            res.json({ result: 'Update Finished!' })
            io.emit('status-update', { status: 'You may now close this tab' })
        } else {
            io.emit('status-update', { status: 'Failed to update userbase' })
        }
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ result: 'Failed to update\n' + err});
    }
})

app.post('/api/replaceUserbase', async (req, res) => {
    try {
        const { filename } = req.body

        //get file
        io.emit('status-update', { status: "Uploading " + filename + "..."})
        const newFile = await fs.promises.readFile(filename, 'utf-8')
        const newFileJson = JSON.parse(newFile)
        
        io.emit('status-update', { status: 'Connecting...' })
        const info = await biometric.connect()
        if(info) {
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
                if(user.uid != 1) {
                    await biometric.deleteUser(user.uid)
                    io.emit('status-update', { status: "Deleted uid: " + user.uid});
                }
            }
            
            //since we are updating from scratch except the admin user
            users = { data: [{"uid": 1}] }
            for(const user of newFileJson) {
                const id = user.userId
                const name = user.name
                const password = user.password
                const role = user.role
                const card = user.cardno

                const newUID = await biometric.addUser(users.data, id, name, password, role, card)
                users.data.push({"uid": newUID})
                io.emit('status-update', { status: "Added user: " + name });
            }
            await biometric.disconnect()
            res.json({ result: 'Overwrite Complete!' })
            io.emit('status-update', { status: 'You may now close this tab' })
        } else {
            io.emit('status-update', { status: 'Failed to replace userbase' })
        }
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ result: 'Failed to update' });
    }
})

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
