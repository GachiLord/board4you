import React, { useContext } from "react";
import screenshot from '../../../build/board4you_home.png'
import { LocaleContext } from "../base/constants/LocaleContext";

export default function Home() {
  const loc = useContext(LocaleContext)
  return (
    <div className="mt-5 text-center">
      <img src={screenshot} className="w-75" />
      <p className="fs-2 w-75 m-auto">
        {loc.appDiscription}&nbsp;
        <a className="text-decoration-none" href="https://github.com/GachiLord/board4you">{loc.repositoryOnGithub}</a>.
      </p>
    </div>
  )
}
