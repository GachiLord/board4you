import { useQuery } from "@tanstack/react-query";
import React, { useContext, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { doRequest } from "../lib/twiks";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import Loading from "../base/components/Loading";
import { Button, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import Alert from "../base/components/Alert";
import SignUp from "./SignUp";
import { User, addUser } from "../features/user";
import { logOut } from "../lib/auth";
import { LocaleContext } from "../base/constants/LocaleContext";


interface UpdateData {
  user: object,
  login: string,
  password: string
}

function convertToSnakeCase(user: any) {
  return {
    public_login: user.nickName,
    first_name: user.firstName,
    second_name: user.secondName,
    login: user.login,
    password: user.password
  }
}

export default function Profile() {
  const { nickName } = useParams()
  const loc = useContext(LocaleContext)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.user)
  const [password, setPassword] = useState("")
  const [invalid, setInvalid] = useState(false)
  const [isLoading, setLoading] = useState(false)
  const { data, isPending, isError } = useQuery({
    queryKey: ['user', nickName],
    queryFn: async () => {
      if (user.authed && user.user.nickName === nickName) return user.user
      const userInfo = await doRequest(`user/${nickName}`, undefined, 'GET')
      return {
        nickName: userInfo.public_login,
        firstName: userInfo.first_name,
        secondName: userInfo.second_name
      }
    }
  })
  // handle loading and error
  if (isPending || isLoading) return <Loading title="Loading user" />
  if (isError) return <Alert title="No such user"><Link to="/"><Button>Home</Button></Link></Alert>
  // render
  if (!user.authed || (user.authed && user.user.nickName !== nickName)) return (
    <div className="d-flex flex-column justify-content-center align-items-center mt-5">
      <h4>{loc.nickName}: {data.nickName}</h4>
      <h4>{loc.firstName}: {data.firstName}</h4>
      <h4>{loc.secondName}: {data.secondName}</h4>
    </div>
  )
  // handlers
  const handleDataUpdate = (userData: User) => {
    setLoading(true)
    const updateData: UpdateData = {
      user: {
        ...convertToSnakeCase(userData),
        password
      },
      password,
      login: user.user.login
    }
    doRequest('user', updateData, 'PUT')
      .then(() => {
        setInvalid(false)
        dispatch(addUser(userData))
        navigate(`/profile/${userData.nickName}`)
      })
      .catch(() => setInvalid(true))
      .finally(() => {
        setLoading(false)
        setPassword("")
      })
  }
  const handlePasswordUpadate = (userData: User) => {
    setLoading(true)
    const updateData: UpdateData = {
      user: {
        ...convertToSnakeCase(userData)
      },
      password,
      login: user.user.login
    }
    doRequest('user', updateData, 'PUT')
      .then(() => setInvalid(false))
      .catch(() => setInvalid(true))
      .finally(() => {
        setLoading(false)
        setPassword("")
      })
  }
  const handleDelete = () => {
    setLoading(true)
    doRequest('user', { password }, 'DELETE')
      .then(() => {
        logOut(true)
        navigate('/')
      })
      .catch(() => setInvalid(true))
      .finally(() => {
        setLoading(false)
        setPassword("")
      })
  }

  return (
    <div className="d-flex flex-column justify-content-center align-items-center mt-5">
      <h4>{loc.editingProfile}</h4>
      <Form.Group className="mb-3" controlId="formBasicPassword">
        <Form.Control
          type="password"
          isInvalid={invalid}
          placeholder='Your password'
          autoComplete='new-password'
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        <Form.Text>{loc.actionRequiresPassword}</Form.Text>
      </Form.Group>
      <h4>{loc.changeUserData}</h4>
      <SignUp
        target="details"
        onSubmit={handleDataUpdate}
        submitText={loc.save}
        preFill={{ ...user.user, password: "" }}
      />
      <h4 className="mt-4">{loc.changeUserPassword}</h4>
      <SignUp
        target="password"
        onSubmit={handlePasswordUpadate}
        submitText={loc.save}
        preFill={{ ...user.user, password: "" }}
      />
      <h4 className="mt-4">{loc.deleteProfile}</h4>
      <div className="d-flex justify-content-center p-3 flex-column">
        <p>{loc.yourBoardsAndFoldersWontBeDeleted}</p>
        <Button
          variant="danger"
          className="w-50"
          onClick={handleDelete}
        >{loc.del}</Button>
      </div>
    </div>
  )
}
