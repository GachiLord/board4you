export interface localization{
    [key: string]: string|string[]
    //common
    loading: string,
    // header
    home: string,
    createBoard: string,
    signIn: string,
    signUp: string,
    // board share mode
    noSuchRoom: string,
    boardIsLoading: string,
    roomDeletedOrDoesNotExist: string,
    createNew: string,        
    // exit alert
    exitAlertMsg: string,
    exitAlertOptions: string[],
    // file menu
    fileMenuLabel: string,
    create: string,
    open: string,
    save: string,
    saveAs: string,
    close: string,
    // file open menu
    savePdfOrZip: string,
    // canvas size menu
    selectSizeOfCanvas: string,
    selectSize: string,
    width: string,
    height: string,
    // edit menu
    editMenuLabel: string,
    undo: string,
    redo: string,
    cut: string,
    copy: string,
    paste: string,
    del: string
    viewMenuLabel: string,
    reload: string,
    forceReload: string,
    devTools: string,
    resetZoom: string,
    zoomIn: string,
    zoomOut: string,
    fullscreen: string,
    // help menu
    help: string,
    learnMore: string,
    // cusomizer`s popup
    solid: string,
    dashed: string,
    size: string,
    // tools popovers
    move: string,
    select: string,
    pen: string,
    line:string,
    arrow: string,
    rect: string,
    ellipse: string,
    eraser: string,
}

export interface localizationConfig{
    [key: string]: localization
} 

const loc: localizationConfig = {
    en: {
        //common
        loading: 'Loading',
        // header
        home: 'Home',
        createBoard: 'Create board',
        signIn: 'Sign in',
        signUp: 'Sign up',
        // board share mode
        noSuchRoom: 'There is no sush room',
        boardIsLoading: 'Your board is loading',
        roomDeletedOrDoesNotExist: 'Room is deleted or does not exit',
        createNew: 'Create new',        
        // exit alert
        exitAlertMsg: 'Continue editing or close the file without saving?',
        exitAlertOptions: ['Continue', 'Do not save'],
        // file menu
        fileMenuLabel: 'File',
        create: 'Create',
        open: 'Open',
        save: 'Save',
        saveAs: 'Save As',
        close: 'Close',
        // file open menu
        savePdfOrZip: 'save pdf or zip',
        // canvas size menu
        selectSizeOfCanvas: 'Select size of the canvas',
        selectSize: 'Select size',
        width: 'Width',
        height: 'Height',
        // edit menu
        editMenuLabel: 'Edit',
        undo: 'Undo',
        redo: 'Redo',
        cut: 'Cut',
        copy: 'Copy',
        paste: 'Paste',
        del: 'Delete',
        // view menu
        viewMenuLabel: 'View',
        reload: 'Reload',
        forceReload: 'Force reload',
        devTools: 'DevTools',
        resetZoom: 'reset zoom',
        zoomIn: 'zoom in',
        zoomOut: 'zoom out',
        fullscreen: 'fullscreen',
        // help menu
        help: 'help',
        learnMore: 'Learn more',
        // cusomizer`s popup
        solid: 'solid',
        dashed: 'dashed',
        size: 'Size',
        // tools popovers
        move: 'move',
        select: 'select',
        pen: 'pen',
        line: 'line',
        arrow: 'arrow',
        rect: 'rect',
        ellipse: 'ellipse',
        eraser: 'eraser',
    },
    ru: {
        //common
        loading: 'Загрузка',
        // header
        home: 'Домашняя страница',
        createBoard: 'Создать доску',
        signIn: 'Войти',
        signUp: 'Регистрация',
        // board share mode
        noSuchRoom: 'Такой комнаты не существует',
        boardIsLoading: 'Ваша доска загружается',
        roomDeletedOrDoesNotExist: 'Комната удалена или не существует',
        createNew: 'Создать новую',        
        // exit alert
        exitAlertMsg: 'Продолжить редактирование или закрыть файл без сохранения?',
        exitAlertOptions: ['Продолжить', 'Не сохранять'],
        // file menu
        fileMenuLabel: 'Файл',
        create: 'Создать',
        open: 'Открыть',
        save: 'Сохранить',
        saveAs: 'Сохранить как',
        close: 'Закрыть',
        // file open menu
        savePdfOrZip: 'Сохранить pdf или zip',
        // canvas size menu
        selectSizeOfCanvas: 'Выберите размер холста',
        select: 'Выбрать',
        selectSize: 'Выбрать размер',
        width: 'Ширина',
        height: 'Длина',
        // edit menu
        editMenuLabel: 'Правка',
        undo: 'Отменить',
        redo: 'Повторить',
        cut: 'Вырезать',
        copy: 'Скопировать',
        paste: 'Вставить',
        del: 'Удалить',
        // view menu
        viewMenuLabel: 'Вид',
        reload: 'Перезагрузить',
        forceReload: 'Принудительно перезагрузить',
        devTools: 'Инструменты разработчика',
        resetZoom: 'Стандартный размер',
        zoomIn: 'Приблизить',
        zoomOut: 'Отдалить',
        fullscreen: 'Полноэкранный режим',
        // help menu
        help: 'Помощь',
        learnMore: 'Узнать больше',
         // cusomizer`s popup
        line: 'Линия',
        solid: 'сплошная',
        dashed: 'прерывистая',
        size: 'Размер',
        // tools popovers
        move: 'Перемещать',
        pen: 'Карандаш',
        arrow: 'Стрелка',
        rect: 'Прямоугольник',
        ellipse: 'Круг',
        eraser: 'Ластик',
    }
}


export default loc