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
import { useSelector } from "react-redux";
import { itemIn } from "../../lib/twiks";


export default function ToolPanel() {
  const mode = useSelector((state: RootState) => state.board.mode)

  useEffect(() => {
    new Persister(store, 'toolSettings')
  }, [])

  return (
    <div className="d-flex align-items-center flex-column" style={{ "overflow": "auto" }}>
      <ToolButton name="move">
        <BsArrowsMove />
      </ToolButton>
      {
        (itemIn(mode, 'local', 'coop', 'author')) && (
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
      {(itemIn(mode, 'local', 'coop', 'author')) && <Hr />}
      {(itemIn(mode, 'local', 'author')) && <ShareBar />}
      {(itemIn(mode, 'local', 'coop', 'author')) && <Settings />}

    </div>
  )
}
