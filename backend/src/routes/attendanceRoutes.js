const express = require('express');
const router = express.Router();
const {
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  logAttendance,
  resetAttendance,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getAllAttendance);

router.route('/:id')
  .get(getAttendanceById)
  .put(updateAttendance);

router.post('/:id/log', logAttendance);
router.post('/:id/reset', resetAttendance);

module.exports = router;
