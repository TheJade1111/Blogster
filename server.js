const express = require("express");
const session = require("express-session");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const mongo = require("mongodb");
const client = mongo.MongoClient;
const app = express();
const PORT = 3000;
let DBInstance;
let updatePostTitle;

client
  .connect("mongodb://localhost:27017")
  .then((database) => {
    DBInstance = database.db("Blog");
  })
  .catch((err) => {
    console.log(err);
  });
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname));
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "123456",
    cookie: {
      maxAge: 600000,
    },
  })
);
app.use((req, res, next) => {
  console.log(req.url);
  next();
});
function authentication(req, res, next) {
  if (req.session.username && req.session.password) {
    next();
  } else {
    res.redirect("/login");
  }
}
app.get("/", (req, res) => {
  res.redirect("/login");
});
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});
app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/register.html");
});
app.get("/home", (req, res) => {
  res.sendFile(__dirname + "/home.html");
});
app.get("/dashboard", authentication, (req, res) => {
  res.sendFile(__dirname + "/dashboard.html");
});
app.get("/upload", authentication, (req, res) => {
  res.sendFile(__dirname + "/upload.html");
});
app.get("/update", authentication, (req, res) => {
  res.sendFile(__dirname + "/update.html");
});
app.get("/createAuthor", authentication, (req, res) => {
  res.sendFile(__dirname + "/createAuthor.html");
});
app.post("/upload", authentication, upload.single("pic"), (req, res) => {
  console.log(req.file);
  let tempObj = {
    image: req.file.buffer,
    title: req.body.title,
    article: req.body.article,
    username: req.session.username,
  };
  DBInstance.collection("blogs")
    .insertOne(tempObj)
    .then((response) => {
      console.log(response.insertedCount);
      res.sendStatus(200);
    })
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
    });
});
app.post("/login", (req, res) => {
  if (!req.body.username && !req.body.password) {
    res.redirect("/register");
    res.sendStatus(200);
  }
  DBInstance.collection("users")
    .findOne({ username: req.body.username })
    .then((response) => {
      if (response == null) {
        res.redirect("/register");
      } else if (response.password == req.body.password) {
        req.session.username = response.username;
        req.session.password = response.password;
        req.session.role = response.role;
        res.redirect("/dashboard");
      } else {
        res.send("Enter correct password!");
      }
    });
});
app.post("/register", (req, res) => {
  DBInstance.collection("users")
    .findOne({ username: req.body.username })
    .then((response) => {
      if (response == null) {
        let temp = req.body;
        temp.role = "author";
        DBInstance.collection("users")
          .insertOne(temp)
          .then((response) => {
            res.redirect("/login");
          })
          .catch((err) => {
            console.log(err);
            res.sendStatus(404);
          });
      } else {
        res.send("Such user already exists!");
      }
    })
    .catch((err) => console.log(err));
});

app.post("/createAuthor", authentication, (req, res) => {
  DBInstance.collection("users")
    .findOne({ username: req.body.username })
    .then((response) => {
      if (response == null) {
        let temp = req.body;
        temp.role = "author";
        DBInstance.collection("users")
          .insertOne(temp)
          .then((response) => {
            res.sendStatus(200);
          })
          .catch((err) => {
            console.log(err);
            res.sendStatus(404);
          });
      } else {
        res.send("Such user already exists!");
      }
    })
    .catch((err) => console.log(err));
});

app.get("/getUser", (req, res) => {
  res.send(req.session);
});

app.get("/getBlog", (req, res) => {
  DBInstance.collection("blogs")
    .find({})
    .toArray()
    .then((response) => {
      res.send(response);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/getPostToUpdate", (req, res) => {
  DBInstance.collection("blogs")
    .findOne({ title: updatePostTitle })
    .then((response) => {
      res.send(response);
    })
    .catch((err) => {
      console.log(err);
    });
});
app.post("/updatePost", (req, res) => {
  updatePostTitle = req.body.title;
  res.sendStatus(200);
});
app.post("/updatePost2", upload.single("pic2"), (req, res) => {
  console.log(req.file);
  DBInstance.collection("blogs")
    .findOne({ title: updatePostTitle })
    .then((response) => {
      let tempObj = response;
      if (req.body.title && response.title != req.body.title) {
        tempObj.title = req.body.title;
      }
      if (req.body.article && response.article != req.body.article) {
        tempObj.article = req.body.article;
      }
      if (req.file) {
        tempObj.image = req.file.buffer;
      }
      DBInstance.collection("blogs").updateOne(
        { title: updatePostTitle },
        { $set: tempObj }
      );
      res.redirect("/dashboard");
    })
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
    });
});
app.post("/removePost", (req, res) => {
  DBInstance.collection("blogs")
    .deleteOne({ title: req.body.title })
    .then((resposne) => {
      console.log(resposne.deletedCount);
      res.sendStatus(200);
    })
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
    });
});
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});
app.listen(PORT, () => {
  console.log("Server running on PORT", PORT);
});
