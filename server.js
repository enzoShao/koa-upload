const Koa = require("koa");
const Router = require("koa-router");
const koaBody = require("koa-body");
const path = require("path");
const fs = require("fs-extra");
const cors = require("koa2-cors");
const app = new Koa();
const router = new Router();
const serve = require('koa-static');
app.use(serve('./public'));

app.use(
  cors({
    origin: function (ctx) {
      return ctx.header.origin;
    },
    allowMethods: ["POST", "GET"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// 啟用文件上傳
app.use(
  koaBody.koaBody({
    multipart: true,
    formidable: {
      uploadDir: path.join(__dirname, "/public"), // 上傳目錄
      keepExtensions: true, // 保留檔案擴展名
    },
  })
);


// 上傳檔案的 API
router.post("/upload", async (ctx) => {
    // 檢查是否有上傳文件
  if (!ctx.request.files.file) {
    ctx.status = 400;
    ctx.body = { message: "No file uploaded" };
    return;
  }
  // 確認目標資料節是否存在，不存在則創建
  const uploadPath = "./public";
  const flag = fs.existsSync(uploadPath);
  if (!flag) {
    mkdirp.sync(uploadPath);
  } else {
    console.log("文件夾已存在");
  }

  const file = ctx.request.files.file;
  let targetPath = path.join(__dirname, "/public", file.originalFilename);
  let newFilename = file.originalFilename;
  const fileExtension = path.extname(newFilename); // 取得文件擴展名
  const fileNameWithoutExt = path.basename(newFilename, fileExtension);  // 取得沒有文件擴展名的文件名稱，如果 newFilename 是 "example.txt"，fileNameWithoutExt 則是 "example"。
  let counter = 1;

  // 跑迴圈直到找到一個不存在的文件名
  while (fs.existsSync(targetPath)) {
    newFilename = `${fileNameWithoutExt}-${counter}${fileExtension}`;
    targetPath = path.join(__dirname, "/public", newFilename);
    counter++;
  }
  const reader = fs.createReadStream(file.filepath);
  const stream = fs.createWriteStream(targetPath);
  reader.pipe(stream).on("finish", () => {
    console.log("uploading %s -> %s", newFilename, stream.path);
    // 文件成功写入后，删除原始文件
    fs.unlink(file.filepath, (err) => {
      if (err) throw err;
      console.log("Original file deleted");
    });
  });

  ctx.body = {
    url: targetPath, // 返回檔案訪問URL
  };
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
