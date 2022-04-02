import React from 'react'
import GridSystem from './GridSystem';
import { Navigate } from 'react-router';
import Cookies from 'universal-cookie';

interface Files {
    isLogin: boolean,
    files: object[],
    isEnterFile: boolean,
}

const FileItem = (props: any) => {
    const {filePath, fileOwner} = props;

    return (
        <div className="file">
            <h3>{`File path: ${filePath}`}</h3>
            <h3>{`File owner: ${fileOwner}`}</h3>
        </div>
    );
}

export default class Home extends React.Component<any, Files> {
    constructor(props: any) {
        super(props);
        this.setIsLogin = this.setIsLogin.bind(this);
        this.setFiles = this.setFiles.bind(this);
        this.enterFile = this.enterFile.bind(this);
        this.getFiles = this.getFiles.bind(this);
        this.logout = this.logout.bind(this);
        this.state = {
            isLogin: true,
            files: [],
            isEnterFile: false,
        }
    }

    componentDidMount() {
        this.getFiles();
    }

    getFiles() {
        const cookies = new Cookies();
        if(cookies.get('username') === undefined) this.setIsLogin();
        else {
            fetch('http://localhost:5000/getUserFile', {
                method: 'POST',
                mode: 'cors',
                headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                },
                body: JSON.stringify( {username: cookies.get('username')} ),
            }).then((res) => res.json().then((content) => {
                console.log(content);
                this.setFiles(content);
            }));
        }
    }

    logout() {
        const cookies = new Cookies();
        cookies.remove('username', { path: '/' });
        cookies.remove('cookie', { path: '/' });
        this.setIsLogin();
    }

    createNewFile() {
        const cookies = new Cookies();
        fetch('http://localhost:5000/createNewFile', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({fileName: 'a', owner: cookies.get('username')}),
        }).then((res) => {
            if(res.status === 200) this.getFiles();
        })
    }

    setIsLogin() {
        this.setState({isLogin: !this.state.isLogin});
    }

    setFiles(files: object[]) {
        this.setState({files: files});
    }

    enterFile(filePath: string, fileOwner: string) {
        const cookies = new Cookies();
        cookies.set('file', filePath, { path: '/' });
        this.setState( { isEnterFile: true } );
    }

    render() {
        if(this.state.isLogin) {
            if(!this.state.isEnterFile) {
                return (
                    <div>
                        <GridSystem colCount={2} md={6}>
                            {
                                this.state.files.length > 0 ? this.state.files.map((item: any) => 
                                <div onClick={() => this.enterFile(item.filePath, item.fileOwner)}>
                                    <FileItem key={item.key} filePath={item.filePath} fileOwner={item.fileOwner} />
                                </div>
                                ) : [<p>No files found</p>]
                            }
                        </GridSystem>
                        <button onClick={this.createNewFile}>Create new file</button>
                        <button onClick={this.logout}>Log out</button>
                    </div>
                );
            } else {
                return (
                    <Navigate to='/editor' replace={true}  />
                );
            }
        } else {
            return (
                <Navigate to='/login' replace={true} />
            );
        }
    }
}
