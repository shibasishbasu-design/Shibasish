const express = require('express');
const { list, getOne, create, take, updateReward, updateArchitecture, complete } = require('../controllers/gigs.controller');

const router = express.Router();

router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.post('/:id/take', take);
router.patch('/:id/reward', updateReward);
router.patch('/:id/architecture', updateArchitecture);
router.post('/:id/complete', complete);

module.exports = router;
