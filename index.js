const express = require("express");
const multer = require('multer') ;
const GridFsStorage = require('multer-gridfs-storage').GridFsStorage;
const Grid = require('gridfs-stream');
const methodOverride = require('method-override') ;
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const dbConfig = require('./config/db.config.js');

const connection = mongoose.createConnection(dbConfig.url);
let gfs;
let gridfsBucket;
connection.once('open', ()=>{
    // console.log(mongoose.mongo);
    // console.log(connection.db);   
    gridfsBucket = new mongoose.mongo.GridFSBucket(connection.db, {
        bucketName: 'uploads'
    }); 
    gfs = Grid(connection.db, mongoose.mongo);
    gfs.collection("uploads");
});
// 
var storage = new GridFsStorage({
    url: dbConfig.url,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
});
const upload = multer({ storage });

const app = express();
app.set("view engine", 'ejs');

app.get("/", (req, res) =>{
    res.render("index");
});

app.post("/upload", upload.single('file'), (req, res) =>{
    res.json({file:req.file});
});

app.get('/files/:filename' ,(req, res)=> {
    gfs.files.findOne({ filename: req.params.filename } , (err, file) =>{
        if ( !file || file.length === 0){
            return res.status(404) .json({
                err:'No file exists'
            });
        }
        // if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' ) {
            const readstream = gridfsBucket.openDownloadStream(file._id);
            readstream.pipe(res);
        // }else{
        //     return res.status(404) .json({
        //         err:'Not an image'
        //     });
        // }
    });
});
const port = 5000;
app.listen(port, () => {
    console.log(`Node server is listening on port ${port}`);
});
