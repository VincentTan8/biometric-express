const net = require('net')
const timeParser = require('./timeParser');

const { MAX_CHUNK, COMMANDS, REQUEST_DATA } = require('./constants')
const { createTCPHeader,
  exportErrorMessage,
  removeTcpHeader,
  decodeUserData72,
  decodeRecordData40,
  decodeRecordRealTimeLog52,
  checkNotEventTCP,
  decodeTCPHeader,
  decodeFingerprintData } = require('./utils')

const { log } = require('./helpers/errorLog')

class ZKLibTCP {
  constructor(ip, port, timeout, io) {
    this.io = io
    this.ip = ip
    this.port = port
    this.timeout = timeout
    this.sessionId = null
    this.replyId = 0
    this.socket = null
  }


  createSocket(cbError, cbClose) {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket()

      // Set max listeners to avoid warnings
      this.socket.setMaxListeners(100); // Adjust the number as needed

      this.socket.once('error', err => {
        reject(err)
        cbError && cbError(err)
      })

      this.socket.once('connect', () => {
        resolve(this.socket)
      })

      this.socket.once('close', (err) => {
        this.socket = null;
        cbClose && cbClose('tcp')
      })


      if (this.timeout) {
        this.socket.setTimeout(this.timeout)
      }

      this.socket.connect(this.port, this.ip)
    })
  }


  connect() {
    return new Promise(async (resolve, reject) => {
      try {
        const reply = await this.executeCmd(COMMANDS.CMD_CONNECT, '')
        if (reply) {
          resolve(true)
        } else {

          reject(new Error('NO_REPLY_ON_CMD_CONNECT'))
        }
      } catch (err) {
        reject(err)
      }
    })
  }


  closeSocket() {
    return new Promise((resolve, reject) => {
      this.socket.removeAllListeners('data')
      this.socket.end(() => {
        clearTimeout(timer)
        resolve(true)
      })
      /**
       * When socket isn't connected so this.socket.end will never resolve
       * we use settimeout for handling this case
       */
      const timer = setTimeout(() => {
        resolve(true)
      }, 2000)
      this.socket = null
    })
  }

  writeMessage(msg, connect) {
    return new Promise((resolve, reject) => {

      let timer = null
      this.socket.once('data', (data) => {
        timer && clearTimeout(timer)
        resolve(data)
      })

      this.socket.write(msg, null, async (err) => {
        if (err) {
          reject(err)
        } else if (this.timeout) {
          timer = setTimeout(() => {
            clearTimeout(timer)
            reject(new Error('TIMEOUT_ON_WRITING_MESSAGE'))
          }, connect ? 2000 : this.timeout)
        }
      })
    })
  }

  requestData(msg) {
    return new Promise((resolve, reject) => {
      let timer = null
      let replyBuffer = Buffer.from([])
      const internalCallback = (data) => {
        if (!data) 
          return reject(new Error('No data received from socket while requesting data'));
        this.socket.removeListener('data', handleOnData)
        timer && clearTimeout(timer)
        resolve(data)
      }

      const handleOnData = (data) => {
        replyBuffer = Buffer.concat([replyBuffer, data])
        if (checkNotEventTCP(data)) return;
        clearTimeout(timer)   
        const header = decodeTCPHeader(replyBuffer.subarray(0,16));

        if(header.commandId === COMMANDS.CMD_DATA){
          timer = setTimeout(()=>{
            internalCallback(replyBuffer)
          }, 1000)
        }else{
          timer = setTimeout(() => {
            reject(new Error('TIMEOUT_ON_RECEIVING_REQUEST_DATA'))
          }, this.timeout)

          const packetLength = data.readUIntLE(4, 2)
          if (packetLength > 8) {
            internalCallback(data)
          }
        }
      }
      
      this.socket.on('data', handleOnData)

      this.socket.write(msg, null, err => {
        if (err) {
          reject(err)
        }

        timer = setTimeout(() => {
          reject(Error('TIMEOUT_IN_RECEIVING_RESPONSE_AFTER_REQUESTING_DATA'))
        }, this.timeout)

      })
    })

  }


  /**
   * 
   * @param {*} command 
   * @param {*} data 
   * 
   * 
   * reject error when command fail and resolve data when success
   */

  executeCmd(command, data) {
    return new Promise(async (resolve, reject) => {

      if (command === COMMANDS.CMD_CONNECT) {
        this.sessionId = 0
        this.replyId = 0
      } else {
        this.replyId++
      }
      const buf = createTCPHeader(command, this.sessionId, this.replyId, data)
      let reply = null

      try{
        reply = await this.writeMessage(buf, command === COMMANDS.CMD_CONNECT || command === COMMANDS.CMD_EXIT)

        const rReply = removeTcpHeader(reply);
        if (rReply && rReply.length && rReply.length >= 0) {
          if (command === COMMANDS.CMD_CONNECT) {
            this.sessionId = rReply.readUInt16LE(4);
          }
        }
        resolve(rReply)
      }catch(err){
        reject(err)
      }
    })
  }

  sendChunkRequest(start, size) {
    this.replyId++;
    const reqData = Buffer.alloc(8)
    reqData.writeUInt32LE(start, 0)
    reqData.writeUInt32LE(size, 4)
    const buf = createTCPHeader(COMMANDS.CMD_DATA_RDY, this.sessionId, this.replyId, reqData)

    this.socket.write(buf, null, err => {
      if (err) {
        log(`[TCP][SEND_CHUNK_REQUEST]` + err.toString())
      }
    })
  }


  /**
   * 
   * @param {*} reqData - indicate the type of data that need to receive ( user or attLog)
   * @param {*} cb - callback is triggered when receiving packets
   * 
   * readWithBuffer will reject error if it'wrong when starting request data 
   * readWithBuffer will return { data: replyData , err: Error } when receiving requested data
   */
  readWithBuffer(reqData, cb = null) {
    return new Promise(async (resolve, reject) => {

      this.replyId++;
      const buf = createTCPHeader(COMMANDS.CMD_DATA_WRRQ, this.sessionId, this.replyId, reqData)
      let reply = null

      try {
        reply = await this.requestData(buf)
        if (!reply) 
          return reject(new Error('No reply received from requestData()'));
      } catch (err) {
        return reject(err)
      }

      const header = decodeTCPHeader(reply.subarray(0, 16))
      switch (header.commandId) {
        case COMMANDS.CMD_DATA: {
          resolve({ data: reply.subarray(16), mode: 8 })
          break;
        }
        case COMMANDS.CMD_ACK_OK:
        case COMMANDS.CMD_PREPARE_DATA: {
          // this case show that data is prepared => send command to get these data 
          // reply variable includes information about the size of following data
          const recvData = reply.subarray(16)
          const size = recvData.readUIntLE(1, 4)


          // We need to split the data to many chunks to receive , because it's to large
          // After receiving all chunk data , we concat it to TotalBuffer variable , that 's the data we want
          let remain = size % MAX_CHUNK
          let numberChunks = Math.round(size - remain) / MAX_CHUNK
          let totalPackets = numberChunks + (remain > 0 ? 1 : 0)
          let replyData = Buffer.from([])


          let totalBuffer = Buffer.from([])
          let realTotalBuffer = Buffer.from([])

          let isDataOnGoing = false

          const timeout = 10000
          let timer = setTimeout(() => {
            internalCallback(replyData, new Error('TIMEOUT WHEN RECEIVING PACKET'))
          }, timeout)

          const internalCallback = (replyData, err = null) => {
            // this.socket && this.socket.removeListener('data', handleOnData)
            timer && clearTimeout(timer)
            resolve({ data: replyData, err })
          }

          const handleOnData = (reply) => {

            if (checkNotEventTCP(reply)) return;
            clearTimeout(timer)
            timer = setTimeout(() => {
              internalCallback(replyData,
                new Error(`TIME OUT !! ${totalPackets} PACKETS REMAIN !`))
            }, timeout)

            totalBuffer = Buffer.concat([totalBuffer, reply])
            const packetLength = totalBuffer.readUIntLE(4, 2)
            if (totalBuffer.length >= 8 + packetLength) {

              realTotalBuffer = Buffer.concat([realTotalBuffer, totalBuffer.subarray(16, 8 + packetLength)])
              totalBuffer = totalBuffer.subarray(8 + packetLength)

              if ((totalPackets > 1 && realTotalBuffer.length === MAX_CHUNK + 8)
                || (totalPackets === 1 && realTotalBuffer.length === remain + 8)) {

                replyData = Buffer.concat([replyData, realTotalBuffer.subarray(8)])
                totalBuffer = Buffer.from([])
                realTotalBuffer = Buffer.from([])

                totalPackets -= 1
                isDataOnGoing = false
                cb && cb(replyData.length, size)

                if (totalPackets <= 0) {
                  internalCallback(replyData)
                }
              }
            }
          }

          this.socket.once('close', () => {
            internalCallback(replyData, new Error('Socket is disconnected unexpectedly'))
          })

          this.socket.on('data', handleOnData)

          for (let i = 0; i <= numberChunks; i++) {
            if (i === numberChunks) {
              this.sendChunkRequest(numberChunks * MAX_CHUNK, remain)
            } else {
              this.sendChunkRequest(i * MAX_CHUNK, MAX_CHUNK)
            }

            isDataOnGoing = true;
            while (isDataOnGoing) {
              await new Promise(r => setTimeout(r, 100))
            }
          }

          break;
        }
        default: {
          reject(new Error('ERROR_IN_UNHANDLE_CMD ' + exportErrorMessage(header.commandId)))
        }
      }
    })
  }


  async getSmallAttendanceLogs(){

  }

  /**
   *  reject error when starting request data
   *  return { data: users, err: Error } when receiving requested data
   */
  async getUsers(callbackInProcess = () => { }) {
    // Free Buffer Data to request Data
    if (this.socket) {
      try {
        await this.freeData()
      } catch (err) {
        return Promise.reject(err)
      }
    }

    let data = null
    try {
      data = await this.readWithBuffer(REQUEST_DATA.GET_USERS, callbackInProcess)
    } catch (err) {
      return Promise.reject(err)
    }
  
    // Free Buffer Data after requesting data
    if (this.socket) {
      try {
        await this.freeData()
      } catch (err) {
        return Promise.reject(err)
      }
    }

    const USER_PACKET_SIZE = 72

    let userData = data.data.subarray(4)

    let users = []

    while (userData.length >= USER_PACKET_SIZE) {
      const user = decodeUserData72(userData.subarray(0, USER_PACKET_SIZE))
      users.push(user)
      userData = userData.subarray(USER_PACKET_SIZE)
    }

    return { data: users, err: data.err }
  }


  /**
   * 
   * @param {*} ip 
   * @param {*} callbackInProcess  
   *  reject error when starting request data
   *  return { data: records, err: Error } when receiving requested data
   */

  async getAttendances(callbackInProcess = () => { }) {

    if (this.socket) {
      try {
        await this.freeData()
      } catch (err) {
        return Promise.reject(err)
      }
    }

    let data = null
    try {
      data = await this.readWithBuffer(REQUEST_DATA.GET_ATTENDANCE_LOGS, callbackInProcess)
    } catch (err) {
      return Promise.reject(err)
    }

    if (this.socket) {
      try {
        await this.freeData()
      } catch (err) {
        return Promise.reject(err)
      }
    }

    const RECORD_PACKET_SIZE = 40

    let recordData = data.data.subarray(4)
    let records = []
    while (recordData.length >= RECORD_PACKET_SIZE) {
      const record = decodeRecordData40(recordData.subarray(0, RECORD_PACKET_SIZE))
      records.push({ ...record, ip: this.ip })
      recordData = recordData.subarray(RECORD_PACKET_SIZE)
    }

    return { data: records, err: data.err }

  }

  async getTime() {
		try {
        // Execute the command to get the current time
        const response = await this.executeCmd(COMMANDS.CMD_GET_TIME, '');

        // Check if the response is valid
        if (!response || response.length < 12) {
            throw new Error('Invalid response received for time command');
        }

        // Extract and decode the time value from the response
        const timeValue = response.readUInt32LE(8); // Read 4 bytes starting at offset 8
        return timeParser.decode(timeValue); // Parse and return the decoded time
    } catch (err) {
        // Log the error for debugging
        console.error('Error getting time:', err);

        // Re-throw the error for the caller to handle
        throw err;
    }
	}

  async setTime(tm) {
    try {
      // Validate the input time
      if (!(tm instanceof Date) && typeof tm !== 'number') {
        throw new TypeError('Invalid time parameter. Must be a Date object or a timestamp.');
      }

      // Convert the input time to a Date object if it's not already
      const date = (tm instanceof Date) ? tm : new Date(tm);

      // Encode the time into the required format
      const encodedTime = timeParser.encode(date);

      // Create a buffer and write the encoded time
      const commandString = Buffer.alloc(32);
      commandString.writeUInt32LE(encodedTime, 0);

      // Send the command to set the time
      return await this.executeCmd(COMMANDS.CMD_SET_TIME, commandString);
    } catch (err) {
      // Log the error for debugging
      console.error('Error setting time:', err);
      // Re-throw the error for the caller to handle
      throw err;
    }
  }
  
  async freeData() {
    return await this.executeCmd(COMMANDS.CMD_FREE_DATA, '')
  }

  async disableDevice() {
    return await this.executeCmd(COMMANDS.CMD_DISABLEDEVICE, REQUEST_DATA.DISABLE_DEVICE)
  }

  async enableDevice() {
    return await this.executeCmd(COMMANDS.CMD_ENABLEDEVICE, '')
  }

  async disconnect() {
    try {
      await this.executeCmd(COMMANDS.CMD_EXIT, '')
    } catch (err) {

    }
    return await this.closeSocket()
  }

  async getInfo(retries = 10) {
    while (retries > 0) {
      try {
        const data = await this.executeCmd(COMMANDS.CMD_GET_FREE_SIZES, '');

        if (data.length < 76) {
          throw new Error(`Unexpected response length: ${data.length} bytes`);
        }

        return {
          userCounts: data.readUIntLE(24, 4),
          logCounts: data.readUIntLE(40, 4),
          logCapacity: data.readUIntLE(72, 4),
          fpCounts: data.readUIntLE(32, 4)
        };
      } catch (err) {
        console.error('Error in getInfo:', err);
        retries--;

        // Wait for a short period before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Retrying getInfo...")
        this.io.emit('status-update', { status: 'Retrying to get data...' })
        this.io.emit('userbase-status', { status: 'Retrying to get data...' })
        if (retries === 0) {
          return { userCounts: 0, logCounts: 0, logCapacity: 0 };
        }
      }
    }
  }

  async setUser(uid, userid, name, password, role = 0, cardno = 0) {
      try {
          // Validate input parameters
          if (
              parseInt(uid) <= 0 || parseInt(uid) > 3000 ||
              userid.length > 9 ||
              name.length > 24 ||
              password.length > 8 ||
              cardno.toString().length > 10
          ) {
              throw new Error('Invalid input parameters');
          }

          // Allocate and initialize the buffer
          const commandBuffer = Buffer.alloc(72);

          // Fill the buffer with user data
          commandBuffer.writeUInt16LE(parseInt(uid), 0);
          commandBuffer.writeUInt16LE(role, 2);
          commandBuffer.write(password.toString().padEnd(8, '\0'), 3, 8); // Ensure password is 8 bytes
          commandBuffer.write(name.toString().padEnd(24, '\0'), 11, 24); // Ensure name is 24 bytes
          commandBuffer.writeUInt32LE(parseInt(cardno), 35);
          commandBuffer.writeUInt32LE(0, 40); // Placeholder or reserved field
          commandBuffer.write(userid.toString().padEnd(9, '\0'), 48, 9); // Ensure userid is 9 bytes

          // Send the command and return the result
          return await this.executeCmd(COMMANDS.CMD_USER_WRQ, commandBuffer);

      } catch (err) {
          // Log error details for debugging
          console.error('Error setting user:', err);

          // Re-throw error for upstream handling
          throw err;
      }
  }

  async deleteUser(uid) {
      try {
          // Validate input parameter
          if (parseInt(uid) <= 0 || parseInt(uid) > 3000) {
              throw new Error('Invalid UID: must be between 1 and 3000');
          }

          // Allocate and initialize the buffer
          const commandBuffer = Buffer.alloc(72);

          // Write UID to the buffer
          commandBuffer.writeUInt16LE(parseInt(uid), 0);

          // Send the delete command and return the result
          return await this.executeCmd(COMMANDS.CMD_DELETE_USER, commandBuffer);

      } catch (err) {
          // Log error details for debugging
          console.error('Error deleting user:', err);

          // Re-throw error for upstream handling
          throw err;
      }
  }

  async getFingerprints(callbackInProcess = () => { }) {
    try { 
      // Free Buffer Data to request Data
      if (this.socket) {
        try {
          await this.freeData()
        } catch (err) {
          return Promise.reject(err)
        }
      }

      let data = null
      try {
        data = await this.readWithBuffer(REQUEST_DATA.GET_FINGERPRINTS, callbackInProcess)
      } catch (err) {
        return Promise.reject(err)
      }
    
      // Free Buffer Data after requesting data
      if (this.socket) {
        try {
          await this.freeData()
        } catch (err) {
          return Promise.reject(err)
        }
      }

      let PACKET_OFFSET = 0;
      let fpData = data.data.subarray(4)
      let fp = []

      while (PACKET_OFFSET < fpData.length) {
        const entrySize = fpData.readUIntLE(PACKET_OFFSET, 2)
        const template = decodeFingerprintData(fpData.subarray(PACKET_OFFSET, PACKET_OFFSET + entrySize))
        fp.push(template)
        PACKET_OFFSET += entrySize
      }

      return { data: fp, err: data.err }

    } catch (err) {
      // Log error details for debugging
      console.error('Error getting fingerprint:', err);

      // Re-throw error for upstream handling
      throw err;
    }
  }

  async setFingerprint(uid, index, flag, template, fpSize) {
    try {
      // Validate input parameters
      if (
          parseInt(uid) <= 0 || parseInt(uid) > 3000
      ) {
          throw new Error('Invalid input parameters');
      }

      // Free Buffer Data to request Data
      if (this.socket) {
        try {
          await this.freeData()
        } catch (err) {
          return Promise.reject(err)
        }
      }

      //init the prep struct
      const prepBuffer = Buffer.alloc(4)
      prepBuffer.writeUInt16LE(parseInt(fpSize), 0)
      prepBuffer.writeUInt16LE(0, 2)

      // Allocate and initialize the command buffer
      const commandBuffer = Buffer.alloc(6);
      // Fill the buffer with user data
      commandBuffer.writeUInt16LE(parseInt(uid), 0)
      commandBuffer.writeUInt16LE(parseInt(index), 2)
      commandBuffer.writeUInt16LE(parseInt(flag), 3) //0 means invalid, 1 is valid, 3 is duress
      commandBuffer.writeUInt16LE(parseInt(fpSize), 4)
      
      //convert string back to binary using base64
      const binaryData = Buffer.from(template, 'base64')
      const templateBuffer = Buffer.alloc(fpSize)
      binaryData.copy(templateBuffer, 0)
      // Send the commands and return the result
      await this.executeCmd(COMMANDS.CMD_PREPARE_DATA, prepBuffer)
      await this.executeCmd(COMMANDS.CMD_DATA, templateBuffer)
      await this.executeCmd(COMMANDS.CMD_TMP_WRITE, commandBuffer)

      // Free Buffer Data after requesting data
      if (this.socket) {
        try {
          await this.freeData()
        } catch (err) {
          return Promise.reject(err)
        }
      }
    } catch (err) {
      // Log error details for debugging
      console.error('Error setting fingerprint:', err);

      // Re-throw error for upstream handling
      throw err
    }
  }

  async clearAttendanceLog (){
    return await this.executeCmd(COMMANDS.CMD_CLEAR_ATTLOG, '')
  }

  async getRealTimeLogs(cb = () => {}) {
      this.replyId++; // Increment the reply ID for this request

      try {
          // Create a buffer with the command header to request real-time logs
          const buf = createTCPHeader(COMMANDS.CMD_REG_EVENT, this.sessionId, this.replyId, Buffer.from([0x01, 0x00, 0x00, 0x00]));

          // Send the request to the device
          this.socket.write(buf, null, (err) => {
              if (err) {
                  // Log and reject the promise if there is an error writing to the socket
                  console.error('Error sending real-time logs request:', err);
                  throw err;
              }
          });

          // Ensure data listeners are added only once
          if (this.socket.listenerCount('data') === 0) {
              this.socket.on('data', (data) => {
                  // Check if the data is an event and not just a regular response
                  if (checkNotEventTCP(data)) {
                      // Process the data if it is of the expected length
                      if (data.length > 16) {
                          // Decode and pass the log to the callback
                          cb(decodeRecordRealTimeLog52(data));
                      }
                  }
              });
          }

      } catch (err) {
          // Handle errors and reject the promise
          console.error('Error getting real-time logs:', err);
          throw err;
      }
  }

}

module.exports = ZKLibTCP
