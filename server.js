require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcrypt"); // Will be used in /register
const mongoose = require("mongoose");

const socket = require("socket.io");

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");

const { login, refresh, verify, skip } = require("./jwt");

const Grid = require("gridfs-stream");
const app = express();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(mongoURI, { useUnifiedTopology: true, useNewUrlParser: true })
  .then(() => {
    console.log("Connected to database...");
  })
  .catch((e) => {
    console.log("Failed to connect to database: ", e);
  });

var connection = mongoose.connection;

let gfs;
connection.once("open", () => {
  gfs = Grid(connection.db, mongoose.mongo);
  gfs.collection("videos");
});

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: false }));

app.get("/", skip, (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/login", login);

app.post("/refresh", refresh);

app.get("/panel", verify, (req, res) => {
  res.sendFile(__dirname + "/pages/panel.html");
});

app.get("/files", verify, (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files exist",
      });
    }
    // Files exist
    return res.json(files);
  });
});

app.get("/files/:filename", verify, (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists",
      });
    }
    // File exists
    return res.json(file);
  });
});

app.get("/video/:filename", verify, (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists",
      });
    }
    if (file.contentType.substring(0, file.contentType.lastIndexOf("/")) === "video") {
      // Read output to browser
      res.setHeader("Content-Type", "video/mp4");
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not a video",
      });
    }
  });
});

app.get("/toggle/:filename", verify, (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists",
      });
    }

    gfs.files.updateOne(
      { filename: file.filename },
      { $set: { "metadata.public": !file.metadata.public } }
    );

    return res.redirect("back");
  });
});

app.get("/v", (req, res) => {
  gfs.files.findOne({ filename: req.query.watch }, (err, file) => {
    // Check if file
    if (!file || file.length === 0 || !file.metadata.public) {
      return res.status(404).json({
        err: "Sorry, we couldn't find the video you were looking for :(",
      });
    }
    if (
      file.contentType.substring(0, file.contentType.lastIndexOf("/")) ===
      "video"
    ) {
      // Read output to browser
      res.setHeader("Content-Type", "video/mp4");
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not a video",
      });
    }
  });
});

app.delete("/files/:id", verify, (req, res) => {
  gfs.remove({ _id: req.params.id, root: "videos" }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }
  });
  res.redirect("/panel");
});

let server = app.listen(port, () => {
  console.log(`Server listening on port ${port}...`);
});

let io = socket(server);

var vod;

io.on("connection", (socket) => {
  console.log("Socket connexion was established...");

  var file = [];

  socket.on("file", (part) => {
    console.log("Received fragment of file: ", part);
    file.push(part);
  });

  socket.on("completed", (data) => {
    fs.writeFileSync(
      "./.temp/vod.mp4",
      Buffer.from(file.flat(Infinity)),
      { flag: "w" },
      (err) => {
        console.log("[fs.writeFile] ERROR: ", err);
      }
    );

    const writestream = gfs.createWriteStream(generateOptions(data["originalname"], data["filetype"]));
      fs.createReadStream("./.temp/vod.mp4").pipe(writestream);

      writestream.on('finish', function (vod) {
        console.log("Finished uploading file!");
        fs.unlink('./.temp/vod.mp4', (err)=>{
          if(err){
            console.log("[fs.unlink] ERROR: ", err);
          }
        console.log("Removing junk files...");
        console.log("Refreshing client page...");
        io.emit("refresh");
        })
      });
      
    // fs.readFile("./.temp/vod.mp4", (err, data) => {
    //   if (err) {
    //     console.log("[fs.readFile] ERROR: ", err);
    //   }
    // });
   
  });
});

generateOptions = (originalname, filetype) => {

  var randomName = crypto.randomBytes(16).toString("hex") + path.extname(originalname);

  return {
    filename: randomName,
    content_type: filetype,
    root: 'videos',
    bucketName: "videos",
    metadata: {
      name: path.basename(originalname, path.extname(originalname)),
      extension: path.extname(originalname),
      public: false,
    }
  }
}

