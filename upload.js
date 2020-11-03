const MongoClient = require('mongodb');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage') 

const url = "mongodb://test:1234@localhost:27017/videos";
const dbName = "videos"; 

let storage = new GridFsStorage({  
    url: url,  
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads',
            metadata: {name: path.basename(file.originalname,path.extname(file.originalname)), extension: path.extname(file.originalname)}
          };
          resolve(fileInfo);
        });
      });
    }
});

let upload = null; 

storage.on('connection', (db) => {  
    //Setting up upload for a single file  
    upload = multer({    
       storage: storage  }).single('file1');  
  }); 
  
module.exports.uploadFile = (req, res) => {  
  upload(req, res, (err) => {    
    if(err){      
      return res.render('index', {title: 'Uploaded Error', message: 'File could not be uploaded', error: err});    
    }    
    res.render('index', {
      title: 'Uploaded', 
      message: `File ${req.file.filename} has been uploaded!`});  
  });
};