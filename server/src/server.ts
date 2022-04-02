import database from './database';
import express from 'express';
import bodyParser from 'body-parser';
const cookieParser = require('cookie-parser')
const cors = require('cors');

const app = express();
const fileChanges = new Map();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(cookieParser());

const enum License {
    AUTHOR,
    EDITOR,
    VIEWER
}

interface UserDocument {
    author: string;
    name: string;
    license: License;
}

interface Response {
    errors: Array<string>;
    documents: Set<UserDocument>;
}

app.post('/editor', (req, res) => {
    const params = req.body;
    const filePath = params.filePath;
    const username = params.username;
    if (typeof filePath === 'string') {
        database.getConnectedUsersToFile(filePath).then((connectedUsers) => {
            if (connectedUsers.length === 0) {
                database.connectToFile(filePath, username).then(() => {
                    database.getFileContent(filePath, username).then((fileContent) => {
                        res.status(200).json({ 'fileContent': fileContent });
                    });
                }).catch(() => {
                    res.status(500).json({ 'msg': 'Internal Server Error While Connecting To File!!' });
                });
            } else {
                //open p2p connection between the new user and the existing users and then connect the user to the file
                //res.status(200).json({'msg': 'There are connecting users to this file'});
                database.connectToFile(filePath, username).then(() => {
                    database.getFileContent(filePath, username).then((fileContent) => {
                        res.status(200).json({ 'fileContent': fileContent });
                    });
                }).catch(() => {
                    res.status(500).json({ 'msg': 'Internal Server Error While Connecting To File!!' });
                });
            }
        });
    } else {
        res.status(400).json({ 'msg': 'Bad Request!!' });
    }
});

app.post('/disconnectFromFile', (req, res) => {
    const params = req.body;
    const filePath = params.filePath;
    const username = params.username;
    if (typeof filePath === 'string') {
        database.disconnectFromFile(filePath, username).then(() => {
            res.status(200).send('Successfully disconnected from file!');
        });
    } else {
        res.status(400).send('Bad Request!!');
    }
});

app.post('/shareFile', (req, res) => {
    const params = req.body;
    const filePath = params.filePath;
    const userToShare = params.userToShare;
    if (typeof filePath === 'string' && typeof userToShare === 'string') {
        database.checkIfUserExists(userToShare).then((isUserExist) => {
            if (isUserExist) database.shareFile(filePath, userToShare);
        });
    } else {
        res.status(400).send('Bad Request!!');
    }
});

app.post('/saveFile', (req, res) => {
    const params = req.body;
    const filePath = params.filePath;
    const change = params.change;
    const cmd = params.command;
    if (typeof filePath === 'string') {
        if (cmd === 'Delete') {
            //delete file
        } else {
            database.getConnectedUsersToFile(filePath).then((connectedUsers) => {
                if (fileChanges.has(filePath)) {
                    const changes = fileChanges.get(filePath);
                    let pos: number = change.position;
                    changes.forEach((element: any) => {
                        if (element.isInsert) {
                            if (element.position < change.position) pos += element.change.length;
                        }
                        else {
                            if (element.position < change.position) pos -= element.change.length;
                        }
                    });
                    changes.push({
                        'change': change.change,
                        'position': pos,
                        'isInsert': change.isInsert,
                        'recievers': connectedUsers.length,
                        'whoRecieved': [],
                    });
                    fileChanges.set(filePath, changes);
                } else {
                    fileChanges.set(filePath, [{
                        'change': change.change,
                        'position': change.position,
                        'isInsert': change.isInsert,
                        'recievers': connectedUsers.length,
                        'whoRecieved': [],
                    }]);
                }
            });
            if (change.isInsert) {
                database.insertToFile(filePath, change);
            } else {
                database.removeFromFile(filePath, change);
            }
            res.status(200).json({ 'msg': 'Saved File Successfully!' });
        }
    } else {
        res.status(400).json({ 'msg': 'Bad Request!!' });
    }
});

app.post('/syncFile', (req, res) => {
    const params = req.body;
    const filePath = params.filePath;
    const user = params.user;
    if (typeof user === 'string' && typeof filePath === 'string') {
        if (fileChanges.get(filePath) === undefined) res.status(251).send('No changes');
        else if (fileChanges.get(filePath)[0] === undefined) res.status(251).send('No changes');
        else if (fileChanges.get(filePath)[0].recievers === 0) {
            const changes = fileChanges.get(filePath);
            changes.shift();
            if (changes.length == 0) fileChanges.delete(filePath);
            else fileChanges.set(filePath, changes);
            res.status(250).send('No more recievers');
        } else if (fileChanges.get(filePath)[0].whoRecieved.includes(user)) res.status(252).send('You already got this change');
        else {
            fileChanges.get(filePath)[0].recievers--;
            fileChanges.get(filePath)[0].whoRecieved.push(user);
            res.status(200).json({ 'change': fileChanges.get(filePath)[0] });
        }
    } else {
        res.status(400).send('Bad Request!!');
    }
});

app.post('/getUserFile', function (req, res) {
    const params = req.body;
    const username = params.username;
    if (typeof username === 'string') {
        database.getFilesByUser(username).then((filesObject) => {
            res.status(200).send(filesObject);
        });
    } else {
        res.status(400).send('Bad Request!!');
    }
});

app.post('/createNewFile', function (req, res) {
    const params = req.body;
    const owner = params.owner;
    const fileName = params.fileName;
    if (typeof owner === 'string' && typeof fileName === 'string') {
        database.createNewFile(owner, fileName).then(() => {
            res.status(200).send(`${fileName} created successfully!`);
        });
    } else {
        res.status(400).send('Bad Request!!');
    }
});

app.post('/getCookieByUsername', function (req, res) {
    const params = req.body;
    const usernameToCheck = params.username;
    if (typeof usernameToCheck === 'string') {
        database.getCookie(usernameToCheck).then((cookie) => {
            if (cookie === '') res.status(404).send('Cookie / Username does not exist');
            else res.status(200).json({ 'cookie': cookie });
        })
    } else {
        res.status(400).send('Bad Request!!');
    }
});

app.post('/login', function (req, res) {
    const params = req.body;
    if (!params) {
        const err = 'user did not send parameters!!';
        res.status(400).send(err);
        return;
    }
    const username = params.username;
    const password = params.password;
    const cookie = params.cookie;
    if (typeof username === 'string' && typeof password === 'string') {
        database.login(username, password, cookie).then((isUserExists) => {
            if (isUserExists) {
                res.status(200).json({ 'msg': 'Logged In Successfully' });
            } else {
                res.status(401).json({ 'msg': 'Failed to logged in' });
            }
        });
    } else {
        res.status(400).send('Bad Parameters!!');
    }
});

app.post('/signup', function (req, res) {
    const params = req.body;
    if (!params) {
        const err = 'user did not send parameters!!';
        res.status(400).send(err);
        return;
    }
    const username = params.username;
    const email = params.email;
    const password = params.password;
    const cookie = params.cookie;
    if (typeof username === 'string' && typeof password === 'string' && typeof email === 'string') {
        database.insertNewUser(username, password, email, cookie).then((errors) => {
            let responseMessuage: Response = { errors: errors, documents: new Set() };
            const isValidUserInformation = errors.length === 0;
            if (isValidUserInformation) {
                res.status(200).json({ 'msg': 'Sign Up Successfully' });
            }
            else {
                res.status(401).json(responseMessuage);
            }
        });
    } else {
        res.status(400).send('Bad Parmameters!!');
    }
});

app.listen(5000, () => console.log("Server is running\n"));
