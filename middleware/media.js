const fs = require("fs")
const path = require("path")

const mime = {
	mp4: "video/mp4",
	webm: "video/webm",
	ogg: "application/ogg",
	ogv: "video/ogg",
	mpg: "video/mepg",
	flv: "flv-application/octet-stream",
	mp3: "audio/mpeg",
	wav: "audio/x-wav",
}

let getContentType = (type) => {
	if (mime[type]) {
		return mime[type]
	} else {
		return null
	}
}

let readFile = async (ctx, options) => {
	// 我们先确认客户端请求的文件的长度范围
	let match = ctx.request.header["range"]
	// 获取文件的后缀名
	let ext = path.extname(ctx.path).toLocaleLowerCase()
	// 获取文件在磁盘上的路径
	let diskPath = decodeURI(path.resolve(options.root + ctx.path))
	// 获取文件的开始位置和结束位置
	let bytes = match.split("=")[1]
	// 有了文件路径之后，我们就可以来读取文件啦
	let stats = fs.statSync(diskPath)
	// 在返回文件之前，我们还要知道获取文件的范围（获取读取文件的开始位置和开始位置）
	let start = Number.parseInt(bytes.split("-")[0]) // 开始位置
	let end = Number.parseInt(bytes.split("-")[1]) || stats.size - 1 // 结束位置
	// 如果是文件类型
	if (stats.isFile()) {
		return new Promise((resolve, reject) => {
			// 读取所需要的文件
			let stream = fs.createReadStream(diskPath, {
				start: start,
				end: end,
			})
			// 监听 ‘close’当读取完成时，将stream销毁
			ctx.res.on("close", function () {
				stream.distory()
			})
			// 设置 Response Headers
			ctx.set("Content-Range", `bytes ${start}-${end}/${stats.size}`)
			ctx.set("Accept-Range", `bytes`)
			// 返回状态码
			ctx.status = 206
			// getContentType上场了，设置返回的Content-Type
			ctx.type = getContentType(ext.replace(".", ""))
			stream.on("open", function (length) {
				if (ctx.res.socket.writeable) {
					try {
						stream.pipe(ctx.res)
					} catch (e) {
						stream.destroy()
					}
				} else {
					stream.destroy()
				}
			})
			stream.on("error", function (err) {
				if (ctx.res.socket.writable) {
					try {
						ctx.body = err
					} catch (e) {
						stream.destroy()
					}
				}
				reject()
			})
			// 传输完成
			stream.on("end", function () {
				resolve()
			})
		})
	}
}

module.exports = function (opts) {
	// 设置默认值
	let options = Object.assign(
		{},
		{
			extMatch: [".mp4", ".flv", ".webm", ".ogv", ".mpg", ".wav", ".ogg"],
			root: process.cwd(),
		},
		opts
	)

	return async (ctx, next) => {
		// 获取文件的后缀名
		let ext = path.extname(ctx.path).toLocaleLowerCase()
		// 判断用户传入的extMath是否为数组类型，且访问的文件是否在此数组之中
		let isMatchArr =
			options.extMatch instanceof Array &&
			options.extMatch.indexOf(ext) > -1
		// 判断用户传输的extMath是否为正则类型，且请求的文件路径包含相应的关键字
		let isMatchReg =
			options.extMatch instanceof RegExp &&
			options.extMatch.test(ctx.path)
		if (isMatchArr || isMatchReg) {
			if (ctx.request.header && ctx.request.header["range"]) {
				// readFile 上场
				return await readFile(ctx, options)
			}
		}
		await next()
	}
}
