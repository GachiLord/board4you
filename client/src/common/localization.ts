export interface localization {
  [key: string]: string | string[]
  //common
  loading: string,
  changeScreenOrientation: string,
  appIsDesignedToWorkInLandScapeMode: string,
  untitled: string,
  title: string,
  // header
  home: string,
  createBoard: string,
  signIn: string,
  signUp: string,
  signOut: string,
  myBoards: string,
  myFolders: string,
  profile: string,
  // errors
  unexpectedError: string,
  tryToReloadThePage: string,
  fileIsLocked: string,
  signInToPerformThisAction: string,
  // board share mode
  noSuchRoom: string,
  boardIsLoading: string,
  roomDeletedOrDoesNotExist: string,
  createNew: string,
  // board
  yourBoards: string,
  settings: string,
  add: string,
  // fodler
  yourFolders: string,
  noBoardsYet: string,
  boardsToAdd: string,
  noSuchFolder: string,
  folderContents: string,
  yourBoardsAndFoldersWontBeDeleted: string,
  // auth
  login: string,
  nickName: string,
  firstName: string,
  secondName: string,
  password: string,
  optional: string,
  submit: string,
  itWillBeUsedToSignIn: string,
  itWillBeShownInProfile: string,
  mustBeBetween8and36: string,
  alreadyExist: string,
  // profile
  editingProfile: string,
  changeUserData: string,
  changeUserPassword: string,
  deleteProfile: string,
  actionRequiresPassword: string,
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
  line: string,
  arrow: string,
  rect: string,
  ellipse: string,
  eraser: string,
}

export interface localizationConfig {
  [key: string]: localization
}

const loc: localizationConfig = {
  en: {
    //common
    loading: 'Loading',
    changeScreenOrientation: 'Change screen orientation',
    appIsDesignedToWorkInLandScapeMode: 'Board4you is designed to work in landscape mode',
    untitled: 'Untitled',
    title: 'Title',
    // header
    home: 'Home',
    createBoard: 'Create board',
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    myBoards: 'My boards',
    myFolders: 'My folders',
    profile: 'Profile',
    // errors
    unexpectedError: "Unexpected error",
    tryToReloadThePage: "Try to reload the page",
    fileIsLocked: 'File is locked by another process',
    signInToPerformThisAction: 'Sign in to perform this action',
    // board share mode
    noSuchRoom: 'There is no sush room',
    boardIsLoading: 'Your board is loading',
    roomDeletedOrDoesNotExist: 'Room is deleted or does not exit',
    createNew: 'Create new',
    // board
    yourBoards: 'Your boards',
    settings: 'Settings',
    add: 'Add',
    // fodler
    yourFolders: 'Your folders',
    noBoardsYet: 'No boards yet',
    boardsToAdd: 'Boards to add',
    noSuchFolder: 'No such folder',
    folderContents: 'Folder contents',
    // auth
    login: 'Login',
    nickName: 'NickName',
    firstName: 'First name',
    secondName: 'Second name',
    optional: 'Optional',
    password: 'Password',
    submit: 'Submit',
    itWillBeUsedToSignIn: 'It will be used to sign in',
    itWillBeShownInProfile: 'It will be shown in your profile',
    mustBeBetween8and36: 'must be between 8 and 36 characters long',
    alreadyExist: 'already exist',
    // profile
    editingProfile: 'Editing profile',
    changeUserData: 'Change user data',
    changeUserPassword: 'Change user password',
    deleteProfile: 'Delete profile',
    actionRequiresPassword: 'This action requires the password',
    yourBoardsAndFoldersWontBeDeleted: `Your boards and folders won't be deleted`,
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
    changeScreenOrientation: 'Поменяйте ориентацию экрана',
    appIsDesignedToWorkInLandScapeMode: 'Board4you требуется ландшафтный режим для работы',
    untitled: 'Без названия',
    title: 'Название',
    // header
    home: 'Домашняя страница',
    createBoard: 'Создать доску',
    signIn: 'Войти',
    signUp: 'Регистрация',
    signOut: 'Выйти',
    myBoards: 'Мои доски',
    myFolders: 'Мои папки',
    profile: 'Профиль',
    // errors
    unexpectedError: "Неожиданная ошибка",
    tryToReloadThePage: "Попробуйте перезагрузить страницу",
    fileIsLocked: 'Файл заблокирован другим процессом',
    signInToPerformThisAction: 'Войдите, чтобы выполнить это действие',
    // board share mode
    noSuchRoom: 'Такой комнаты не существует',
    boardIsLoading: 'Ваша доска загружается',
    roomDeletedOrDoesNotExist: 'Комната удалена или не существует',
    createNew: 'Создать новую',
    // board
    yourBoards: 'Ваши доски',
    settings: 'Настройки',
    add: 'Добавить',
    // fodler
    yourFolders: 'Ваши папки',
    noBoardsYet: 'Досок пока нет',
    boardsToAdd: 'Доски для добавления',
    noSuchFolder: 'Такой папки не существует',
    folderContents: 'Содержимое папки',
    // auth
    login: 'Логин',
    nickName: 'Псевдоним',
    firstName: 'Имя',
    secondName: 'Фамилия',
    password: 'Пароль',
    optional: 'Необязательно',
    submit: 'Отправить',
    itWillBeUsedToSignIn: 'Используется для входа',
    itWillBeShownInProfile: 'Показывается в профиле',
    mustBeBetween8and36: 'должен иметь длину от 8 до 36 символов',
    alreadyExist: 'уже существует',
    // profile
    editingProfile: 'Редактирование профиля',
    changeUserData: 'Изменить данные профиля',
    changeUserPassword: 'Изменить пароль',
    deleteProfile: 'Удалить профиль',
    actionRequiresPassword: 'Это действие требует ввода пароля',
    yourBoardsAndFoldersWontBeDeleted: 'Ваши папки и доски не будут удалены',
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
