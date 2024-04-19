import store from "../store/store";
import { AuthState, addUser, deleteUser } from "../features/user";
import { emptyRooms, setRoom } from "../features/rooms";
import { request } from "./request";


export async function updateAuth() {
  try {
    const user = await request('user/private').post().body()
    store.dispatch(addUser({
      login: user.login,
      nickName: user.public_login,
      firstName: user.first_name,
      secondName: user.second_name
    }))
    // get private ids
    const ids = await request('room/private').body()
    ids.forEach((id: { public_id: string, private_id: string }) => {
      store.dispatch(setRoom({ publicId: id.public_id, privateId: id.private_id }))
    })
    // return auth obj
    const res: AuthState = { authed: true, user: user }
    return res
  }
  catch {
    //TODO: logOut(false)
    const res: AuthState = { authed: false }
    return res
  }
}

export async function logOut(flushRoomInfo = true) {
  store.dispatch(deleteUser())
  request('auth/logout').post().body()
  if (flushRoomInfo) store.dispatch(emptyRooms())
}
