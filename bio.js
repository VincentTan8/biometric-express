const fs = require('fs')
const ZKLib = require('./node-zklib/zklib')

class Bio {
    constructor(ip, port, timeout, inport) {
        this.info = {}
        this.zkInstance = new ZKLib(ip, port, timeout, inport)
    }

    async connect() {
        console.log("Initializing...")
        try {
            // Create socket to machine 
            console.log("Connecting...")
            await this.zkInstance.createSocket()

            // Get general info like logCapacity, user counts, logs count
            // It's really useful to check the status of device 
            this.info = await this.zkInstance.getInfo()
            console.log(this.info)
            return this.info
        } catch (e) {
            console.log(e)
            if (e.code === 'EADDRINUSE') {
            }
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
        
        // Get the device time
        // const getTime = await this.zkInstance.getTime()
        // console.log("Time now is: " + getTime.toString())

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
            users = await this.zkInstance.getUsers()
        }
        console.log("Total users: " + users.data.length)

        return users
    }

    async addUser(userID, username, cardnum) {
        //generate uid (valid uids are from 1 to 3000)
        const users = await this.getUsers()
        let i = 0;
        let notValid = true
        while (i < 3000 && notValid) {
            i++;
            notValid = users.data.some(user => {
                return i == user.uid
            })
        }
        const uid = i

        //uid, userID, username, password, role, cardnum
        await this.zkInstance.setUser(uid, userID, username, '', 0, cardnum)
        console.log('Added User: ' + username)
    }

    async editUser(uid, userID, username, cardnum) {
        //check if user exists
        const users = await this.getUsers()

        const editedUser = users.data.filter(user => {
            return user.uid == uid
        })
        if(editedUser.length == 1){
            console.log('User Found')
            //set user by overwriting data
            await this.zkInstance.setUser(uid, userID, username, '', 0, cardnum)
            console.log('Edited User: ' + username)
        } else {
            console.log('User Not Found')
        }
    }

    async deleteUser(uid) {
        // deleteUser takes uid which is different from userID
        const deletedUser = await this.zkInstance.deleteUser(uid)
        console.log('Deleted User with UID: ' + uid)
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

    makeReadable(data, userData) {
        data.forEach(log => {
            const user = userData.find(user => user.userId === log.deviceUserId)
            if(user)
                log.userName = user.name //make new field
            else
                log.userName = "UserID Not Found: " + log.deviceUserId

            //just for rearranging the field 
            log.timeStamp = this.formatDateWithoutGMT(new Date(log.recordTime))

            //removed for clarity, idk what the hr will need from these anyway
            //all they need is the timestamp and name I think
            delete log.userSn
            delete log.ip
            delete log.recordTime
        })
        return data
    }

    // Function to format the date without the GMT offset
    formatDateWithoutGMT(date) {
        // Get the individual components
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0') // Months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        
        // Construct the desired format
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    getFirstAndLastLogPerDay(data, startDate, endDate) {
        //data is logs of one user
        const filteredLogs = []
        let firstAndLast = []
        let currentDate = " "
        data.forEach(log => {
            const date = new Date(log.timeStamp)
            //+1 on month since month is 0 index
            const dateText = date.getFullYear() + "/" + (date.getMonth()+1) + "/" + date.getDate()
            //if date is after the start date and before the end date
            if((date >= startDate) && (date <= endDate)) {
                //if date is equal to the date we are checking
                if(dateText === currentDate) {
                    if(firstAndLast.length < 2) {
                        firstAndLast.push(log)
                    } else {
                        //replace the potential last entry of the day
                        firstAndLast[1] = log
                    }
                } else {
                    if(firstAndLast[1]){
                        //last log of the day
                        filteredLogs.push(firstAndLast[1])
                    } 
                    //first log of the day
                    filteredLogs.push(log)

                    //set to the current day log
                    currentDate = dateText
                    firstAndLast = []
                    firstAndLast.push(log)
                }
            }
        })
        //edge case: if no log exists for the next day, last log of the day wont be pushed so we do this
        //take the last log into filteredLogs
        if(firstAndLast[1]) 
            filteredLogs.push(firstAndLast[1])

        return filteredLogs
    }
}

module.exports = Bio 