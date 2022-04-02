import React from 'react'
import { Navigate } from 'react-router';
import Cookies from 'universal-cookie';
import sha256 from 'crypto-js/sha256';
import { Link } from 'react-router-dom';

interface UserInfo {
    username: string,
    email: string,
    password: string,
    isSignin: boolean,
}

export default class Signup extends React.Component<any, UserInfo> {
    constructor(props: any) {
        super(props);
        this.signup = this.signup.bind(this);
        this.state = {
            username: '',
            email: '',
            password: '',
            isSignin: false,
        }
    }

    updateInput(evt: any, whatInput: string) {
        const value = evt.target.value;
        if (whatInput === "username") this.setState({ username: value });
        else if (whatInput === "email") this.setState({ email: value });
        else this.setState({ password: value });
    }

    async signup(evt: any) {
        evt.preventDefault();
        await fetch('http://localhost:5000/signup', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'credentials': 'include',
            },
            body: JSON.stringify({ username: this.state.username, email: this.state.email, password: this.state.password, cookie: sha256(this.state.password).toString() }),
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
                <h1>Signup</h1>
                <form onSubmit={(evt) => this.signup(evt)}>
                    <div className="txt_field">
                        <input type="text" name="username" value={this.state.username} onChange={(evt) => this.updateInput(evt, "username")} required />
                        <span></span>
                        <label>Username</label>
                    </div>
                    <div className="txt_field">
                        <input type="email" name="email" value={this.state.email} onChange={(evt) => this.updateInput(evt, "email")} required />
                        <span></span>
                        <label>Email</label>
                    </div>
                    <div className="txt_field">
                        <input type="password" pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                            title="Must contain at least one number and one uppercase and lowercase letter, and at least 8 or more characters"
                            name="password" value={this.state.password} onChange={(evt) => this.updateInput(evt, "password")} required />
                        <span></span>
                        <label>Password</label>
                    </div>
                    <input type="submit" value="Signup" />
                    <div className="signup_link">
                        Already member? <Link to="/login">Login</Link>
                    </div>
                </form>
            </div>
        );
    }
}