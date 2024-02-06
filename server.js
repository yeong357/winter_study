const express = require('express')
const app = express() //express library 쓰겠다는 뜻
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')
require('dotenv').config()

app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs') 
app.use(express.json())
app.use(express.urlencoded({extended:true})) 
//요청.body 쓰려면 위 두개 필요
app.use(methodOverride('_method'))

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

app.use(passport.initialize())
app.use(session({
  secret: '암호화에 쓸 비번',
  resave : false,
  saveUninitialized : false,
  cookie : { maxAge : 60 * 60 * 1000 },
  store : MongoStore.create({
    mongoUrl : process.env.DB_URL,
    dbName : 'winter_study'
  })

}))

app.use(passport.session()) 

const { S3Client } = require('@aws-sdk/client-s3')
const multer = require('multer')
const multerS3 = require('multer-s3')
const s3 = new S3Client({
  region : 'ap-northeast-2',
  credentials : {
      accessKeyId : process.env.S3_KEY,
      secretAccessKey : process.env.S3_SECRET
  }
})

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'winterstudy',
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()) //업로드시 파일명 변경가능
    }
  })
})

let connectDB = require('./database.js')

let db
connectDB.then((client)=>{
  console.log('DB연결성공')
  db = client.db('winter_study');

  app.listen(process.env.PORT, () => {
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
  //console.log(result[0].title)
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
}) 

app.get('/write', (요청, 응답) => {
  응답.render('write.ejs')
}) 

app.post('/add', upload.single('img1'), async (요청, 응답) => {

  try {
    if (요청.body.title == '') {
      응답.send('제목 없음!')
    } else {
      await db.collection('collection').insertOne({
        title : 요청.body.title, 
        content : 요청.body.content, 
        img : 요청.file ? 요청.file.location : '', //삼항연산자
        user : 요청.user._id,
        username : 요청.user.username
      })
      응답.redirect('/list')

    }
  } catch(e) {
    console.log(e)//에러메시지 출력해줌
    응답.status(500).send('서버 에러!')
  }
}) 

app.get('/detail/:id', async (요청, 응답) => {
  //'detail/'뒤에 아무 문자나 입력하면 안에 있는 코드가 실행됨

  try {
    let result = await db.collection('collection').findOne({_id : new ObjectId(요청.params.id)})

    let result2 = await db.collection('comment').find({ parentId : new ObjectId(요청.params.id)}).toArray()
  응답.render('detail.ejs', {result : result, result2 : result2} )
  //유저가 '/detail/1' 접속하면, id가 1인 글 내용 ejs 파일로 보내기
  //기능 정리
  //1. 유저가 /detail/어쩌구 접속하면 (접속 by 링크)
  //2. {_id : 어쩌구} 글을 DB에서 찾아서
  //3. ejs 파일에 박아서 보내줌
  } catch(e){
    console.log(e)
    응답.status(404).send('url 입력 이상!!')
  }
  //try/catch 하나로 모든 예외 cover 못 함
  //id 길이가 같고 끝에 한자리만 다르면 ejs에 null 보냄 -> error
}) 

app.get('/edit/:id', async (요청, 응답) => {
  let result = await db.collection('collection').findOne({_id : new ObjectId(요청.params.id)})
  응답.render('edit.ejs', {result:result})
})    

app.put('/edit', async (요청, 응답) => {
  await db.collection('collection').updateOne({ _id : new ObjectId(요청.body.id)}, 
  {$set : { title : 요청.body.title, content : 요청.body.content}})
  //updateOne({어떤 document를 수정하고 싶은 지 - 사용자가 알고 있음}, {$set: 어떤 내용으로 덮어쓸 지-요청.body 사용})
  //서버에서 정보를 찾을 수 없으면: 유저에게 보내라고 하거나 / DB에서 꺼내보거나
  응답.redirect('/list')
  
})   

//app.put('/edit', async (요청, 응답) => {s
  //await db.collection('collection').updateMany({ _id : 1}, 
  //{$inc : { like : 1}})
  
  
//}) 

app.delete('/delete', async (요청, 응답)=>{
  await db.collection('collection').deleteOne({ 
    _id : new ObjectId(요청.query.docid),
    user : new ObjectId(요청.user._id)
  })
  응답.send('삭제완료')
}) 

app.get('/list/:id', async (요청, 응답) => {
  let result = await db.collection('collection').find().skip( (요청.params.id - 1) * 5 ).limit(5).toArray()
  응답.render('list.ejs', {list : result})
})

app.get('/list/next/:id', async (요청, 응답) => {
  let result = await db.collection('collection')
  .find({_id : {$gt : new ObjectId(요청.params.id)}}).limit(5).toArray() //글 순서나 번호가 중요하면 자동 id 말고, 정수로 부여하는 게 더 효율적임-but-글 번호가 중요한 서비스는 별로 없음
  응답.render('list.ejs', {list : result})
})

passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
  let result = await db.collection('user').findOne({ username : 입력한아이디})
  if (!result) {
    return cb(null, false, { message: '아이디 DB에 없음' })
  }

  if (await bcrypt.compare(입력한비번, result.password)) {
    return cb(null, result)
  } else {
    return cb(null, false, { message: '비번불일치' });
  }
}))

passport.serializeUser((user, done) => {
  console.log(user)
  process.nextTick(() => {
    done(null, { id: user._id, username: user.username })
  })
})

passport.deserializeUser(async (user, done) => {
  let result = await db.collection('user').findOne({_id : new ObjectId(user.id) })//최신 유저 정보 반영하기 위한 코드
  delete result.password
  process.nextTick(() => {
    return done(null, result)
  })
})//유저가 보낸 쿠키를 분석 -> 쿠키가 이상 없으면 현재 로그인된 유저 정보를 알려줌

app.get('/login', async (요청, 응답) => {
  console.log(요청.user)
  응답.render('login.ejs')
})

app.post('/login', async (요청, 응답, next) => {
  passport.authenticate('local', (error, user, info) => {
    if (error) return 응답.status(500).json(error)
    if (!user) return 응답.status(401).json(info.message)
    요청.logIn(user, (err) => {
      if (err) return next(err)
      응답.redirect('/')//로그인 완료 시 실행할 코드
    })
  })(요청, 응답, next)
})

app.get('/register', (요청, 응답) => {
  응답.render('register.ejs')
})

app.post('/register', async (요청, 응답) => {

  let 해시 = await bcrypt.hash(요청.body.password, 10)
    
  await db.collection('user').insertOne({
    username : 요청.body.username,
    password : 해시
  })
  응답.redirect('/')
})

app.use('/shop', require('./routes/shop.js')) //shop.js에 있던 API 사용 가능

app.get('/search', async (요청, 응답) => {
  console.log(요청.query.val)
  let 검색조건 = [
    {$search : {
      index : 'title_index',
      text : { query : 요청.query.val, path : 'title' }
    }},
    { $project : {_id : 0} }
  ]

  let result = await db.collection('collection')
  .aggregate(검색조건).toArray()

  응답.render('search.ejs', {list : result})
})

app.post('/comment', async (요청, 응답) => {
  await db.collection('comment').insertOne({
    content : 요청.body.content,
    writerId : new ObjectId(요청.user._id),
    writer : 요청.user.username,
    parentId : new ObjectId(요청.body.parentId)
  })
  응답.redirect('back')
})

app.get('/chat/request', async (요청, 응답) => {
  await db.collection('chatroom').insertOne({
    member : [요청.user._id, 요청.user.writerId],
    date : new Date()
  })
  응답.render('')
})