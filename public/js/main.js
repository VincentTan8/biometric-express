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
//read fingerprints json file
async function readFingerprints() {
    try {
        const response = await fetch('/api/readFingerprints')
        const data = await response.json()

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
        respondMessage(data)

        await viewUsers()
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
        respondMessage(data)        
        await viewTransactions()
    } catch (error) {
        document.getElementById('status').textContent = 'Error loading data'
        console.error('Error:', error)
    }
}

//add user to the biometric device
async function addUser() {
    // Get input values
    const uid = document.getElementById('uid').value
    const id = document.getElementById('id').value
    const name = document.getElementById('name').value
    const card = document.getElementById('card').value
    const password = document.getElementById('password').value
    const password2 = document.getElementById('password2').value
    const role = document.getElementById('role').value

    if(uid && id && (password === password2)) {
        // Prepare data to send
        const data = { uid, id, name, card , password, role}
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
            respondMessage(result)
        } catch (error) {
            console.error('Error:', error)
            document.getElementById('status').textContent = 'Failed to add user.'
        }
    } else 
        respondMessage({ result: `UID/ID field empty or password mismatch\n`})
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
            respondMessage(result)
        } catch (error) {
            console.error('Error:', error)
            document.getElementById('status').textContent = 'Failed to delete user.'
        }
    } else
        respondMessage({ result: `Device ID empty\n`})
}

async function editUser() {
    const modal = document.getElementById('editModal')
    
    const uid = modal.querySelector('#editUID').value 
    const id = modal.querySelector('#editID').value 
    const name = modal.querySelector('#editName').value 
    const card = modal.querySelector('#editCard').value 
    const password = modal.querySelector('#editPassword').value
    const password2 = modal.querySelector('#editPassword2').value  
    const role = modal.querySelector('#editRole').value 
    
    if(password === password2) {
        // Prepare data to send
        const data = { uid, id, name, card , password, role}
        try {
            // Send POST request using fetch
            const response = await fetch('/api/editUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })

            // Handle the response
            const result = await response.json()
            respondMessage(result)
            
            //close modal
            modal.style.display = 'none'
        } catch (error) {
            console.error('Error:', error)
            document.getElementById('status').textContent = 'Failed to edit user.'
        }
    } else 
        respondMessage({ result: `Password mismatch\n`})
}

async function updateUserbase() {
    let filename = document.getElementById('updateFile').value
    if(!filename) {
        filename = "http://phihope.systems/update.json"
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
        document.getElementById('userbase-status').appendChild(document.createTextNode(result.result+`\n`))
        document.getElementById('userbase-status').scrollTop = document.getElementById('userbase-status').scrollHeight

        //show modal for exit options
        const modal = document.getElementById('updateModal')
        modal.style.display = 'block'
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
        respondMessage(result)
    } catch (error) {
        console.error('Error:', error)
    }
}

async function viewUsers() {
    const users = await readUsers()
    const fingerprints = await readFingerprints()
    const userJSON = JSON.parse(users.result)
    const fpJSON = JSON.parse(fingerprints.result)

    //group fingerprints for each user
    let groupedFP = fpJSON.reduce((acc, item) => {
        acc[item.uid] = acc[item.uid] || []
        acc[item.uid].push(item)
        return acc
    }, {})

    //merge with user json
    const mergedData = userJSON.map(item => {
        let matchingItems = groupedFP[item.uid] || []
        return { ...item, fingerprints: matchingItems }
    }) 

    await refreshUserTable(mergedData)
}

async function viewTransactions() {
    const users = await readUsers()
    const logs = await readTransactions()
    const userJson = JSON.parse(users.result)
    const logJson = JSON.parse(logs.result)

    //for getting logs including IDs of deleted users
    const allIDs = [...new Set(logJson.map(log => log.deviceUserId ))]

    //this renames some of the fields and deletes unneeded fields
    const allLogs = makeReadable(
        logJson.filter(log => allIDs.includes(log.deviceUserId)),
        userJson
    )

    await refreshLogsTable(allLogs)
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

    //this renames some of the fields and deletes unneeded fields
    const allLogs = makeReadable(
        logJson.filter(log => allIDs.includes(log.deviceUserId)),
        userJson
    )
    
    //get first and last log of each user
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
    await refreshLogsTable(allFAL)
    respondMessage({ result: 'Logs ready for export'})
}

function makeReadable(data, userData) {
    data.forEach(log => {
        const user = userData.find(user => user.userId === log.deviceUserId)
        if(user)
            log.userName = user.name //make new field
        else
            log.userName = "Username Not Found: " + log.deviceUserId

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

async function downloadFps(fps, username) {
    const data = { fps, username }
    try {
        // Send POST request using fetch
        const response = await fetch('/api/downloadFps', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        // Handle the response
        const result = await response.json()
        respondMessage(result)
    } catch (error) {
        console.error('Error:', error)
        document.getElementById('status').textContent = 'Failed to download fingerprints.'
    }
}

async function uploadFP(templateEntry, uid) {
    const data = { templateEntry, uid }
    try {
        // Send POST request using fetch
        const response = await fetch('/api/uploadFp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        // Handle the response
        const result = await response.json()
        respondMessage(result)
    } catch (error) {
        console.error('Error:', error)
        document.getElementById('status').textContent = 'Failed to upload fingerprint.'
    }
}

async function deleteFps(uid, userId, name, cardno, password, role) {
    const data = { uid, userId, name, cardno, password, role }
    try {
        // Send POST request using fetch
        const response = await fetch('/api/deleteFps', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })

        // Handle the response
        const result = await response.json()
        respondMessage(result)
    } catch (error) {
        console.error('Error:', error)
        document.getElementById('status').textContent = 'Failed to delete fingerprints.'
    }
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
            { 
                data: 'fingerprints',
                render: function(data, type, row) {
                    if(data) {
                        return `
                            <a href="#" class="fp-count"
                                data-fps='${JSON.stringify(data)}'
                                data-uid="${row.uid}"
                                data-id="${row.userId}"  
                                data-user="${row.name}"
                                data-pw="${row.password}"
                                data-card="${row.cardno}"
                                data-role="${row.role}">
                                ${data.length}
                            </a>
                        `
                    }
                }
            },
            { data: null, defaultContent: 'none set'},
        ],
        columnDefs: [
            {
                targets: '_all',
                className: 'dt-right' //align the text to the right
            },
            {
                targets: -1, //target last column
                searchable: false,
                orderable: false,
                width: '14rem',
                render: function (data, type, row) {
                    return `
                        <button class="btn-edit" 
                            data-uid="${row.uid}"
                            data-id="${row.userId}"  
                            data-user="${row.name}"
                            data-pw="${row.password}"
                            data-card="${row.cardno}"
                            data-role="${row.role}">
                            Edit
                        </button>
                        <button class="btn-delete" data-id="${row.uid}" data-user="${row.name}">Delete</button>
                    `
                }
            }
        ],
        paging: true,
        searching: true,
        ordering: true
    })

    $('#userTable').off('click', '.fp-count').on('click', '.fp-count', function(e) {
        e.preventDefault()
        const fps = $(this).data('fps')
        const entryUID = $(this).data('uid')
        const entryId = $(this).data('id')
        const entryName = $(this).data('user')
        const entryPassword = $(this).data('pw')
        const entryCard = $(this).data('card')
        const entryRole = $(this).data('role')
        //open fingerprint window
        const modal = document.getElementById('fpModal')
        modal.style.display = 'block'
        //access title
        modal.querySelector('#title').textContent = `Fingerprints of user: ${entryName}`
        let fpList = ""
        for(const fp of fps)
            fpList += `Fingerprint index: ${fp.fpIndex}\n`
        modal.querySelector('.fp-list').textContent = fpList
        
        //download fp button
        $('#fpModal').off('click', '#downloadFP').on('click', '#downloadFP', () => {
            downloadFps(fps, entryName)
            modal.style.display = 'none'
        })

        //upload fp button
        const fpInput = document.getElementById('fpInput')
        $('#fpModal').off('click', '#uploadFP').on('click', '#uploadFP', () => {
            fpInput.click()
        })
        // define change event listener for file selection (upload button)
        const handleOnChange = (event) => {
            const file = fpInput.files[0]
            if (file) {
                // Check if JSON file
                if (file.type === "application/json" || file.name.endsWith('.json')) {
                    const reader = new FileReader()
                    // When the file is successfully read
                    reader.onload = async (e) => {
                        try {
                            const fpData = JSON.parse(e.target.result)
                            for(const fp of fpData)
                                await uploadFP(fp, entryUID)
                            modal.style.display = 'none'
                        } catch (error) {
                            console.error(error)
                        }
                    }
                    //trigger reading the file
                    reader.readAsText(file)
                } else 
                    console.log('Error: Not a json file')
            } else 
                console.log('No file selected')
            // reset input value to allow re-selection of same file
            event.target.value = ''
        }
        $('#fpInput').off()  //removes all listeners
        $('#fpInput').on('change', handleOnChange)

        //delete fp button
        $('#fpModal').off('click', '#deleteFP').on('click', '#deleteFP', () => {
            deleteFps(entryUID, entryId, entryName, entryCard, entryPassword, entryRole)
            modal.style.display = 'none'
        })
    })
    //button logic for userTable
    $('#userTable').off('click', '.btn-edit').on('click', '.btn-edit', function () {
        const entryUID = $(this).data('uid')
        const entryId = $(this).data('id')
        const entryName = $(this).data('user')
        const entryPassword = $(this).data('pw')
        const entryCard = $(this).data('card')
        const entryRole = $(this).data('role')
        //open edit window
        const modal = document.getElementById('editModal')
        modal.style.display = 'block'
        //access title
        modal.querySelector('#title').textContent = `Edit User: ${entryName}`
        modal.querySelector('#editUID').value = entryUID
        modal.querySelector('#editID').value = entryId
        modal.querySelector('#editName').value = entryName
        modal.querySelector('#editPassword').value = entryPassword
        modal.querySelector('#editPassword2').value = entryPassword
        modal.querySelector('#editCard').value = entryCard
        if(parseInt(entryRole) === 14)
            modal.querySelector('#editRole').value = "admin"
        else if(parseInt(entryRole) === 0)
            modal.querySelector('#editRole').value = "normal"
    })
    //turn prev listeners off
    $('#userTable').off('click', '.btn-delete').on('click', '.btn-delete', function () {
        const entryId = $(this).data('id')
        const entryName = $(this).data('user')
        //open edit window
        const modal = document.getElementById('deleteModal')
        modal.style.display = 'block'
        //access title
        modal.querySelector('#title').textContent = `Are you sure you want to delete ${entryName} with UID: ${entryId}?`
        $('#deleteModal').off('click', '#deleteConfirm').on('click', '#deleteConfirm', () => {
            deleteUser(entryId)
            modal.style.display = 'none'
        })
    })
}

async function refreshLogsTable(data) {
    if ($.fn.DataTable.isDataTable('#logsTable')) {
        $('#logsTable').DataTable().clear().destroy()
        $('#logsTable').addClass('hidden-table')
    }
    if ($.fn.DataTable.isDataTable('#userTable')) {
        $('#userTable').DataTable().clear().destroy()
        $('#userTable').addClass('hidden-table')
    }
    
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

    // Debounce function to limit how often search is happening
    function debounce(func, wait) {
        let timeout
        return function (...args) {
            clearTimeout(timeout)
            timeout = setTimeout(() => func.apply(this, args), wait)
        }
    }
    $('div.dt-search input[type="search"]').off('input keyup')
    $('div.dt-search input[type="search"]').on('keyup', debounce(function() {
        const searchValue = this.value
        // Convert space-separated terms to a regex pattern for OR search
        // (^|\s)2024(\s|$) for ensuring the date with 2024 will not get selected
        // \b<name>\b to avoid matching names like paul with johnpaul or paula
        const regexPattern = searchValue.split(' ').join('|')
        logsTable.search(regexPattern, true, false).draw()
    }, 500))
}

function respondMessage(msg) {
    document.getElementById('status').appendChild(document.createTextNode(`Status: ${msg.result}\n`))
    document.getElementById('status').scrollTop = document.getElementById('status').scrollHeight
}

const socket = io()  // Connect to the Socket.IO server
// Listen for 'status-update' event from the server
socket.on('status-update', (data) => {
    let status = document.getElementById('status')
    let newStatus = document.createTextNode(`Status: ${data.status}\n`)
    status.appendChild(newStatus)
    status.scrollTop = status.scrollHeight
})
socket.on('userbase-status', (data) => {
    let status = document.getElementById('userbase-status')
    let newStatus = document.createTextNode(`Status: ${data.status}\n`)
    status.appendChild(newStatus)
    status.scrollTop = status.scrollHeight
})
socket.on('connect', () => {
    if(document.getElementById('updateFile'))
        updateUserbase()
})