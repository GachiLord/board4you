import React from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { LinkContainer } from 'react-router-bootstrap'
import Logo from '../../../../build/icon.png'
import boardEvents from "../constants/boardEvents";

export default function Header(){
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
                    <Nav className="me-auto w-75 justify-content-end">
                        <LinkContainer to="/">
                            <Nav.Link>Home</Nav.Link>
                        </LinkContainer>
                        <LinkContainer onClick={() => boardEvents.emit('editorLinkClicked')} to="/edit">
                            <Nav.Link>Create board</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="signin">
                            <Nav.Link>Sign in</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="signup">
                            <Nav.Link>Sign up</Nav.Link>
                        </LinkContainer>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
      );
}