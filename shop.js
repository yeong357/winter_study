const router = require('express').Router()

let connectDB = require('./../database.js')

let db //db 변수 빼서 쓰기
connectDB.then((client)=>{
  console.log('DB연결성공')
  db = client.db('winter_study')

}).catch((err)=>{
  console.log(err)
})


router.get('/shirts', async (요청, 응답) => {
    await db.collection('collection').find().toArray()
    응답.send('셔츠파는페이지')
  }) //API 빼서 쓰기
  
router.get('/pants', (요청, 응답) => {
    응답.send('바지파는페이지')
  })

module.exports = router
