import React, { useContext, useEffect, useState } from "react";
import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { LinkContainer } from 'react-router-bootstrap'
import Logo from '../../../../build/icon.png'
import { LocaleContext } from "../constants/LocaleContext";
import { logOut, updateAuth } from "../../lib/auth";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { useNavigate } from "react-router";

export default function Header() {
  const navigate = useNavigate()
  const loc = useContext(LocaleContext)
  const userData = useSelector((state: RootState) => state.user)
  const [isPending, setIsPending] = useState(true)
  // update user info on app launch
  useEffect(() => {
    updateAuth().finally(() => setIsPending(false))
  }, [])
  // handle auth state
  let authBar
  if (isPending) authBar = (
    <div className="spinner-grow" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  )
  else {
    if (userData.authed) authBar = (
      <>
        <LinkContainer to="boards/own">
          <Nav.Link>{loc.myBoards}</Nav.Link>
        </LinkContainer >
        <LinkContainer to="folders/own">
          <Nav.Link>{loc.myFolders}</Nav.Link>
        </LinkContainer>
        <LinkContainer to={`profile/${userData.user.nickName}`}>
          <Nav.Link>{loc.profile}</Nav.Link>
        </LinkContainer>
        <Button variant="secondary" size="sm" onClick={() => { logOut(); navigate('/') }}>{loc.signOut}</Button>
      </>)
    else authBar = (<>
      <LinkContainer to="signin">
        <Nav.Link>{loc.signIn}</Nav.Link>
      </LinkContainer>
      <LinkContainer to="signup">
        <Nav.Link>{loc.signUp}</Nav.Link>
      </LinkContainer>
    </>)
  }

  return (
    <Navbar collapseOnSelect expand="lg">
      <Container>
        <Navbar.Brand className="align-items-center">
          <img
            alt=""
            src={Logo}
            width="30"
            height="30"
            className="d-inline-block align-top"
          />
          {' '}
          Board4you
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto w-100 justify-content-end">
            <LinkContainer to="/">
              <Nav.Link>{loc.home}</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/board">
              <Nav.Link>{loc.createBoard}</Nav.Link>
            </LinkContainer>
            {authBar}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
