const express = require('express');
const router = express.Router();
const {
  sendConnectionRequest,
  getConnections,
  getReceivedRequests,
  updateConnectionStatus,
} = require('../controllers/connectionController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, sendConnectionRequest)
  .get(protect, getConnections);

router.get('/received', protect, getReceivedRequests);
router.put('/:id', protect, updateConnectionStatus);

module.exports = router;
