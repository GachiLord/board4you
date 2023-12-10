import store from "../store/store";
import { AuthState, addUser, deleteUser } from "../features/user";
import { doRequest } from "./twiks";
import { emptyRooms, setRoom } from "../features/rooms";


export async function updateAuth(){
    try{
        const user = await doRequest('user/private', undefined, 'POST')
        store.dispatch(addUser({
            login: user.login,
            nickName: user.public_login,
            firstName: user.first_name,
            secondName: user.secondName
        }))
        // get private ids
        const ids = await doRequest('room/private', undefined, 'GET')
        ids.forEach( (id: { public_id: string, private_id: string }) => { 
            store.dispatch(setRoom({ publicId: id.public_id, privateId: id.private_id }))
         } )
        // return auth obj
        const res: AuthState = { authed: true, user: user }
        return res
    }
    catch{
        logOut(false)
        const res: AuthState = { authed: false }
        return res
    }
}

export async function logOut(flushRoomInfo = true){
    store.dispatch(deleteUser())
    doRequest('auth/logout', undefined, 'POST')
    if (flushRoomInfo) store.dispatch(emptyRooms())
}