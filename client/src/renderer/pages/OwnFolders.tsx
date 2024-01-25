import { keepPreviousData, useQuery } from "@tanstack/react-query";
import React, { useContext, useState } from "react";
import { doRequest } from "../lib/twiks";
import Loading from '../base/components/Loading';
import Alert from "../base/components/Alert";
import { Button, Form, ListGroup } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { Folder, FolderShortInfo } from "../board/folder/Folder";
import { LocaleContext } from "../base/constants/LocaleContext";
import usePage from "../lib/usePage";
import { Paginated, PaginatedDefault } from "../base/typing/Pagination";
import List from "../base/components/List";



interface FolderInitials {
  title: string
}

export default function OwnFolders() {
  const navigate = useNavigate()
  const page = usePage()
  const loc = useContext(LocaleContext)
  const [isLoading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [pagination, setPagination] = useState<Paginated<FolderShortInfo>>(PaginatedDefault)
  const { isPending, isError } = useQuery({
    queryKey: ['folders', 'own', page],
    queryFn: async () => {
      const list: Paginated<FolderShortInfo> = await doRequest(`folders/own/${page}`, undefined, 'GET')
      setPagination(list)
      return list
    },
    placeholderData: keepPreviousData,
  })

  if (isPending || isLoading) return <Loading title='Loading your boards' />
  if (isError) return (
    <Alert title="Log in to view your folders">
      <Link to='/'><Button>{loc.home}</Button></Link>
    </Alert>
  )
  const onRemove = (folder: FolderShortInfo) => {
    setLoading(true)
    setPagination(value => {
      return { ...value, content: value.content.filter(f => f.id !== folder.id) }
    })
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
        setPagination(value => {
          return { ...value, content: value.content.concat([newFolder]) }
        })
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
        <Form.Control type="text" placeholder={loc.title} value={title} onChange={(e) => onTitleChange(e.target.value)} />
        <Button className="ms-1" onClick={onCreate}>{loc.create}</Button>
      </Form.Group>
      <h4>{loc.yourFolders}</h4>

      <List
        pagination={{
          contents: pagination.content,
          currentPage: page,
          maxPage: pagination.max_page,
          onPrev: () => navigate(`/folders/own/${page - 1}`),
          onNext: () => navigate(`/folders/own/${page + 1}`),
          onIndex: (index) => navigate(`/folders/own/${index}`)
        }}
      >
        <ListGroup className="m-3">
          {
            pagination.content.map(folder => Folder({ loc, folder, onRemove }))
          }
        </ListGroup>
      </List>
    </div>
  )
}


