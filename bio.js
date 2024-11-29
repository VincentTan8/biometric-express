const fs = require('fs')
const ZKLib = require('./node-zklib/zklib')

class Bio {
    constructor(ip, port, timeout, inport, io) {
        this.info = {}
        this.zkInstance = new ZKLib(ip, port, timeout, inport, io)
        this.io = io
    }

    async connect() {
        console.log("Initializing...")
        try {
            // Create socket to machine 
            let success = null
            do {
                success = await this.zkInstance.createSocket()
            } while (!success)

            // Get general info like logCapacity, user counts, logs count
            // It's really useful to check the status of device 
            this.info = await this.zkInstance.getInfo()
            console.log(this.info)
            return this.info
        } catch (e) {
            console.log("Connection failed")
            if (e.code === 'EADDRINUSE') {
            }
            throw e
        }
    }

    async disconnect() {
        // Disconnect the machine ( don't do this when you need realtime update :))) 
        if (this.zkInstance) {
            try {
                await this.zkInstance.disconnect()
                console.log('Disconnected!')
            } catch (error) {
                console.log('Error closing the socket:', error)
            }
        }
    }
    
    async getTransactions() {
        // Get all logs in the machine 
        // Currently, there is no way to filter the data, it just takes everything (which is sad)
        const logs = await this.zkInstance.getAttendances()
        console.log("Total Attendances: "+ logs.data.length)

        // You can also read realtime log by getRealTimelogs function (which doesnt work)

        // this.zkInstance.getRealTimeLogs((data)=>{
        //     // do something when some checkin 
        //     console.log("real time")
        //     console.log(data)
        // })

        // delete the data in machine
        // You should do this when there are too many data in the machine, this issue can slow down machine 
        // this.zkInstances.clearAttendanceLog()
        return logs
    }

    async getUsers() {
        // Get users in machine to reference ids in logs
        let users = await this.zkInstance.getUsers()
        //update info
        this.info = await this.zkInstance.getInfo()

        while(users.data.length != this.info.userCounts){
            console.log("User count mismatch: " + users.data.length)
            console.log("Retrying...")
            this.io.emit('status-update', { status: 'User count mismatch: ' + users.data.length })
            this.io.emit('status-update', { status: 'Retrying...' })
            this.io.emit('userbase-status', { status: 'User count mismatch: ' + users.data.length })
            this.io.emit('userbase-status', { status: 'Retrying...' })
            users = await this.zkInstance.getUsers()
        }
        console.log("Total users: " + users.data.length)

        return users
    }

    async addUser(users, uid, userID, username, password, role, cardnum) {
        //generate uid (valid uids are from 1 to 3000)
        // let i = 0
        // let notValid = true
        // while (i < 3000 && notValid) {
        //     i++
        //     notValid = users.some(user => {
        //         return i == user.uid
        //     })
        // }
        // const uid = i

        //uid, userID, username, password, role, cardnum
        //password default is '' while role default is 0. Role for admin is 14
        switch (role) {
            case "normal":
                role = 0;
                break;
            case "admin":
                role = 14;
                break;
            default:
                role = 0;
        }
        await this.zkInstance.setUser(uid, userID, username, password, role, cardnum)
        console.log('Added User UID: ' + uid + " " + username)
        //return the newly added user uid for reference
        return uid
    }

    async editUser(users, uid, userID, username, password, role, cardnum) {
        const editedUser = users.filter(user => {
            return user.uid == uid
        })
        if(editedUser.length == 1){
            console.log('User Found')
            //set user by overwriting data
            switch (role) {
                case "normal":
                    role = 0;
                    break;
                case "admin":
                    role = 14;
                    break;
                default:
                    role = 0;
            }
            await this.zkInstance.setUser(uid, userID, username, password, role, cardnum)
            console.log('Edited User: ' + username)
            return true
        } else {
            console.log('User Not Found')
            return false
        }
    }

    async deleteUser(uid) {
        // deleteUser takes uid which is different from userID
        const deletedUser = await this.zkInstance.deleteUser(uid)
        console.log('Deleted User with UID: ' + uid)
    }

    async setFingerprint(uid, index, flag, template, fpSize) {
        await this.zkInstance.setFingerprint(uid, index, flag, template, fpSize)
        console.log('Fingerprint set for UID: ' + uid + " at index: " + index)
    }

    async getFingerprints() {
        let fingerprints = await this.zkInstance.getFingerprints()
        //update info
        this.info = await this.zkInstance.getInfo()

        while(fingerprints.data.length != this.info.fpCounts){
            console.log("Fingerprint count mismatch: " + fingerprints.data.length)
            console.log("Retrying...")
            this.io.emit('status-update', { status: 'Fingerprint count mismatch: ' + fingerprints.data.length })
            this.io.emit('status-update', { status: 'Retrying...' })
            this.io.emit('userbase-status', { status: 'Fingerprint count mismatch: ' + fingerprints.data.length })
            this.io.emit('userbase-status', { status: 'Retrying...' })
            fingerprints = await this.zkInstance.getFingerprints()
        }

        console.log("Total Fingerprints: " + fingerprints.data.length)
        return fingerprints
    }

    async deleteFingerprints(user) {
        await this.zkInstance.deleteFingerprints(user)
        console.log('Deleted fingerprints of user: ' + user.name)
    }
    
    async setTime(time) {
        // const setTime = await this.zkInstance.setTime(new Date("2024-01-01T07:41:32"))
        await this.zkInstance.setTime(new Date(time))
        console.log("Time set to: " + time)
    }

    async getTime() {
        // Get the device time
        const getTime = await this.zkInstance.getTime()
        console.log("Time now is: " + getTime.toString())
    }

    toJSON (data, filename){
        // Convert the logs to a JSON string
        const jsonData = JSON.stringify(data, null, 2) // 'null, 2' adds indentation for readability

        // // Write the JSON string to a file
        fs.writeFile(filename, jsonData, (err) => {
            if (err) {
                console.error("An error occurred while writing to the file:", err)
                return
            }
            console.log(filename + " successfully written")
        })
    }
}

module.exports = Bio 