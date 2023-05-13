export default function(){
    this.setState( state => {
        return {
            temporaryShapes: {
                ...state.temporaryShapes,
                selectRect: undefined
            },
            selection: []
        }
    } )
}