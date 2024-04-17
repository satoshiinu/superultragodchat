const packetTypesC2S = {
    sendMessage: "\x10",
    sendUserName: "\x30"

}
const packetTypesS2C = {
    userInit: "\x01",
    userJoin: "\x02",
    userQuit: "\x03",
    disconnectedMessage: "\x04",
    sendSentMessage: "\x10",
    sendUserName: "\x30"
}


let socket = null;
isServer = null;
ws = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    isServer = true;
} else {
    isServer = false;
}

if (isServer) ServerInit();
else ClientInit();
function ServerInit() {
    Packet = class {
        static send(sendChar, message, client) {
            client.send(`${sendChar ?? "\0"}${message}`)
        }
        static gotMessage(message, client) {
            let data = new Message(message, client.userId, client.userName);
            messages.push(data);
            wss.clients.forEach(client => {
                this.sendSentMessage(JSON.stringify(data), client);
            });
        }
        static sendSentMessage(message, client) {
            this.send(packetTypesS2C.sendSentMessage, message, client);
        }
        static userJoin(clientSrc) {
            let data = {};
            data.userId = clientSrc.userId;
            wss.clients.forEach(client => {
                this.send(packetTypesS2C.userJoin, JSON.stringify(data), client);
            });
        }
        static userQuit(clientSrc) {
            let data = {};
            data.userId = clientSrc.userId;
            wss.clients.forEach(client => {
                this.send(packetTypesS2C.userQuit, JSON.stringify(data), client);
            });
        }
        static userInit(clientSrc) {
            let data = {};
            data.userId = clientSrc.userId;
            this.send(packetTypesS2C.userInit, JSON.stringify(data), clientSrc);
            wss.clients.forEach(client => {
                {
                    let data = {};
                    data.userId = client.userId;
                    this.send(packetTypesS2C.userJoin, JSON.stringify(data), clientSrc);
                }
                {
                    let data = {};
                    data.userId = client.userId;
                    data.userName = client.userName ?? null;
                    this.send(packetTypesS2C.sendUserName, JSON.stringify(data), clientSrc);
                }
            });
            messages.forEach(message => {
                this.send(packetTypesS2C.sendSentMessage, JSON.stringify(message), clientSrc);
            })
        }
        static gotUserName(userName, clientSrc) {
            clientSrc.userName = userName;
            wss.clients.forEach(client => {
                let data = {};
                data.userId = clientSrc.userId;
                data.userName = clientSrc.userName ?? null;
                this.send(packetTypesS2C.sendUserName, JSON.stringify(data), client);
            });
        }
    }

    const server = require('ws').Server;
    const port = 8001;
    const wss = new server({ port: port });
    const { v4: uuidv4 } = require('uuid');


    wss.on('connection', ws => {
        userInit(ws);
        Packet.userJoin(ws);
        console.log('connected! ID:' + ws.userId);

        ws.on('message', ms => {
            let message = ms.toString().slice(1);
            let msRaw = ms.toString();
            switch (msRaw[0]) {
                case packetTypesC2S.sendMessage:
                    Packet.gotMessage(message, ws);
                    break;
                case packetTypesC2S.sendUserName:
                    Packet.gotUserName(message, ws);
                    break;
                default:
                    console.log("default: " + message);
            }
        });

        ws.on('close', () => {
            Packet.userQuit(ws);
            console.log('disconnected! ID:' + ws.userId);
        });
    });

    function userInit(ws) {
        ws.userId = uuidv4();
        Packet.userInit(ws);
    }
    console.log("serving at port " + port);

}
function ClientInit() {
    Packet = class {
        static send(sendChar, message) {
            ws.send(`${sendChar ?? "\0"}${message}`);
        }
        static sendMessage(message) {
            this.send(packetTypesC2S.sendMessage, message);
        }
        static sentMessage({ message, userId, userName }) {
            messages.push(new Message(message, userId, userName));
        }
        static sendUserName(userName) {
            this.send(packetTypesC2S.sendUserName, userName);
        }
        static getUserName({ userId, userName }) {
            users[userId].userName = userName;
        }
        static userInit({ userId }) {
            clientUserId = userId;
            Packet.sendUserName(userNameInput.value);
        }
        static userJoin({ userId }) {
            users[userId] = new UserClient;
        }
        static userQuit({ userId }) {
            delete users[userId];
        }
    }

    ws = new WebSocket(`ws://${location.hostname}:8081`);
    ws.onmessage = (ms) => {
        let message = ms.data.toString().slice(1);
        let msRaw = ms.data;
        console.log(`sent: ${message}, ${msRaw.charCodeAt(0).toString(16)}`);
        switch (msRaw[0]) {
            case packetTypesS2C.userInit:
                Packet.userInit(JSON.parse(message));
                break;
            case packetTypesS2C.userJoin:
                Packet.userJoin(JSON.parse(message));
                break;
            case packetTypesS2C.userQuit:
                Packet.userQuit(JSON.parse(message));
                break;
            case packetTypesS2C.sendSentMessage:
                Packet.sentMessage(JSON.parse(message));
                break;
            case packetTypesS2C.sendUserName:
                Packet.getUserName(JSON.parse(message));
                break;
            default:
            //console.log(`default: ${message}, ${msRaw.charCodeAt(0).toString(16)}`);
        }
    }
    ws.onclose = (ms) => {
        console.log("closed: " + ms);
    }
    ws.onerror = (ms) => {
        console.log("error: " + ms);
    }
}

messages = new Array();
class Message {
    constructor(message, userId, userName) {
        this.userId = userId;
        this.userName = userName;
        this.message = message;
    }
    getDisplayName() {
        return users[this.userId]?.userName ?? "unknown";
        //return users[this.userId]?.userName ?? this.userName ?? this.userId;
    }
}
function isConnected(userId) {
    return userId in users;
}

class UserClient {
    userName = null;
}
let clientUserId = null;
let users = new Object;

function updateLoop() {
    updateMessagesText();
    updateUserList();
    updateUserIdText();
    requestAnimationFrame(updateLoop);
}
if (!isServer) updateLoop();

function updateMessagesText() {
    let text = "";
    for (let message of messages) {
        text += `${isConnected(message.userId) ? "" : "*"}${message.getDisplayName()}: ${message.message}\n`
    }
    messagesTextElem.innerText = text;
}
function updateUserList() {
    let text = "";
    for (let [id, user] of Object.entries(users)) {
        text += `${id}: ${user.userName}\n`
    }
    userListElem.innerText = text;
}
function updateUserIdText() {
    userIdElem.innerText = clientUserId;
}