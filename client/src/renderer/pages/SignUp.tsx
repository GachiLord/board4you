import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import React, { useContext, useState } from 'react';
import { Container } from 'react-bootstrap';
import { doRequest } from '../lib/twiks';
import { useNavigate } from 'react-router';
import { LocaleContext } from '../base/constants/LocaleContext';


export interface User {
  login: string,
  nickName: string,
  firstName: string,
  secondName: string,
  password: string
}

interface Props {
  target?: 'details' | 'password'
  onSubmit?: (user: User) => void
  submitText?: string
  preFill?: User
}

function SignUp({ target, onSubmit, submitText, preFill }: Props) {
  // localization
  const loc = useContext(LocaleContext)
  // auth info
  const [login, setLogin] = useState(preFill?.login ?? "")
  const [publicLogin, setPublicLogin] = useState(preFill?.nickName ?? "")
  const [firstName, setFirstName] = useState(preFill?.firstName ?? "")
  const [secondName, setSecondName] = useState(preFill?.secondName ?? "")
  const [password, setPassword] = useState("")
  // validation
  const [isLoginInvalid, setIsLoginInvalid] = useState(false)
  const [isPublicLoginInvalid, setIsPublicLoginInvalid] = useState(false)
  const [isPasswordInvalid, setIsPasswordIvalid] = useState(false)
  // login validation msg
  const getLoginValidMsg = (type: 'Login' | 'Nickname', reason: 'length' | 'exist') => {
    const typeName = type === 'Login' ? loc.login : loc.nickName
    if (reason === 'length') return `${typeName} ${loc.mustBeBetween8and36}`
    else return `${typeName} ${loc.alreadyExist}`
  }
  const [loginMsg, setLoginMsg] = useState(getLoginValidMsg('Login', 'length'))
  const [publicLoginMsg, setPublicLoginMsg] = useState(getLoginValidMsg('Nickname', 'length'))
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
    if (onSubmit) {
      onSubmit({ login, nickName: publicLogin, firstName, secondName, password })
      return
    }
    if (!validate()) return
    doRequest('user', req, 'POST')
      .then(() => {
        if (validate()) navigate('/signin')
      })
      .catch(() => {
        setLoginMsg(getLoginValidMsg('Login', 'exist'))
        setIsLoginInvalid(true),
          setIsPublicLoginInvalid(true)
      })
  }
  const validate = (target?: 'login' | 'nickname' | 'password') => {
    let result = true
    if ((login.length < 8 || login.length > 36) && (!target || target === 'login')) {
      setLoginMsg(getLoginValidMsg('Login', 'length'))
      setIsLoginInvalid(true)
      result = false
    }
    else if (!target || target === 'login') setIsLoginInvalid(false)

    if ((publicLogin.length < 8 || publicLogin.length > 36) && (!target || target === 'nickname')) {
      setPublicLoginMsg(getLoginValidMsg('Nickname', 'length'))
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
    <Container className={`d-flex justify-content-center align-items-center ${target ? '' : 'mt-5'}`} >
      <Form noValidate onSubmit={(e) => handleSubmit(e)}>
        {(!target || target === 'details') && (
          <>
            <Form.Group className="mb-3 position-relative">
              <Form.Label>{loc.login}</Form.Label>
              <Form.Control
                isInvalid={isLoginInvalid}
                type="text" placeholder={loc.itWillBeUsedToSignIn}
                required
                defaultValue={preFill?.login}
                autoComplete='none'
                onChange={(e) => setLogin(e.target.value)}
                onBlur={() => validate('login')}
              />
              <Form.Control.Feedback tooltip type="invalid">
                {loginMsg}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3 position-relative">
              <Form.Label>{loc.nickName}</Form.Label>
              <Form.Control
                isInvalid={isPublicLoginInvalid}
                type="text"
                placeholder={loc.itWillBeShownInProfile}
                required
                defaultValue={preFill?.nickName}
                onChange={(e) => setPublicLogin(e.target.value)}
                onBlur={() => validate('nickname')}
              />
              <Form.Control.Feedback tooltip type="invalid">
                {publicLoginMsg}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{loc.firstName}</Form.Label>
              <Form.Control type="text" defaultValue={preFill?.firstName} placeholder='Optional' onChange={(e) => setFirstName(e.target.value)} />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{loc.secondName}</Form.Label>
              <Form.Control type="text" defaultValue={preFill?.secondName} placeholder='Optional' onChange={(e) => setSecondName(e.target.value)} />
            </Form.Group>
          </>
        )}
        {(!target || target === 'password') && (
          <Form.Group className="mb-3 position-relative">
            <Form.Label>{loc.password}</Form.Label>
            <Form.Control
              isInvalid={isPasswordInvalid}
              type="password"
              placeholder='Password'
              autoComplete='new-password'
              required
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => validate('password')}
            />
            <Form.Control.Feedback type="invalid" tooltip>
              {loc.password} {loc.mustBeBetween8and36}
            </Form.Control.Feedback>
          </Form.Group>

        )}
        <Button variant="primary" type="submit">
          {submitText ?? loc.submit}
        </Button>
      </Form>
    </Container >
  );
}

export default SignUp;
