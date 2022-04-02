const sqlite3 = require('sqlite3').verbose();
import * as fs from 'fs';
import * as crypto from 'crypto';


class Database {
  private db: any;

  constructor() {
    this.db = new sqlite3.Database('./database.sqlite3', (err: any) => {
      if (err) {
        return console.error(err.message);
      }
      this.createTable();
      console.log('Connected to the SQlite database.');
    });
  }

  public createTable() {
    this.db.run("CREATE TABLE IF NOT EXISTS USERS(userId INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, email TEXT, files TEXT, cookie TEXT)");
    this.db.run("CREATE TABLE IF NOT EXISTS FILES(filePath TEXT, connectedUsers TEXT)");
  }

  public async insertNewUser(name: string, password: string, email: string, cookie: string): Promise<string[]> {
    return new Promise(async (resolve) => {
      let errorsList: string[] = [];
      await this.checkIfUsernameOrEmailExists(name, email).then(
        async (isUserOrEmailExists) => {
          if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            errorsList.push('Invalid email address');
          }
          if (isUserOrEmailExists) {
            errorsList.push('User/email already exists');
          }
          if (password.length < 8) {
            errorsList.push('Password is too short');
          }
          //check for email validation and if the username is not exist yet and the password length
          if (errorsList.length === 0) {
            await this.createHashPassword(password).then(async (hashPassword: string) => {
              const sqlInsertQuery: string = `INSERT INTO USERS (username, password, email, cookie) VALUES ('${name}', '${hashPassword}', '${email}', '${cookie}')`;
              await this.sendRunQueries(sqlInsertQuery).then((value) => {
                if (value) {
                  fs.mkdir(`./users/${name}`, { recursive: true }, (err) => {
                    if (err) console.error(err);
                  })
                }
              });
            });
          }
        }
      )
      resolve(errorsList);
    });
  }

  public async createHashPassword(password:string): Promise<string> {
    return new Promise(async (resolve) => {
      const encryptedPassword: string = crypto.createHash('sha256').update(password).digest('hex');
      resolve(encryptedPassword);
    });
  }

  public async getCookie(username: string): Promise<string> {
    return new Promise(async (resolve) => {
      const checkIfCookieExistQuery = `SELECT cookie FROM USERS WHERE username LIKE '${username}'`;
      await this.sendSelectQueries(checkIfCookieExistQuery).then(
        (cookie: any) => {
          if (cookie.cookie === null || cookie === undefined) resolve('');
          else resolve(cookie.cookie);
        }
      );
    });
  }

  public async checkIfUsernameOrEmailExists(username: string, email: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const sqlQuery: string = `SELECT username, email FROM USERS WHERE username LIKE "${username}" OR email LIKE "${email}"`;
      await this.sendSelectQueries(sqlQuery).then(
        (value: any) => {
          // Return true if username/email already exists, otherwise return false
          resolve(value !== undefined);
        }
      );
    });
  }

  public async checkIfUserExists(username: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const sqlQuery: string = `SELECT username FROM USERS WHERE username LIKE "${username}"`;
      await this.sendSelectQueries(sqlQuery).then(
        (value: any) => {
          // Return true if username/email already exists, otherwise return false
          resolve(value !== undefined);
        }
      );
    });
  }

  public async login(username: string, password: string, cookie: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      this.createHashPassword(password).then(async (hashPassword:string) => {
        const sqlQuery: string = `SELECT username FROM USERS WHERE username LIKE '${username}' AND password LIKE '${hashPassword}'`;
        await this.sendSelectQueries(sqlQuery).then(
          (value: any) => {
            if(value !== undefined) {
              const sqlQueryToUpdateCookie: string = `UPDATE USERS SET cookie='${cookie}' WHERE username LIKE '${username}'`;
              this.sendRunQueries(sqlQueryToUpdateCookie).then((value) => {
                if(value) {
                  resolve(true);
                } else {
                  resolve(false);
                }
              })
            } else {
              resolve(false);
            }
          }
        );
      });
    });
  }
  public closeDB() {
    // close the database connection
    this.db.close((err: Error) => {
      if (err) {
        console.error('Closing Error');
        return console.error(err.message);
      }
      console.log('Close the database connection.');
    });
  }
  public async createNewFile(owner: string, filename: string) {
    const filePath: string = `users/${owner}/${filename}.txt`;
    if (!fs.existsSync(filePath)) {
      fs.appendFile(filePath, '', async (err) => {
        if (err) console.log(err.message);
        else {
          const getAllFilesQuery: string = `SELECT files FROM USERS WHERE username LIKE '${owner}'`;
          let sqlRunQuery: string = ``;
          let isInsertedToFilesTableSuccessfully: boolean = true;
          await this.sendSelectQueries(getAllFilesQuery).then((files: any) => {
            if (files !== false) {
              if (files.files !== null && files.files !== '') sqlRunQuery = `UPDATE USERS SET files='${files.files},${filePath}' WHERE username LIKE '${owner}'`;
              else sqlRunQuery = `UPDATE USERS SET files='${filePath}' WHERE username LIKE '${owner}'`;
              const sqlInsertQuery: string = `INSERT INTO FILES (filePath) VALUES ('${filePath}')`;
              this.sendRunQueries(sqlInsertQuery).then(async (value) => {
                if (!value) {
                  isInsertedToFilesTableSuccessfully = false;
                  await this.deleteFile(filePath);
                }
              })
            } else fs.unlinkSync(filePath);
          }).then(async () => {
            if (sqlRunQuery !== `` && isInsertedToFilesTableSuccessfully) {
              await this.sendRunQueries(sqlRunQuery).then((value) => {
                if (value) console.log('File created successfully');
                else console.log(value);
              });
            }
          });
        }
      });
    }
  }

  public async shareFile(filePath: string, userToShare: string) {
    const getAllFilesQuery: string = `SELECT files FROM USERS WHERE username LIKE '${userToShare}'`;
    let addFileQuery: string = '';
    await this.sendSelectQueries(getAllFilesQuery).then((files) => {
      if(files !== false) {
        if(files.files !== null && files.files !== '') addFileQuery += `UPDATE USERS SET files='${files.files},${filePath}' WHERE username LIKE '${userToShare}'`;
        else addFileQuery = `UPDATE USERS SET files='${filePath}' WHERE username LIKE '${userToShare}'`;
        this.sendRunQueries(addFileQuery);
      }
    })
  }

  public async getFilesByUser(username: string) : Promise<object[]> {
    return new Promise(async(resolve) => {
      const getFilesQuery: string = `SELECT files FROM USERS WHERE username LIKE '${username}'`;
      this.sendSelectQueries(getFilesQuery).then((files: any) => {
        if(files !== false) {
          if(files !== null && files !== '') {
            const allFiles = files.files.split(',');
            const allFilesObject: object[] = [];
            allFiles.forEach((file: string) => {
              const fileAndItsOwner = file.split('|');
              allFilesObject.push( { filePath: fileAndItsOwner[0], fileOwner: fileAndItsOwner[1] } );
            });
            resolve(allFilesObject);
          }
          else resolve([]);
        }
      });
    });
  }

  public async insertToFile(filePath: string, change: any) {
    fs.readFile(filePath, function read(err, data) {
        if (err) {
            throw err;
        }
        var file_content = data.toString();
        file_content = file_content.substring(change.position);
        const file = fs.openSync(filePath,'r+');
        const bufferedText = new Buffer(change.change+file_content);
        fs.writeSync(file, bufferedText, 0, bufferedText.length, change.position);
        fs.close(file);
    });
  }

  public async removeFromFile(filePath: string, change: any) {
    fs.readFile(filePath, function read(err, data) {
      if (err) {
        throw err;
      }
      let fileContent: string = data.toString();
      fileContent = fileContent.substring(0, change.position) + fileContent.substring(change.position + change.change.length);
      const file = fs.openSync(filePath, 'r+');
      const bufferedText: Buffer = Buffer.from(fileContent);
      fs.writeSync(file, bufferedText, 0, bufferedText.length, change.position - 1);
      fs.close(file);
    });
  }

  public async deleteFile(filePath: string) {
    //delete the file path from all users with access to this file
    const sqlQuery: string = `SELECT FILES FROM USERS`;
    await this.sendAllSelectQueries(sqlQuery).then((rows: any) => {
      rows.forEach(async (row: any) => {
        const filesArray = row.files.toString().split(',');
        if (filesArray.indexOf(filePath) > -1) {
          filesArray.splice(filesArray.indexOf(filePath), 1);
          let sqlRunQuery: string = `UPDATE USERS SET files='${filesArray.toString()}' WHERE files LIKE '${row.files}'`;
          await this.sendRunQueries(sqlRunQuery).then(async (value) => {
            if (value) {
              sqlRunQuery = `DELETE FROM FILES WHERE filePath LIKE '${filePath}'`;
              await this.sendRunQueries(sqlRunQuery).then((value) => {
                if (value) {
                  fs.unlinkSync(filePath);
                } else console.log(value)
              });
            } else {
              console.log(value);
            }
          });
        }
      })
    });
  }

  public async getConnectedUsersToFile(filePath: string): Promise<string[]> {
    return new Promise((resolve) => {
      const sqlQuery: string = `SELECT connectedUsers FROM FILES WHERE filePath LIKE '${filePath}'`;
      this.sendSelectQueries(sqlQuery).then((connectedUsers) => {
        if (connectedUsers.connectedUsers && connectedUsers.connectedUsers !== null && connectedUsers.connectedUsers !== '') resolve(connectedUsers.connectedUsers.split(','));
      }).then(() => resolve([]));
    });
  }

  public async connectToFile(filePath: string, username: string) {
    const getConnectedUsersQuery: string = `SELECT connectedUsers FROM FILES WHERE filePath LIKE '${filePath}'`;
    await this.sendSelectQueries(getConnectedUsersQuery).then(async (connectedUsers: any) => {
      if (connectedUsers !== false) {
        if (connectedUsers.connectedUsers === null || connectedUsers.connectedUsers === '') {
          const sqlRunQuery: string = `UPDATE FILES SET connectedUsers='${username}' WHERE filePath LIKE '${filePath}'`;
          await this.sendRunQueries(sqlRunQuery);
        } else if (!(connectedUsers.connectedUsers.split(',').indexOf(username) > -1)) { //check if user is not connected to file
          const sqlRunQuery: string = `UPDATE FILES SET connectedUsers='${connectedUsers.connectedUsers},${username}' WHERE filePath LIKE '${filePath}'`;
          await this.sendRunQueries(sqlRunQuery);
        }
      }
    });
  }

  public async getFileContent(filePath: string, username: string) : Promise<string> {
    return new Promise(async(resolve) => {
      fs.readFile(filePath, (err, data) => {
        if(err) {
          console.error(err);
          this.disconnectFromFile(filePath, username).then(() => {
            resolve('');
          });
        }
        resolve(data.toString());
      });
    });
  }

  public async disconnectFromFile(filePath: string, username: string) {
    const getConnectedUsersQuery: string = `SELECT connectedUsers FROM FILES WHERE filePath LIKE '${filePath}'`;
    await this.sendSelectQueries(getConnectedUsersQuery).then(async (connectedUsers: any) => {
      if (connectedUsers !== false) {
        if (connectedUsers.connectedUsers !== null && connectedUsers.connectedUsers !== '') {
          if (connectedUsers.connectedUsers.split(',').indexOf(username) > -1) { //check if user is connected to file
            const connectedUsersArray = connectedUsers.connectedUsers.split(',');
            connectedUsersArray.splice(connectedUsersArray.indexOf(username), 1);
            const sqlRunQuery: string = `UPDATE FILES SET connectedUsers='${connectedUsersArray.toString()}' WHERE filePath LIKE '${filePath}'`;
            await this.sendRunQueries(sqlRunQuery);
          }
        }
      }
    });
  }

  private async sendSelectQueries(sqlQuery: string): Promise<any> {
    return new Promise((resolve) => {
      this.db.get(sqlQuery, (err: Error, value: any) => {
        if (err) {
          console.error(err.message);
          resolve(false);
        } else {
          resolve(value);
        }
      })
    });
  }

  private async sendRunQueries(sqlQuery: string): Promise<string | boolean> {
    return new Promise((resolve) => {
      this.db.run(sqlQuery, (err: Error) => {
        if (err) {
          console.error(err.message);
          resolve(err.message);
        } else {
          resolve(true);
        }
      })
    });
  }

  private async sendAllSelectQueries(sqlQuery: string): Promise<any> {
    return new Promise((resolve) => {
      this.db.all(sqlQuery, (err: Error, rows: any) => {
        if (err) {
          console.error(err.message);
          resolve(false);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

const database = new Database();

export default database;
