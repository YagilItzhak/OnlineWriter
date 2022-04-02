import React from 'react'
import { Navigate } from 'react-router';
import { Link } from 'react-router-dom';
import Cookies from 'universal-cookie';
import sha256 from 'crypto-js/sha256';
import "core-js/stable";
import "regenerator-runtime/runtime";

interface UserInfo {
    username: string,
    password: string,
    isSignin: boolean,
}

export default class Login extends React.Component<any, UserInfo> {
    constructor(props: any) {
        super(props);
        this.login = this.login.bind(this);
        this.state = {
            username: '',
            password: '',
            isSignin: false,
        }
    }

    componentDidMount() {
        this.checkIfUserAlreadyConnected();
    }

    checkIfUserAlreadyConnected() {
        const cookies = new Cookies();
        cookies.remove('file', { path: '/' }); //if cookie by the of 'file' exists delete it
        const username = cookies.get('username');
        const userCookie = cookies.get('cookie');
        if (userCookie !== undefined && username !== undefined) {
            fetch('http://localhost:5000/getCookieByUsername', {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'credentials': 'include',
                },
                body: JSON.stringify({ username: username }),
            }).then((res) => {
                if (res.status === 200) {
                    res.json().then((dbCookie) => {
                        if (dbCookie.cookie === userCookie) {
                            this.setState({ isSignin: true });
                        } else {
                            cookies.remove('cookie', { path: '/' });
                            cookies.remove('username', { path: '/' });
                        }
                    })
                } else {
                    cookies.remove('cookie', { path: '/' });
                    cookies.remove('username', { path: '/' });
                }
            }).catch(() => {
                cookies.remove('cookie', { path: '/' });
                cookies.remove('username', { path: '/' });
            });
        }
    }

    updateInput(evt: any, whatInput: string) {
        const value = evt.target.value;
        if (whatInput === "username") this.setState({ username: value });
        else this.setState({ password: value });
    }

    async login(evt: any) {
        evt.preventDefault();
        await fetch('http://localhost:5000/login', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'credentials': 'include',
            },
            body: JSON.stringify({ username: this.state.username, password: this.state.password, cookie: sha256(this.state.password).toString() }),
        }).then((res) => {
            if (res.status === 200) {
                const cookies = new Cookies();
                cookies.set('username', this.state.username, { path: '/' });
                cookies.set('cookie', sha256(this.state.password).toString(), { path: '/' });
                this.setState({ isSignin: !this.state.isSignin });
            }
            else alert(res);
        });
    }

    render() {
        if (this.state.isSignin) return (<Navigate to='/home' replace={true} />);
        else return (
            <div className="center">
                <h1>Login</h1>
                <form onSubmit={(evt) => this.login(evt)}>
                    <div className="txt_field">
                        <input type="text" name="username" value={this.state.username} onChange={(evt) => this.updateInput(evt, "username")} required />
                        <span></span>
                        <label>Username</label>
                    </div>
                    <div className="txt_field">
                        <input type="password" name="password" value={this.state.password} onChange={(evt) => this.updateInput(evt, "password")} required />
                        <span></span>
                        <label>Password</label>
                    </div>
                    <div className="pass">Forgot Password?</div>
                    <input type="submit" value="Login" />
                    <div className="signup_link">
                        Not a member? <Link to="/signup">Signup</Link>
                    </div>
                </form>
            </div>
        );
    }
}
