[2:31 pm, 1/2/2026] P.Harsha Vardhan: var express = require('express');
var router = express.Router();
var passport = require('passport');
var userModel = require('../models/user');
var imgModel = require('../models/image');
var classModel = require('../models/class');
var User = require('../models/user');
var multer = require('multer');

const MailSender = require('../mail')

var api = require('../api/api')

var fs = require('fs');
var path = require('path');

let totalClasses = 0
let totalStudents = 0

//Function that calculates the total classes and total students in the portal
function calc(id) {
  classModel.count({ "owner": id }, function (err, count) {
    totalClasses = count
  })
  userModel.count({ who: "1" }, function (err, count) {
    totalStudents = count
  })
}
router.post('/editU…
[2:36 pm, 1/2/2026] P.Harsha Vardhan: var express = require('express');
var router = express.Router();
var passport = require('passport');
var userModel = require('../models/user');
var imgModel = require('../models/image');
var classModel = require('../models/class');
var User = require('../models/user');
var multer = require('multer');

const MailSender = require('../mail');
var api = require('../api/api');

var fs = require('fs');
var path = require('path');

let totalClasses = 0;
let totalStudents = 0;

/* =========================
   CALCULATE TOTALS
========================= */
function calc(id) {
  classModel.count({ owner: id }, function (err, count) {
    totalClasses = count;
  });
  userModel.count({ who: "1" }, function (err, count) {
    totalStudents = count;
  });
}

/* =========================
   EDIT USER INFO
========================= */
router.post('/editUserInfo', function (req, res) {
  var { name, rollnumber, class: classs, year } = req.body;

  if (rollnumber !== req.user.rollnumber) {
    User.findOne({ rollnumber }, function (err, user) {
      if (user) {
        api.studentAttendance(req.user.id).then(attendance => {
          res.render('user/profile', {
            user: req.user,
            attendance,
            msg: 'Roll number already in use.'
          });
        });
      } else {
        api.updatestudent({ name, rollnumber, class: classs, year }, req.user.id)
          .then(() => res.redirect("/user/profile/?success=1"));
      }
    });
  } else {
    api.updatestudent({ name, rollnumber, class: classs, year }, req.user.id)
      .then(() => res.redirect("/user/profile/?success=1"));
  }
});

/* =========================
   DELETE USER
========================= */
router.get('/deleteUser', function (req, res) {
  var userID = req.user.id;
  req.logout();
  api.removeAllStudent(userID).then(() => res.redirect('/'));
});

/* =========================
   OTP REGISTRATION
========================= */
router.get('/otp/:role', function (req, res) {
  req.session.role = req.params.role;
  res.render('user/otpRegistration', { messages: [], hasErrors: false });
});

router.post('/otp/:role', function (req, res) {
  var messages = [];

  if (!validateEmail(req.body.email)) {
    messages.push("Please enter a valid email address");
    return res.render('user/otpRegistration', {
      messages,
      hasErrors: true
    });
  }

  userModel.findOne({ email: req.body.email }, function (err, user) {
    if (user) {
      messages.push("Email already in use! Enter another email");
      return res.render('user/otpRegistration', {
        messages,
        hasErrors: true
      });
    }

    var otp = generateOTP();
    req.session.otp = otp;
    req.session.verifiedEmail = req.body.email;

    var msg = `
      <h2>OTP for account verification</h2>
      <h1>${otp}</h1>
    `;

    new MailSender(req.body.email, "OTP Verification", msg).send();
    res.render('user/otp', { verifyEmail: req.body.email });
  });
});

/* =========================
   VERIFY OTP
========================= */
router.post('/verify/:role', function (req, res) {
  if (req.body.otp == req.session.otp) {
    if (req.session.role === "student")
      res.render('user/register', { filledformdata: { emailInput: req.session.verifiedEmail } });
    else
      res.render('user/teacher-register', { filledformdata: { emailInput: req.session.verifiedEmail } });
  } else {
    res.render('user/otp', { msg: 'Incorrect OTP' });
  }
});

/* =========================
   LOGIN
========================= */
router.get('/login', function (req, res) {
  res.render('user/login', { messages: [], hasErrors: false });
});

router.post('/login',
  passport.authenticate('local-login', {
    failureRedirect: '/user/login',
    failureFlash: true
  }),
  function (req, res) {
    res.redirect('/user/dashboard');
  }
);

/* =========================
   REGISTER
========================= */
router.post('/register/:role',
  passport.authenticate('local-register', {
    failureRedirect: '/user/register/:role',
    failureFlash: true
  }),
  function (req, res) {
    res.redirect('/user/dashboard');
  }
);

/* =========================
   LOGOUT
========================= */
router.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

/* =========================
   AUTH MIDDLEWARE
========================= */
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/user/login');
}

function notLoggedIn(req, res, next) {
  if (!req.isAuthenticated()) return next();
  res.redirect('/user/login');
}

/* =========================
   OTP + EMAIL HELPERS
========================= */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

module.exports = router;
