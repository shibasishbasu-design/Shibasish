const express = require('express');
const { list, getOne, create, take, updateReward, updateArchitecture, complete, releasePayment, remove } = require('../controllers/gigs.controller');

const router = express.Router();

router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.post('/:id/take', take);
router.patch('/:id/reward', updateReward);
router.patch('/:id/architecture', updateArchitecture);
router.post('/:id/complete', complete);
router.post('/:id/release-payment', releasePayment);
router.delete('/:id', remove);

module.exports = router;
