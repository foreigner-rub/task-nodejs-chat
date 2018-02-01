/*
 * Тестовое задание: Чат на Node.JS
 * 
 * Групповой TCP чат с историей в базе
  * 
 * Автор: Чудинов Олег
 * mailto://oleg4udinov@gmail.com
 * 
 * 1 февраля 2018 г.
 * 
 */ 



// Конфигурация сервера
var

port = 32800,

db_server = '10.90.90.231',
db_name = 'ch4_test_db',
db_user = 'my_test',
db_password = '123';



// Сообщение при запуске
console.log(
    
'\
\nТестовое задание: Чат на Node.JS\
\nАвтор: Чудинов Олег, oleg4udinov@gmail.com\
\nДата: 1 февраля 2018 г.\
\n\n\
\nЗапуск...\
\nОжидайте подключения к базе данных...\n'

);



// Подключаем рекомендуемые библиотеки
const

app = require('express')(),
server = require('http').Server(app),
io = require('socket.io')(server),
sqlize = require('sequelize');



// Объявим глобальные переменные и функции
var

ulist = []; // Кэш подключенных пользователей



// Отдадим браузеру при подключении главную страницу
app.get( '/', (req, res) => {
    
  // Создадим небольшой тестовый клиент, общение через консоль
  res.send(

'<script src="/socket.io/socket.io.js"></script>\
<script>\
var \
socket = io.connect("http://localhost:32800"),\
send = (msg)=>{socket.emit("send",msg)},\
ulist = ()=>{socket.emit("ulist")};\
socket.on( "greetings", (s) => { console.log( "Вы подключены как ", s ) });\
socket.on( "print", (t) => { console.log(t) });\
socket.on( "msg", (s,msg) => { console.log( "%s: ", s, msg ) });\
socket.on( "sent", () => { console.log( "Ваше сообщение разослано" ) });\
socket.on( "ulist", (l) => { console.log( "Пользователи: ", l ) });\
</script>\
<h3>Вы подключены к чату, откройте консоль.</h3><br/>\
Сообщение: send(<текст>)<br/>\
Пользователи: ulist().<br/>\
Чтобы отключиться закройте страницу.'
    
  ); // /res.send(...
  
});



// Обработаем событие подключения нового клиента
io.on( 'connection', (socket) => {

  // Подготовка созданного сокета
    
  // Обработка сообщения от клиента
  socket.on( 'send', (msg) => {
      
    // На сервере покажем в консоли
    console.log( `${socket.uname}: ${msg}` );

    // Разослать всем
    socket.broadcast.emit( 'msg', socket.uname, msg );
    
    // Клиенту отчитаемся, что разослали сообщение
    socket.emit( 'sent' );
    
    // Записать в бд
    chatlog.create( { msg: `${socket.uname}: ${msg}` } );

  });



  // Обработаем запрос от клиента списка пользователей
  socket.on( 'ulist', () => {

    // Отдаём список
    socket.emit( 'ulist', ulist );
    
    var event_str = `Запрос списка пользователей от ${socket.uname}`;
    
    // Сообзение в консоль
    console.log(event_str);
    
    // Записать в бд, что он попросил список
    chatlog.create( { msg: event_str } );
    
  });



  // Обработаем отключение клиента
  socket.on( 'disconnect', () => {

    var event_str = `Пользователь отключился ${socket.uname}`;

    // На сервере покажем в консоли
    console.log( event_str );

    // Разослать всем
    socket.broadcast.emit( 'print', event_str );

    // Удаляем из списка пользователей  
    ulist.splice( ulist.indexOf(socket.uname), 1);

    // Добавить сообщение в базу данных
    chatlog.create( { msg: event_str } );

  });

  
  // Обработка собственно подключения клиента
  
  // Назначим объекту своё поле с именем пользователя
  socket.uname = `#${socket.id.substr(1,4)}@${(socket.handshake.address).replace('::ffff:','')}`;
  
  // Добавим в список пользователей
  ulist.push( socket.uname );
  
  var event_str = `Подключился ${socket.uname}`;
  
  // На сервере покажем в консоли
  console.log( event_str );
  
  // Отправим клиенту его имя
  socket.emit( 'greetings', socket.uname );
  
  // Разослать всем что подключен новый клиент
  socket.broadcast.emit( 'print', event_str );
  
  // Записать в бд событие
  chatlog.create( { msg: event_str } );
  
});



// Подготовка подключения к базе данных
const db = new sqlize( `postgres://${db_user}:${db_password}@${db_server}:5432/${db_name}`, { logging: false } );
const chatlog = db.define( 'chatlog', { msg: sqlize.STRING } );



// Проверка подключения к базе данных
db.authenticate().then( ()=>{

    console.log( 'Готово' );
    
    // Создаст табличку
    chatlog.sync(); // С дропом: {force: true}

    console.log( 'Запуск HTTP сервера...' );

    // Запускаем HTTP сервер, который отдаст небольшого клиента, который подключится к socket.io
    server.listen( port, () => {

      console.log( 'Сервер запущен, порт', port );
      chatlog.create( { msg: 'Сервер запущен, порт ' + port } );

    });

}).catch( (err)=>{

    console.error( 'Не удалось подключиться к базе данных:', err.code );

});
