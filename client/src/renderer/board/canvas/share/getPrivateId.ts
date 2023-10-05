import store from "../../../store/store";

export default function getPrivateId(public_id: string): string|undefined{
    return store.getState().rooms[public_id]
}