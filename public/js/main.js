//select biometric device


// read user json file
async function readUsers() {
    try {
        const response = await fetch('/api/readUsers') 
        const data = await response.json()        // Parse JSON response

        return data
    } catch (error) {
        document.getElementById('status').textContent = 'Error loading data'
        console.error('Error:', error)
    }
}
// read logs json file
async function readTransactions() {
    try {
        const response = await fetch('/api/readTransactions')
        const data = await response.json()        // Parse JSON response

        return data
    } catch (error) {
        document.getElementById('status').textContent = 'Error loading data'
        console.error('Error:', error)
    }
}
//get users from biometric device
async function getUsers() {
    try {
        const response = await fetch('/api/users') // Send request to the server
        const data = await response.json()        // Parse JSON response

    } catch (error) {
        document.getElementById('status').textContent = 'Error loading data'
        console.error('Error:', error)
    }
}
//get logs from biometric device
async function getTransactions() {
    try {
        const response = await fetch('/api/transactions') 
        const data = await response.json()       

    } catch (error) {
        document.getElementById('status').textContent = 'Error loading data'
        console.error('Error:', error)
    }
}
//add user to the biometric device
async function addUser() {
    // Get input values
    const id = document.getElementById('id').value
    const name = document.getElementById('name').value
    const card = document.getElementById('card').value
    const password = document.getElementById('password').value
    const password2 = document.getElementById('password2').value
    const role = document.getElementById('role').value

    if(id && (password === password2)) {
        // Prepare data to send
        const data = { id, name, card , password, role}
        try {
            // Send POST request using fetch
            const response = await fetch('/api/addUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })

            // Handle the response
            const result = await response.json()
            document.getElementById('status').appendChild(document.createTextNode(`\n`+result.result))
        } catch (error) {
            console.error('Error:', error)
            document.getElementById('status').textContent = 'Failed to add user.'
        }
    } else 
        document.getElementById('status').appendChild(document.createTextNode(`\n` + 'ID field empty or password mismatch'))
}
//delete user from biometric device
async function deleteUser(deviceID) {
    if(deviceID) {
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
            })

            // Handle the response
            const result = await response.json()
            document.getElementById('status').appendChild(document.createTextNode(`\n`+result.result))
        } catch (error) {
            console.error('Error:', error)
            document.getElementById('status').textContent = 'Failed to delete user.'
        }
    } else
        document.getElementById('status').appendChild(document.createTextNode(`\n` + 'Device ID empty'))
}

async function editUser() {

}

async function updateUserbase() {
    let filename = document.getElementById('updateFile').value
    if(!filename) {
        filename = "update.json"
    }

    // Prepare data to send
    const data = { filename }
    try {
        // Send POST request using fetch
        const response = await fetch('/api/updateUserbase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        // Handle the response
        const result = await response.json()
        document.getElementById('status').appendChild(document.createTextNode(`\n`+result.result))
    } catch (error) {
        console.error('Error:', error)
    }
}

async function replaceUserbase() {
    const filename = document.getElementById('userFile').value
    
    // Prepare data to send
    const data = { filename }
    try {
        // Send POST request using fetch
        const response = await fetch('/api/replaceUserbase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        // Handle the response
        const result = await response.json()
        document.getElementById('status').appendChild(document.createTextNode(`\n`+result.result))
    } catch (error) {
        console.error('Error:', error)
    }
}

async function viewUsers() {
    const users = await readUsers()
    await refreshUserTable(JSON.parse(users.result))
}

async function viewTransactions() {
    const logs = await readTransactions()
    await refreshLogsTable(JSON.parse(logs.result), true)
}

//convert logs into readable format and filter if needed
async function exportLogs() {
    const users = await readUsers()
    const logs = await readTransactions()
    const userJson = JSON.parse(users.result)
    const logJson = JSON.parse(logs.result)

    //get all unique IDs
    const allIDs = []
    userJson.forEach(user => {
        if (!allIDs.includes(user.userId))
            allIDs.push(user.userId)
    })

    //for getting logs including IDs of deleted users
    // const allIDs = [...new Set(logJson.map(log => log.deviceUserId ))]

    // //this renames some of the fields and deletes unneeded fields
    const allLogs = makeReadable(
        logJson.filter(log => allIDs.includes(log.deviceUserId)),
        userJson
    )
    
    // //get first and last log of each user
    let allFAL = []
    let startDate = new Date() // MM/DD/YYYY 08:00:00
    let endDate = new Date() // MM/DD/YYYY day before endDate will be taken if set
    
    const start = document.getElementById('startDate').value
    const end = document.getElementById('endDate').value
    if (start.length != 0) 
        startDate = new Date(start + "T00:00:00")
    if(end.length != 0) 
        endDate = new Date(end + "T23:59:59")

    allIDs.forEach(id => {
        const userLogs = allLogs.filter(log => log.deviceUserId === id)
        const firstAndLast = getFirstAndLastLogPerDay(userLogs, startDate, endDate)
        allFAL.push(...firstAndLast)
    })

    //logging only first and last log of the day during specified dates
    //if requesting all possible logs, please log allLogs instead of allFAL
    await refreshLogsTable(allFAL, false)
}

function makeReadable(data, userData) {
    data.forEach(log => {
        const user = userData.find(user => user.userId === log.deviceUserId)
        if(user)
            log.userName = user.name //make new field
        else
            log.userName = "UserID Not Found: " + log.deviceUserId

        //just for rearranging the field 
        log.timeStamp = formatDateWithoutGMT(new Date(log.recordTime))

        //removed for clarity, idk what the hr will need from these anyway
        //all they need is the timestamp and name I think
        delete log.userSn
        delete log.ip
        delete log.recordTime
    })
    return data
}

function getFirstAndLastLogPerDay(data, startDate, endDate) {
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

// Function to format the date without the GMT offset
function formatDateWithoutGMT(date) {
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

// throw to datatables
async function refreshUserTable(data) {
    if ($.fn.DataTable.isDataTable('#userTable')) {
        $('#userTable').DataTable().clear().destroy()
        $('#userTable').addClass('hidden-table')
    }
    if ($.fn.DataTable.isDataTable('#logsTable')) {
        $('#logsTable').DataTable().clear().destroy()
        $('#logsTable').addClass('hidden-table')
    }
    
    // Initialize DataTable
    $('#userTable').removeClass('hidden-table')
    $('#userTable').DataTable({
        data: data,
        columns: [
            { data: 'uid', defaultContent: 'none set'},
            { data: 'userId', defaultContent: 'none set'},
            { data: 'name', defaultContent: 'none set'},
            { data: 'cardno', defaultContent: 'none set'},
            { data: null, defaultContent: 'none set'},
        ],
        columnDefs: [
            {
                targets: '_all',
                className: 'dt-right' //align the text to the right
            },
            {
                targets: -1, //target last column
                width: '14rem',
                render: function (data, type, row) {
                    return `
                        <button class="btn-edit" data-id="${row.uid}">Edit</button>
                        <button class="btn-delete" data-id="${row.uid}" data-user="${row.name}">Delete</button>
                    `
                }
            }
        ],
        paging: true,
        searching: true,
        ordering: true
    })

    //button logic for userTable
    $('#userTable').on('click', '.btn-edit', function () {
        const entryId = $(this).data('id')
        editUser(entryId)
    })

    $('#userTable').on('click', '.btn-delete', function () {
        const entryId = $(this).data('id')
        const entryName = $(this).data('user')
        if (confirm(`Are you sure you want to delete ${entryName} with UID: ${entryId}?`)) {
            deleteUser(entryId)
        }
    })
}

async function refreshLogsTable(data, raw) {
    if ($.fn.DataTable.isDataTable('#logsTable')) {
        $('#logsTable').DataTable().clear().destroy()
        $('#logsTable').addClass('hidden-table')
    }
    if ($.fn.DataTable.isDataTable('#userTable')) {
        $('#userTable').DataTable().clear().destroy()
        $('#userTable').addClass('hidden-table')
    }
    if(raw) {
        // Initialize DataTable
        $('#logsTable').removeClass('hidden-table')
        const logsTable = $('#logsTable').DataTable({
            data: data, 
            columns: [
                { data: 'deviceUserId', defaultContent: 'none set'},
                { data: 'userSn', title: "Log Number", defaultContent: 'none set'},
                { data: 'recordTime', defaultContent: 'none set'}
            ],
            paging: false,
            searching: true,
            ordering: true,
            layout: {
                topStart: {
                    buttons: ['copy', 'csv', 'excel', 'print']
                }
            }
        })
        $('div.dt-search input[type="search"]').on('keyup', function() {
            const searchValue = this.value
            // Convert space-separated terms to a regex pattern for OR search
            const regexPattern = searchValue.split(' ').join('|')
            logsTable.search(regexPattern, true, false).draw()
        })
    } else {
        // Initialize DataTable
        $('#logsTable').removeClass('hidden-table')
        const logsTable = $('#logsTable').DataTable({
            data: data, 
            columns: [
                { data: 'deviceUserId', defaultContent: 'none set'},
                { data: 'userName', title: "Username", defaultContent: 'none set'},
                { data: 'timeStamp', defaultContent: 'none set'}
            ],
            paging: false,
            searching: true,
            ordering: true,
            layout: {
                topStart: {
                    buttons: ['copy', 'csv', 'excel', 'print']
                }
            }
        })
        $('div.dt-search input[type="search"]').on('keyup', function() {
            const searchValue = this.value
            // (^|\s)2024(\s|$) for ensuring the date with 2024 will not get selected
            // \b<name>\b to avoid matching names like paul with johnpaul or paula
            const regexPattern = searchValue.split(' ').join('|')
            logsTable.search(regexPattern, true, false).draw()
        })
    }
}

const socket = io()  // Connect to the Socket.IO server
// Listen for 'status-update' event from the server
socket.on('status-update', (data) => {
    var status = document.getElementById('status')
    var newStatus = document.createTextNode(`\nStatus: ${data.status}`)
    status.appendChild(newStatus)
    status.scrollTop = status.scrollHeight
})
socket.on('result', (data) => {
    document.getElementById('result').textContent = data.result
})