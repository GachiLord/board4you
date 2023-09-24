import ReconnectingWebSocket from 'reconnecting-websocket';


interface IHandlers{
    onMessage?: (msg: any) => void,
    onError?: () => void,
    onClose?: () => void,
    onOpen?: () => void
}

interface BoardOptions{
    url?: string,
    handlers: IHandlers
}

export default class BoardManager{
    url: string
    rws: ReconnectingWebSocket
    handlers: IHandlers

    constructor(options: BoardOptions){
        this.url = options.url ?? `ws://${location.host}/board`
        this.handlers = options.handlers
    }

    connect(){
        this.rws = new ReconnectingWebSocket(this.url, [], {
            connectionTimeout: 1000,
            maxRetries: 10,
        });

        this.rws.addEventListener('message', (e) => {
            this.handlers.onMessage(JSON.parse(e.data))
        })
    }
    
    joinRoom(roomId: string){
        if (this.rws.OPEN !== 1) throw new Error('cannot join room without a connection to the socket')
    }
    
    send(data: string){
        this.rws.send(data)
    }

}