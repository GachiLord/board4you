import { Store } from "@reduxjs/toolkit"

export default class Persister{

    constructor(store: Store, reducerName: string){
        store.subscribe(() => {
            localStorage.setItem(reducerName, JSON.stringify(store.getState()[reducerName]))
        })
    }

    static load(reducerName: string, defaultState: object){
        try{
            const state = JSON.parse(localStorage.getItem(reducerName))

            return state ? state: defaultState
        }
        catch{
            return defaultState
        }
    }
}