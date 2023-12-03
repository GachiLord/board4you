import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import React, { useState } from 'react';
import { Container } from 'react-bootstrap';
import { doRequest } from '../lib/twiks';
import { useNavigate } from 'react-router';

function SignIn() {
    const [login, setLogin] = useState("")
    const [password, setPassword] = useState("")
    const [isInvalid, setIsInvalid] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        doRequest('auth/login', { login, password }, 'POST')
            .then( () => {
                navigate('/')
            } )
            .catch( () => {
                setIsInvalid(true)
            } )
    }

    return (
        <Container className='d-flex justify-content-center align-items-center mt-5'>
            <Form onSubmit={(e) => handleSubmit(e)}>
                <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>Login</Form.Label>
                    <Form.Control isInvalid={isInvalid} type="text" placeholder='Your login' required onChange={(e) => setLogin(e.target.value)} />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formBasicPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control isInvalid={isInvalid} type="password" placeholder='Your password' required onChange={(e) => setPassword(e.target.value)}/>
                </Form.Group>
                <Button variant="primary" type="submit">
                    Submit
                </Button>
            </Form>
        </Container>
    );
}

export default SignIn;