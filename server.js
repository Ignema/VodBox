console.log = function(){}; // Uncomment this line to remove all console logs if you're pushing to production!

require("dotenv").config();

const express = require("express");
const path = require("path");
const { Readable } = require("stream")
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

mongoose.connect(mongoURI, { useUnifiedTopology: true, useNewUrlParser: true })
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

app.set('view engine', 'ejs');
app.use(express.static(__dirname));
app.use(bodyParser.json({limit: '120mb'}));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/robots.txt", (req, res) => {
  res.sendFile(__dirname + "/robots.txt");
});

app.get("/alt", (req, res) => {
  res.sendFile(__dirname + "/pages/alt.html");
});

app.post("/altlog", (req, res)=>{
  if(req.body.username == "admin" && req.body.password == "admin"){
    res.status(200).json({"message": "Well Done! You are awesome!", "key": 'FLAG: 7c2ddf7e16ecbb444def8ff33caf3b83'});
  } else{
    res.status(401).redirect("/alt");
  }
})

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
      res.setHeader("Content-Type", file.contentType);
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

app.get("/src", (req, res) => {
  gfs.files.findOne({ filename: req.query.watch }, (err, file) => {
    // Check if file
    if (!file || file.length === 0 || !file.metadata.public) {
      return res.status(404).json({
        err: "Sorry, we couldn't find the video you were looking for :(",
      });
    }
    if (file.contentType.substring(0, file.contentType.lastIndexOf("/")) === "video") {
      // Read output to browser
      res.setHeader("Content-Type", file.contentType);
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Not a video",
      });
    }
  });
});

app.get("/v", (req, res) => {
  gfs.files.findOne({ filename: req.query.watch }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.render("video", {'title': "VodBox", 'public': false});
    }
    if (!file.metadata.public) {
      return res.render("video", {'title': file.metadata.name, 'public': false});
    }
    if (file.contentType.substring(0, file.contentType.lastIndexOf("/")) === "video") {
      res.render("video", {'title': file.metadata.name, 'public': true , 'video': "src?watch=" + file.filename, 'type': file.contentType, 'filename': file.filename});
    } else {
      return res.render("video", {'title': file.metadata.name, 'public': false});
    }
  });
});

app.get("/poster", (req, res)=>{
  res.setHeader("Content-Type", "image/png");
  res.sendFile(__dirname + "/assets/poster.png");
})


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

var file = [];

io.on("connection", (socket) => {
  console.log("Socket connexion was established...");

  app.post("/upload", (req, res)=>{
    if(req.body){
      console.log("Received fragment of file: ", req.body["slice"]);
      file.push(req.body["slice"]);
      io.emit("fragment", req.body["number"]);
      res.status(204).send();
    } else{
      res.redirect("/panel");
    }
  })

  // app.post("/completed", (req, res)=>{

  //   const writestream = gfs.createWriteStream(generateOptions(req.body["originalname"], req.body["filetype"]));
  //   Readable.from(Buffer.from(file.flat(Infinity))).pipe(writestream);

  //   writestream.on('finish', () => {
  //     console.log("Finished uploading file!");
  //     console.log("Refreshing client page...");
  //     res.send("back");
  //   });
  // })

  socket.on("completed", (data) => {

    const writestream = gfs.createWriteStream(generateOptions(data["originalname"], data["filetype"]));
    Readable.from(Buffer.from(file.flat(Infinity))).pipe(writestream);

    writestream.on('finish', () => {
      console.log("Finished uploading file!");
      console.log("Refreshing client page...");
      io.emit("refresh");
      file = [];
    });
  });
});

// let io = socket(server);

// io.on("connection", (socket) => {
//   console.log("Socket connexion was established...");

//   var file = [];

//   socket.on("file", (data) => {
//     console.log("Received fragment of file: ", data["slice"]);
//     file.push(data["slice"]);
//     io.emit("fragment", data["number"]);
//   });

//   socket.on("completed", (data) => {

//     const writestream = gfs.createWriteStream(generateOptions(data["originalname"], data["filetype"]));
//     Readable.from(Buffer.from(file.flat(Infinity))).pipe(writestream);

//     writestream.on('finish', () => {
//       console.log("Finished uploading file!");
//       console.log("Refreshing client page...");
//       io.emit("refresh");
//     });
//   });
// });

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

