import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import React, { useState } from 'react';
import { Container } from 'react-bootstrap';
import { doRequest } from '../lib/twiks';
import { useNavigate } from 'react-router';

function SignIn() {
    // auth info
    const [login, setLogin] = useState("")
    const [publicLogin, setPublicLogin] = useState("")
    const [firstName, setFirstName] = useState("")
    const [secondName, setSecondName] = useState("")
    const [password, setPassword] = useState("")
    // validation
    const [isLoginInvalid, setIsLoginInvalid] = useState(false)
    const [isPublicLoginInvalid, setIsPublicLoginInvalid] = useState(false)
    const [isPasswordInvalid, setIsPasswordIvalid] = useState(false)
    // login validation msg
    const getLoginValidMsg = (type: 'Login'|'Nickname', reason: 'length'|'exist') => {
        if (reason === 'length') return `${type} must be between 8 and 36 characters long`
        else return `${type} already exists`
    }
    const [loginMsg, setLoginMsg] = useState(getLoginValidMsg('Login', 'length'))
    // nav
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const req = {
            login,
            public_login: publicLogin,
            first_name: firstName,
            second_name: secondName,
            password
        }
        if (!validate()) return 
        doRequest('user', req, 'POST')
            .then( () => {
                if (validate()) navigate('/signin')
            } )
            .catch( () => {
                setLoginMsg(getLoginValidMsg('Login', 'exist'))
                setIsLoginInvalid(true),
                setIsPublicLoginInvalid(true)
            } )
    }
    const validate = (target?: 'login'|'nickname'|'password') => {
        let result = true
        if ((login.length < 8 || login.length > 36) && (!target || target === 'login')) {
            setLoginMsg(getLoginValidMsg('Login', 'length'))
            setIsLoginInvalid(true)
            result = false
        }
        else if (!target || target === 'login') setIsLoginInvalid(false)

        if ((publicLogin.length < 8 || publicLogin.length > 36) && (!target || target === 'nickname')){
            setLoginMsg(getLoginValidMsg('Nickname', 'length'))
            setIsPublicLoginInvalid(true)
            result = false
        } 
        else if (!target || target === 'nickname') setIsPublicLoginInvalid(false)

        if ((password.length < 8 || password.length > 36) && (!target || target === 'password')) {
            setIsPasswordIvalid(true)
            result = false
        }
        else if (!target || target === 'password') setIsPasswordIvalid(false)
        
        return result
    }

    return (
        <Container className='d-flex justify-content-center align-items-center mt-5'>
            <Form noValidate onSubmit={(e) => handleSubmit(e)}>
                <Form.Group className="mb-3">
                    <Form.Label>Login</Form.Label>
                    <Form.Control 
                        isInvalid={isLoginInvalid} 
                        type="text" placeholder='It will be used to sign in' 
                        required 
                        onChange={(e) => setLogin(e.target.value)}
                        onBlur={() => validate('login')}
                    />
                    <Form.Control.Feedback type="invalid">
                        {loginMsg}
                    </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Nickname</Form.Label>
                    <Form.Control 
                        isInvalid={isPublicLoginInvalid} 
                        type="text" 
                        placeholder='It will be shown in your profile' 
                        required 
                        onChange={(e) => setPublicLogin(e.target.value)} 
                        onBlur={() => validate('nickname')}
                    />
                    <Form.Control.Feedback type="invalid">
                        {loginMsg}
                    </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>First name</Form.Label>
                    <Form.Control type="text" placeholder='Optional' onChange={(e) => setFirstName(e.target.value)} />
                </Form.Group>
                
                <Form.Group className="mb-3">
                    <Form.Label>Second name</Form.Label>
                    <Form.Control type="text" placeholder='Optional' onChange={(e) => setSecondName(e.target.value)} />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formBasicPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control 
                        isInvalid={isPasswordInvalid} 
                        type="password" 
                        placeholder='Your password' 
                        required 
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => validate('password')}
                    />
                    <Form.Control.Feedback type="invalid">
                        Password must be between 8 and 36 characters long
                    </Form.Control.Feedback>
                </Form.Group>
                <Button variant="primary" type="submit">
                    Submit
                </Button>
            </Form>
        </Container>
    );
}

export default SignIn;