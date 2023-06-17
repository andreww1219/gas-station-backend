const path = require('node:path')
const child_process = require('node:child_process')
const Koa = require('koa')
const Router = require('@koa/router')
const cors = require('@koa/cors')
const logger = require('koa-logger')
const range = require('koa-range')
const serve = require('koa-static')
const multer = require('@koa/multer')
const media = require('./middleware/media')
const fs = require('node:fs')

const PORT = 3333
// 上传后资源的URL地址
const RESOURCE_URL = `http://localhost:5000/api`
// 存储上传文件的目录
const UPLOAD_DIR = path.resolve(__dirname, './public/img/')
const STATIC_DIR = path.resolve(__dirname, './public/')

const app = new Koa()
const router = new Router()
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    // 设置文件的存储目录
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    // 设置文件名
    cb(null, `${file.originalname}`)
  },
})
const multerUpload = multer({ storage })

router.post('/image', multerUpload.single('file'), async (ctx, next) => {
  try {
    await next()
    const filename = ctx.file.originalname
    console.log('filename', path.resolve('./public/img_out', filename))
    try {
      fs.accessSync(
        path.resolve('./public/img_out', filename),
        fs.constants.R_OK
      )
      ctx.body = {
        code: 2,
        msg: '已检测，返回缓存',
        url: `${RESOURCE_URL}/img_out/${filename}`,
      }
    } catch (e) {
      console.log('文件不存在')
      const process = child_process.execSync(
        `cd python && python3 predict.py ${filename}`
      )
      console.log('[sysout]', process.toString())
      ctx.body = {
        code: 1,
        msg: '检测成功',
        url: `${RESOURCE_URL}/img_out/${filename}`,
      }
    }

    // 把处理完的图片返回
  } catch (e) {
    console.log(e)
    ctx.body = {
      code: 0,
      msg: '文件上传失败',
    }
  }
})

router.delete('/image', async (ctx, next) => {
  try {
    await next()
    const process = child_process.execSync(`cd public && del /s/q img_out`)
    console.log('[sysout]', process.toString())
    ctx.body = {
      code: 1,
      msg: '清除成功',
    }
  } catch (e) {
    console.log(e)
  }
})

router.get('/', async (ctx, next) => {
  ctx.body = 'Hello World'
})

app.use(logger())
app.use(cors())

// app.use(
// 	media({
// 		extMatch: /\.mp[3-4]$/i,
// 	})
// )
app.use(range)
app.use(serve(STATIC_DIR))
app.use(router.routes()).use(router.allowedMethods())

app.listen(PORT, () => {
  console.log('服务已启动')
})
