const express = require('express')
const fs = require('fs');
const mime = require('mime-types')
const path = require('path')
const multer = require('multer')
const bodyParser = require('body-parser');
const process = require('node:process');
const mysql = require('mysql')
const { imagesRouter } = require('./routers/images.js')
const { textRouter } = require('./routers/text.js')
const { loginRouter } = require('./routers/login.js');
const { validatePort } = require('./tools/validateparam.js');

var portParam = process.argv[2];
var PORT = validatePort(portParam);
const configPath = path.join(__dirname,'/config/serverconfig.json');
const app = express();
const upload = multer();
const configBuffer = fs.readFileSync(configPath);
const configString = configBuffer.toString('utf-8');
const configJSON = JSON.parse(configString);
configJSON.PORT = PORT;
fs.writeFileSync(configPath,JSON.stringify(configJSON));

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.json());
app.use('/images',imagesRouter);
app.use('/texts',textRouter);
app.use('/login',loginRouter);

const dbconnection = mysql.createConnection({
    "user":'admin',
    "host":'localhost',
    "password":'adminpass',
    "database":'cloudservicedb'
})

dbconnection.connect();

app.post('/', upload.single('file'),(req,res) =>{
    res.status(400).send('Please specify the type of file you are trying to upload in the URL path. Example: /images, /texts \n')
})

app.get('/',(req,res) =>{
    res.status(200)
    .setHeader("Connection-state","connected")
    .end();
})

app.get('/global',(req,res) =>{
    console.log('get request'); //debug
    try
    {
        const storageJSON = {
            users: []
        }
        const users = fs.readdirSync(path.join(path.dirname(__filename),"./storage"));
        users.forEach(user =>{
            const userStorageImages = fs.readdirSync(path.join(path.dirname(__filename),`./storage/${user}/images`));
            const userStorageTexts = fs.readdirSync(path.join(path.dirname(__filename),`./storage/${user}/texts`));
            storageJSON.users.push({
                "user":user,
                "images":userStorageImages,
                "texts":userStorageTexts
            })
        })
        res.status(200)
        .setHeader('Connection-State','connected')
        .json(storageJSON);
    }
    catch(err){
        console.log(err);
        res.status(504)
        .send('Server error');
    }
})

app.get('/user',(req,res) =>{
    console.log("user get");
    const username = req.query.username;
    let userStorageImages;
    let userStorageTexts;

    try
    {
        userStorageImages = fs.readdirSync(path.join(path.dirname(__filename),`./storage/${username}/images`));
        userStorageTexts = fs.readdirSync(path.join(path.dirname(__filename),`./storage/${username}/texts`));
    }
    catch(err)
    {
        console.log(err);
        res.status(504)
        .send("Server error");
    }
    const storageJSON = {
        "images": userStorageImages,
        "texts": userStorageTexts
    }

    console.log(storageJSON);
    console.log(username);
    res.status(200)
    .json(storageJSON);
})

app.get('/admin',async (req,res) =>{
    const userCredentialsTable = await new Promise((resolve,reject) =>{
        dbconnection.query('SELECT * FROM userCredentials',(err,rows) =>{
            resolve(rows);
        })
    })
    res.status(200)
    .json(userCredentialsTable);
})

app.listen(PORT, () =>{
    console.log(`Listening on port: ${PORT}`);
})

module.exports.PORT = PORT;
