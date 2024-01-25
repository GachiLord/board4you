import React from "react";
import { Button, ListGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { localization } from "../../../common/localization";


export interface FolderShortInfo {
  id: number,
  public_id: string,
  title: string
}

interface FolderProps {
  loc: localization,
  folder: FolderShortInfo
  onRemove?: (folder: FolderShortInfo) => void
}
export function Folder({ loc, folder, onRemove }: FolderProps) {
  return (
    <ListGroup.Item key={folder.id} className="d-flex justify-content-between">
      <div className="d-inline">
        {folder.title === "" ? loc.untitled : folder.title}
      </div>
      <div className="d-inline">
        <Link className="ms-5" key={folder.public_id} to={`/folder/${folder.public_id}`}>
          <Button size="sm" variant="primary">{loc.open}</Button>
        </Link>
        {onRemove && <Button size="sm" className="ms-1" variant="secondary" onClick={() => onRemove(folder)}>{loc.del}</Button>}
      </div>
    </ListGroup.Item>
  );
}

