import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { doRequest } from "../lib/twiks";
import Loading from '../base/components/Loading';
import Alert from "../base/components/Alert";
import { Button, Form, ListGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { Folder, FolderShortInfo } from "../board/folder/Folder";



interface FolderInitials {
  title: string
}

export default function OwnFolders() {
  const [isLoading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [userFolders, setFolders] = useState<FolderShortInfo[]>([])
  const { isPending, isError } = useQuery({
    queryKey: ['folders', 'own'],
    queryFn: async () => {
      const list: FolderShortInfo[] = await doRequest('folders/own', undefined, 'GET')
      setFolders(list)
      return list
    }
  })

  if (isPending || isLoading) return <Loading title='Loading your boards' />
  if (isError) return (
    <Alert title="Log in to view your folders">
      <Link to='/'><Button>Home</Button></Link>
    </Alert>
  )
  const onRemove = (folder: FolderShortInfo) => {
    setLoading(true)
    setFolders(v => v.filter(f => f.id !== folder.id))
    doRequest(`folder/${folder.public_id}`, undefined, 'DELETE').finally(() => setLoading(false))
  }
  const onCreate = () => {
    const folderInitials: FolderInitials = {
      title
    }
    setLoading(true)
    doRequest('folder', folderInitials, 'POST')
      .then((res) => {
        const newFolder: FolderShortInfo = {
          title,
          id: -1,
          public_id: res.public_id
        }
        setFolders(v => v.concat([newFolder]))
        setTitle("")
      })
      .finally(() => setLoading(false))
  }
  const onTitleChange = (title: string) => {
    if (title.length <= 36) setTitle(title)
  }

  return (
    <div className="container d-flex flex-column justify-content-center align-items-center mt-5">
      <Form.Group className="mb-3 d-flex" controlId="formBasicEmail">
        <Form.Control type="text" placeholder="Title" value={title} onChange={(e) => onTitleChange(e.target.value)} />
        <Button className="ms-1" onClick={onCreate}>Create</Button>
      </Form.Group>
      <h4>Your folders</h4>

      <ListGroup className="m-3">
        {
          userFolders.map(folder => Folder({ folder, onRemove }))
        }
      </ListGroup>
    </div>
  )
}


