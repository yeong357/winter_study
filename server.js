const express = require('express')
const app = express() //express library 쓰겠다는 뜻

app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs') 

const { MongoClient } = require('mongodb')

let db
const url = 'mongodb+srv://lh703535:Kyu270511@cluster0.o074p9k.mongodb.net/?retryWrites=true&w=majority';
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('winter_study')

  app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')  //서버 띄우는 코드: listen(포트번호)
  })

}).catch((err)=>{
  console.log(err)
})

app.get('/', (요청, 응답) => {
    응답.sendFile(__dirname + '/index.html')
}) //간단한 서버 기능임
// '/' -> 누가 메인 페이지에 방문했을 때 '반갑다' 보내주셈
// '반갑다' 대신 html 파일
// 파일 보낼 땐 'sendFile'(_dirname: server.js가 담긴 폴더)

app.get('/news', (요청, 응답) => {
    응답.send('오늘의 날씨')
}) //news 페이지 만들기

app.get('/shop', function(요청, 응답) {
    응답.send('쇼핑 페이지')
})
// 1. 누가 /shop 접속 시 자동으로 app.get()함수 실행됨
// 2. 그 다음 콜백함수 실행됨 (콜백함수 사용할 수 있는 곳에서만 사용 가능 : library 참고)

app.get('/about', (요청, 응답) => {
    응답.sendFile(__dirname + '/about.html')
})

app.get('/list', async (요청, 응답) => {
  let result = await db.collection('collection').find().toArray()
  //await : 실행 완료까지 기다림  
  //js는 처리가 오래 걸리는 코드는 기다리지 않고 바로 다음 줄 실행함
  console.log(result[0].title)
  //array -> object에서 원하는 값 찾기
  //응답.send(result[0].title) 응답은 하나만 가능!
  응답.render('list.ejs', {list : result}) //db에서 뽑은 모든 글 목록을 보냄
  //서버 데이터를 ejs파일에 넣으려면
  //1. 경로 옆에 object 형식으로 전송
  //2. ejs 파일 안에서 ejs 문법 사용
  
})

app.get('/time', (요청, 응답) => {
  var time = new Date()
  응답.render('time.ejs', {newTime : time})
  //응답.render('time.ejs', time)
}) 