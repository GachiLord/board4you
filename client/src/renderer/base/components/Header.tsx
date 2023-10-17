import React, { useContext } from "react";
import { Container, Nav, Navbar } from "react-bootstrap";
import { LinkContainer } from 'react-router-bootstrap'
import Logo from '../../../../build/icon.png'
import boardEvents from "../constants/boardEvents";
import { LocaleContext } from "../constants/LocaleContext";

export default function Header(){
    const loc = useContext(LocaleContext)

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
                        <LinkContainer onClick={() => boardEvents.emit('editorLinkClicked')} to="/edit">
                            <Nav.Link>{loc.createBoard}</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="signin">
                            <Nav.Link>{loc.signIn}</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="signup">
                            <Nav.Link>{loc.signUp}</Nav.Link>
                        </LinkContainer>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
      );
}