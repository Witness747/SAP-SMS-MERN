const express = require('express');
const router = express.Router();
const {
  getTimetable,
  getTodayClasses,
  createEntry,
  updateEntry,
  deleteEntry,
} = require('../controllers/timetableController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/today', getTodayClasses);

router.route('/')
  .get(getTimetable)
  .post(createEntry);

router.route('/:id')
  .put(updateEntry)
  .delete(deleteEntry);

module.exports = router;
