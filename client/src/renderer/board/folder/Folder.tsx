import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import React, { useState } from 'react';
import { Link } from "react-router-dom";


interface props {
  id: number,
  public_id: string,
  title: string,
  is_owned: boolean
}

export default function Folder({ public_id, title, is_owned }: props) {
  const [isDeleted, setDeleted] = useState(false)

  if (isDeleted) return (<></>)
  return (
    <Card>
      <Card.Header>{title}</Card.Header>
      <Card.Body>
        <Link to={`folder/${public_id}`}><Button variant='primary'>Open</Button></Link>
        {is_owned && <Button variant='secondary' onClick={() => setDeleted(true)}>Delete</Button>}
      </Card.Body>
    </Card>
  )
}
