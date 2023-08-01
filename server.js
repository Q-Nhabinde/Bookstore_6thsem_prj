// require express and configure frontends
const express = require('express');
const app = express();
const path = require('path');
const nodemailer = require('nodemailer');
const session = require('express-session');



const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// configure session

app.use(session({
  secret: 'my_secret_key',
  resave: false,
  saveUninitialized: true
}));


app.get('/login', (req, res) => {
  res.render(path.join(__dirname, 'views', 'login.ejs'));
});
app.get('/loginAdmin', (req, res) => {
  res.render(path.join(__dirname, 'views', 'loginAdmin.ejs'));
});

app.get('/register', (req, res) => {
  res.render(path.join(__dirname, 'views', 'register.ejs'));
});

app.get('/contact', (req, res) => {
  res.render(path.join(__dirname, 'views', 'contact.ejs'));
});

app.get('/adminHome', (req, res) => {
  res.render(path.join(__dirname, 'views', 'adminHome.ejs'));
});
// app.get('/cart', (req, res) => {
//   res.render(path.join(__dirname, 'views', 'cart.ejs'));
// });



//connect to mysql

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'temu',
  database: 'bookstore'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL database with connection id ' + connection.threadId);
});


// handling register page

app.post('/register', (req, res) => {
  const { name, email, phone, address, password, confirm_password } = req.body;
  if (password !== confirm_password) {
    res.send('Passwords do not match');
    // res.render('register', { error: 'Passwords do not match' });

    return;
  }
  const sql = 'INSERT INTO register_user (name, email, phone, address, password) VALUES (?, ?, ?, ?, ?)';
  connection.query(sql, [name, email, phone, address, password], (err, result) => {
    if (err) throw err;
    console.log('User with id ' + result.insertId + ' registered');
    res.send('Thank you for registering!');
  });
  // req.session.authenticated = true;
  // req.session.username = username;
});


// login page handling

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  

  // Authenticate user using email and password
  connection.query('SELECT * FROM register_user WHERE email = ? AND password = ?', [email, password], (err, results) => {
    if (err) {
      console.log(err);
      res.send('An error occurred');
    } else if (results.length === 0) {
      res.send('Incorrect email or password');
    } else {
      // Redirect to main page on successful login
      req.session.authenticated = true;
      req.session.username = email;
      res.redirect('/');
    }
  });

  // const { username, password } = req.body;
  // Check the username and password in the database
  // If the user is authenticated, set the session variable
  
  // res.redirect('/');
});

// login as admin

app.post('/loginAdmin', (req, res) => {
  const { email, password } = req.body;

  

  // Authenticate user using email and password
  connection.query('SELECT * FROM register_admin WHERE email = ? AND password = ?', [email, password], (err, results) => {
    if (err) {
      console.log(err);
      res.send('An error occurred');
    } else if (results.length === 0) {
      res.send('Incorrect email or password');
    } else {
      // Redirect to main page on successful login
      req.session.authenticated = true;
      req.session.username = email;
      res.redirect('/adminHome');
    }
  });

  // const { username, password } = req.body;
  // Check the username and password in the database
  // If the user is authenticated, set the session variable
  
  // res.redirect('/');
});

// home page rendering

app.get('/', (req, res) => {

 
  // res.render('home', { authenticated, username });

  // query the database for all books
  connection.query('SELECT * FROM book_list', (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      res.send('Error querying database!');
    } else {
      // render the home page with the list of books
      const authenticated = req.session.authenticated;
      const username = req.session.username;
      console.log('Results:', results);
      res.render('home', { book_list: results, authenticated: username });
    }
  });

  


});


// add to cart and payment

app.post('/cart', (req, res) => {
  const bookId = req.body.bookId;
  const query = 'SELECT * FROM book_list WHERE id = ?';

  connection.query(query, [bookId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error adding book to cart');
    } else {
      const book = {
        title: result[0].title,
        author: result[0].author,
        price: result[0].price
      };

      const insertQuery = 'INSERT INTO cart_list SET ?';
      connection.query(insertQuery, book, (error, results) => {
        if (error) {
          console.error(error);
          res.status(500).send('Error adding book to cart');
        } else {
          const selectQuery = 'SELECT * FROM cart_list';
          connection.query(selectQuery, (err, cartItems) => {
            if (err) {
              console.error(err);
              res.status(500).send('Error retrieving cart items');
            } else {
              let totalPrice = 0;
              for (let i = 0; i < cartItems.length; i++) {
                totalPrice += parseFloat(cartItems[i].price);
              }
              // Render the cart page and pass cart items and total price as variables
              res.render('cart', { items: cartItems, totalPrice: totalPrice });
            }
          });
        }
      });
    }
  });
});


// cart page

app.get('/cart', (req, res) => {
  const selectQuery = 'SELECT * FROM cart_list';
  connection.query(selectQuery, (err, cartItems) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving cart items');
    } else {
      let totalPrice = 0;
      for (let i = 0; i < cartItems.length; i++) {
        totalPrice += parseFloat(cartItems[i].price);
      }

      // Render the cart page and pass cart items and total price as variables
      res.render('cart', { items: cartItems, totalPrice: totalPrice });
    }
  });
});


// searching by author and title

app.post('/search', (req, res) => {
  const inputValue = req.body.searching;
  connection.query('SELECT * FROM book_list where author = ? or title = ?', [inputValue, inputValue], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      res.send('Error querying database!');
    } else {
      // render the home page with the list of books
      console.log('Results:', results);
      res.render('search', { book_list: results});
    }
  });

});


// add as dmin

app.get('/add', (req, res) => {
  res.render(path.join(__dirname, 'views', 'add.ejs'));
});

app.post('/add', (req, res) => {
  const book = {
    title: req.body.title,
    author: req.body.author,
    price: req.body.price,
    image_url: req.body.image
  };

  connection.query('INSERT INTO book_list SET ?', book, (err, result) => {
    if (err) {
      console.error('Error inserting book:', err);
      res.send('Error inserting book!');
    } else {
      console.log('Book added:', book);
      res.redirect('/');
    }
  });
});

// remove as admin
app.get('/remove', (req, res) => {
    res.render(path.join(__dirname, 'views', 'remove.ejs'));
});

// handle POST requests to delete book from book_list table
app.post('/remove', (req, res) => {
  const bookId = req.body.bookId;
  connection.query('DELETE FROM book_list WHERE id = ?', [bookId], (err, result) => {
    if (err) {
      console.error('Error deleting book:', err);
      res.send('Error deleting book!');
    } else if (result.affectedRows === 0) {
      res.send('No book found with that ID!');
    } else {
      res.send('Book successfully deleted!');
    }
  });
});

// update as admin
app.get('/update', (req, res) => {
  res.render(path.join(__dirname, 'views', 'update.ejs'));
});

app.post('/update', (req, res) => {
  const book_id = req.body.book_id;
  const title = req.body.title;
  const author = req.body.author;
  const price = req.body.price;
  const image = req.body.image;
  connection.query('UPDATE book_list SET title = ?, author = ?, price = ?, image_url = ? WHERE id = ?', [title, author, price, image, book_id], (err, result) => {
    if (err) {
      console.error('Error updating book:', err);
      res.send('Error updating book!');
    } else {
      console.log('Book updated successfully!');
      res.redirect('/');
    }
  });
});


// contact submission

app.post('/contact', (req, res) => {
  // get form data from request body
  const name = req.body.name;
  const email = req.body.email;
  const message = req.body.message;

  // create email transporter with nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'scetbookstore@gmail.com',
      pass: 'bycacjnbsztyvjeb'
    }
  });

  // define email options
  const mailOptions = {
    from: email,
    to: 'scetbookstore@gmail.com',
    subject: `New message from ${name}`,
    text: message
  };

  // send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).send('Error sending email!');
    } else {
      console.log('Email sent:' + info.response);
      res.send('Thank you for contacting us!');
    }
  });
});




app.get('/logout', (req, res) => {
  // Destroy the session and redirect the user to the login page
  req.session.destroy(() => {
    res.redirect('/');
  });
});














// server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});


