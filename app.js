const express = require('express')
const path = require('path')
const app = express()
const PORT = 3000

const Bio = require('./bio')
const XLSX = require('xlsx')
const fs = require('fs')

const biometric = new Bio('171.16.109.24', 4370, 10000, 4000)
const logsFileName = 'phihopeLogs.json'
const usersFileName = 'phihopeUsers.json'

// Route to get the result of the Node code
app.get('/api/users', (req, res) => {
    fs.readFile(usersFileName, 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading file')
        } else {
            res.json({ result: data })
        }
    })
})

app.get('/api/transactions', async (req, res) => {
    try {
        await biometric.connect()
        const logs = await biometric.getTransactions().catch(err => {
            // Handle any uncaught errors from the test function
            console.error('Unhandled error in getTransactions:', err)
        })
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

// Serve static files (the HTML file) from the "public" directory
app.use('/', express.static(path.join(__dirname + '/public')))

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})
