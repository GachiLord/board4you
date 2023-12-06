import store from "../store/store";
import { AuthState, addUser, deleteUser } from "../features/user";
import { doRequest } from "./twiks";


export async function updateAuth(){
    try{
        const user = await doRequest('user/private', undefined, 'POST')
        store.dispatch(addUser({
            login: user.login,
            nickName: user.public_login,
            firstName: user.first_name,
            secondName: user.secondName
        }))
        const res: AuthState = { authed: true, user: user }
        return res
    }
    catch{
        logOut()
        const res: AuthState = { authed: false }
        return res
    }
}

export async function logOut(){
    store.dispatch(deleteUser())
    doRequest('auth/logout', undefined, 'POST')
}