import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import React, { useContext, useState } from 'react';
import { Container } from 'react-bootstrap';
import { useNavigate } from 'react-router';
import { updateAuth } from '../lib/auth';
import { LocaleContext } from '../base/constants/LocaleContext';
import { request } from '../lib/request';

function SignIn() {
  const loc = useContext(LocaleContext)
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [isInvalid, setIsInvalid] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    request('auth/login').post().body({ login, password })
      .then(() => {
        updateAuth()
        navigate('/')
      })
      .catch(() => {
        setIsInvalid(true)
      })
  }

  return (
    <Container className='d-flex justify-content-center align-items-center mt-5'>
      <Form onSubmit={(e) => handleSubmit(e)}>
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>{loc.login}</Form.Label>
          <Form.Control isInvalid={isInvalid} type="text" placeholder='Your login' required onChange={(e) => setLogin(e.target.value)} />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>{loc.password}</Form.Label>
          <Form.Control isInvalid={isInvalid} type="password" placeholder='Your password' required onChange={(e) => setPassword(e.target.value)} />
        </Form.Group>
        <Button variant="primary" type="submit">
          {loc.submit}
        </Button>
      </Form>
    </Container>
  );
}

export default SignIn;
