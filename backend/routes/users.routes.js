const express = require('express');
const { identify } = require('../controllers/users.controller');

const router = express.Router();

router.post('/identify', identify);

module.exports = router;
