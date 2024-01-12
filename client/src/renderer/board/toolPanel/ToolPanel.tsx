import React, { useEffect } from "react";
import ToolButton from "./ToolButton";
import { BsArrowRight, BsArrowsMove, BsPen, BsEraser, BsCursor } from 'react-icons/bs'
import { AiOutlineLine } from 'react-icons/ai'
import { IoSquareOutline } from 'react-icons/io5'
import { RxCircle } from 'react-icons/rx'
import Persister from "../../lib/Persister";
import store, { RootState } from "../../store/store";
import ShareBar from "../ShareBar";
import Settings from "../settings/Settings";
import Hr from "../../base/components/Hr";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import { set } from "../../features/tool";
import { useSelector } from "react-redux";


export default function ToolPanel() {
  const rooms = useSelector((state: RootState) => state.rooms)
  const { roomId } = useParams()
  const privateId = rooms[roomId]
  const isAuthor = Boolean(privateId)
  const isCoopEditor = privateId?.includes("_co_editor")
  const dispatch = useDispatch()

  useEffect(() => {
    new Persister(store, 'toolSettings')
  }, [])

  useEffect(() => {
    if (!isAuthor) dispatch(set('move'))
  })

  return (
    <div className="d-flex align-items-center flex-column" style={{ "overflow": "auto" }}>
      <ToolButton name="move">
        <BsArrowsMove />
      </ToolButton>
      {
        isAuthor && (
          <>
            <ToolButton name="select">
              <BsCursor />
            </ToolButton>
            <ToolButton name="pen" customizable>
              <BsPen />
            </ToolButton>
            <ToolButton name="line" customizable>
              <AiOutlineLine />
            </ToolButton>
            <ToolButton name="arrow" customizable>
              <BsArrowRight />
            </ToolButton>
            <ToolButton name="rect" customizable>
              <IoSquareOutline />
            </ToolButton>
            <ToolButton name="ellipse" customizable>
              <RxCircle />
            </ToolButton>
            <ToolButton
              name="eraser"
              customizable
              hideColorPicker
              hideLineTypePicker
            >
              <BsEraser />
            </ToolButton>
          </>
        )
      }
      {isAuthor && <Hr />}
      {(isAuthor && !isCoopEditor) && <ShareBar />}
      {isAuthor && <Settings />}

    </div>
  )
}
