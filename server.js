
require('dotenv').config()

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt"); // Will be used in /register
const mongoose = require('mongoose');

const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser')
const methodOverride = require('method-override');

const {login, refresh, verify, skip} = require('./jwt');

const multer = require("multer");;
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require('gridfs-stream');



const app = express();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;



mongoose.connect(mongoURI, { useUnifiedTopology: true, useNewUrlParser: true }).then(()=>{
  console.log("Connected to database...");
}).catch((e)=>{
  console.log("Failed to connect to database: ", e);
});

var connection = mongoose.connection;

let gfs;
connection.once('open', () => {
  gfs = Grid(connection.db, mongoose.mongo);
  gfs.collection('videos');
});

const storage = new GridFsStorage({
  url: mongoURI,
  options:{
    useUnifiedTopology: true,
    useNewUrlParser: true
  },
  file: (req, file) => {
     return new Promise((resolve, reject) => {
       crypto.randomBytes(16, (err, buf) => {
         if (err) {
           return reject(err);
         }
         const filename = buf.toString('hex') + path.extname(file.originalname);
         const fileInfo = {
           filename: filename,
           bucketName: 'videos',
           metadata: {name: path.basename(file.originalname,path.extname(file.originalname)), extension: path.extname(file.originalname), public: false}
         };
         resolve(fileInfo);
       });
     });
   }
 });
 
const upload = multer({ storage });



app.use(express.static(__dirname));
app.use(bodyParser.json())
app.use(cookieParser())
app.use(methodOverride('_method'));
app.use(express.urlencoded({extended: false}));



app.get("/", skip, (req, res)=>{
    res.sendFile( __dirname + "/index.html");
});

app.post("/login", login);

app.post("/refresh", refresh);

app.get("/panel", verify, (req,res)=>{
  res.sendFile( __dirname + "/pages/panel.html");
});

app.post('/upload', verify, upload.single('file'), (req, res) => {
  res.redirect('back');
});

app.get('/files', verify, (req, res) => {
    gfs.files.find().toArray((err, files) => {
      // Check if files
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: 'No files exist'
        });
      } 
      // Files exist
      return res.json(files);
    });
  });

app.get('/files/:filename', verify, (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      // File exists
      return res.json(file);
    });
  });

app.get('/video/:filename', verify, (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
    if(file.contentType.substring(0,file.contentType.lastIndexOf('/')) === 'video'){ 
        // Read output to browser
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: 'Not a video'
        });
      }

    });
  });

  app.get('/toggle/:filename', verify, (req, res) => {

    gfs.files.findOne({  filename: req.params.filename }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }

      gfs.files.updateOne(
        { 'filename': file.filename },
        { $set: { 'metadata.public': !file.metadata.public } }
      )

        if(!file.metadata.public){
          return res.status(200).json({
            link: `https://vodbox.herokuapp.com/play?watch=${file.filename}`,
            redirect: 'https://vodbox.herokuapp.com/panel'
          });
        }else{
          return res.status(200).json({
            link: `the video is no longer public`,
            redirect: 'https://vodbox.herokuapp.com/panel'
          });
        }
    })
  });

  app.get('/play', (req, res) => {
    gfs.files.findOne({ filename: req.query.watch }, (err, file) => {
      // Check if file
      if (!file || file.length === 0 || !file.metadata.public) {
        return res.status(404).json({
          err: 'Sorry, we couldn\'t find the video you were looking for :('
        });
      }
    if(file.contentType.substring(0,file.contentType.lastIndexOf('/')) === 'video'){ 
        // Read output to browser
        res.setHeader('Content-Type', 'video/mp4');
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      } else {
        res.status(404).json({
          err: 'Not a video'
        });
      }
    });
  });


app.delete('/files/:id', verify, (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'videos' }, (err, gridStore) => {
      if (err) {
        return res.status(404).json({ err: err });
      }
    });
    res.redirect('/panel');
  });

app.listen(port,()=>{
    console.log(`Server listening on port ${port}...`)
});