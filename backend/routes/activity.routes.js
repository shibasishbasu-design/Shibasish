const express = require('express');
const { list } = require('../controllers/activity.controller');

const router = express.Router();

router.get('/', list);

module.exports = router;
