import React from "react";
import { Button, ListGroup } from "react-bootstrap";
import { Link } from "react-router-dom";


export interface FolderShortInfo {
  id: number,
  public_id: string,
  title: string
}

interface FolderProps {
  folder: FolderShortInfo;
  onRemove?: (folder: FolderShortInfo) => void;
}
export function Folder({ folder, onRemove }: FolderProps) {
  return (
    <ListGroup.Item key={folder.id} className="d-flex justify-content-between">
      <div className="d-inline">
        {folder.title === "" ? "Untitled" : folder.title}
      </div>
      <div className="d-inline">
        <Link className="ms-5" key={folder.id} to={`/folder/${folder.public_id}`}>
          <Button size="sm" variant="primary">Open</Button>
        </Link>
        {onRemove && <Button size="sm" className="ms-1" variant="secondary" onClick={() => onRemove(folder)}>Remove</Button>}
      </div>
    </ListGroup.Item>
  );
}

