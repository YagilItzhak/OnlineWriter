import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import CKEditor from '@ckeditor/ckeditor5-react';
import React from 'react';
import { Navigate } from 'react-router';
import Cookies from 'universal-cookie';

interface Text {
    text: string,
    didGetFileContent: boolean,
    sync: boolean,
}

export default class Editor extends React.Component<any,Text> {
    constructor(props: any) {
        super(props);
        this.setText = this.setText.bind(this);
        this.getFileContent = this.getFileContent.bind(this);
        this.disconnectFromFile = this.disconnectFromFile.bind(this);
        this.syncFile = this.syncFile.bind(this);
        this.state = {
            text: '',
            didGetFileContent: true,
            sync: false,
        }
    }

    componentDidMount() {
        this.getFileContent();
        this.syncFile();
    }

    getFileContent() {
        const cookies = new Cookies();
        fetch('http://localhost:5000/editor', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({filePath: cookies.get('file'), username: cookies.get('username')}),
        }).then((res) => {
            if(res.status === 200) {
                res.json().then((content) => {
                    this.setState({text: content.fileContent});
                });
            } else {
                console.log(res.status);
            }
        });
    }

     saveFile(evt: any, newText: any, isInsert: boolean) {
        let change: string = '';
        let position: number = 0;
        if(isInsert) {
            if(this.state.text.length === 0) {
                change = newText;
            } else {
                for(let i=0;i<this.state.text.length;i++) {
                    if(newText.toString().charAt(i) !== this.state.text.charAt(i)) {
                        position = i;
                        change += newText.toString().charAt(i);
                        for(let j=i;j<this.state.text.length;j++) {
                            if(newText.toString().charAt(j+1) !== this.state.text.charAt(j)) {
                                change += newText.toString().charAt(j+1);
                            } else break;
                        }
                        break;
                    }
                }
            }
        } else {
            for(let i=0;i<newText.toString().length;i++) {
                if(newText.toString().charAt(i) !== this.state.text.charAt(i)) {
                    position = i;
                    change += this.state.text.charAt(i);
                    for(let j=i;j<this.state.text.length;j++) {
                        if(newText.toString().charAt(j) !== this.state.text.charAt(j+1)) {
                            change += this.state.text.charAt(j+1);
                        } else break;
                    }
                    break;
                }
            }
        }
        console.log('Change: ' + change + '\n' + 'Pos: ' + position);
        const cookies = new Cookies();
        fetch('http://localhost:5000/saveFile', {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify( { filePath: cookies.get('file'), change: { position: position, change: change, isInsert: isInsert }, user: cookies.get('username') } ),
        });
    }

    syncFile() {
        const timer = setInterval(() => {
            if(!this.state.didGetFileContent) clearInterval(timer); //when user exit the file -> stop the timer
            const cookies = new Cookies();
            fetch('http://localhost:5000/syncFile', {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify( { filePath: cookies.get('file'), user: cookies.get('username') } ),
            }).then((res) => {
                if(res.status === 200) res.json().then((content) => {
                    console.log(content.change.change);
                    this.setState({sync: true});
                    if(content.change.isInsert) this.setState({text: this.state.text.slice(0, content.change.position) + content.change.change + this.state.text.slice(content.change.position)});
                    else this.setState({text: this.state.text.slice(0, content.change.position) + this.state.text.slice(content.change.position + content.change.change.length)});
                    this.setState({sync: false});
                });
            });
        }, 30);
    }

    setText(evt: any, newText: any) {
        if(!this.state.sync) {
            //if newText length is bigger than the prev text then the user inserted a char but otherwise the user deleted one
            const isInsert: boolean = newText.toString().length > this.state.text.length;
            this.saveFile(evt, newText, isInsert);
        }
    }

    disconnectFromFile() {
        const cookies = new Cookies();
        fetch('http://localhost:5000/disconnectFromFile', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({filePath: cookies.get('file'), username: cookies.get('username')}),
        }).then((res) => {
            if(res.status === 200) {
                this.setState({didGetFileContent: false});
            } else {
                this.setState({didGetFileContent: true});
            }
        });
    }

    shareFile() {
        const userToShare = prompt('Please enter the user you want to share this file with: ');
        const cookies = new Cookies();
        fetch('http://localhost:5000/shareFile', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filePath: cookies.get('file'), userToShare: userToShare }),
        });
    }

    deleteFile() {
        const cookies = new Cookies();
        fetch('http://localhost:5000/deleteFile', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filePath: cookies.get('file') }),
        }).then((res) => {
            if(res.status === 200) this.setState({})
        });
    }

    render() {
        const cookies = new Cookies();
        if(this.state.didGetFileContent) {
            return (
                <div className="Editor">
                    <button onClick={this.disconnectFromFile}>Back</button>
                    <div className="editor">
                        <h1 id="file_name">{cookies.get('file')}</h1>
                        <CKEditor
                            editor={ClassicEditor}
                            data={this.state.text}
                            onChange={(evt: any, editor: any) => this.setText(evt, editor.getData().toString())}
                        />
                    </div>
                    <div>
                        <h2>content</h2>
                        <p>{this.state.text}</p>
                        <button onClick={this.shareFile}>Share File</button>
                        {cookies.get('file').toString().split('/').includes(cookies.get('username')) ? <button onClick={this.deleteFile}>Delete File</button> : <></>}
                    </div>
                </div>
            );
        } else {
            const cookies = new Cookies();
            cookies.remove('file');
            return (
                <Navigate to='/home' replace={true}  />
            );
        }
    }
}