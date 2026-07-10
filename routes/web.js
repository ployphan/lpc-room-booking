const express = require('express');
const router = express.Router();
const AuthController = require('../app/controllers/AuthController');
const BookingController = require('../app/controllers/BookingController');
const RoomController = require('../app/controllers/RoomController');
const ApprovalController = require('../app/controllers/ApprovalController');
const DashboardController = require('../app/controllers/DashboardController');
const UserController = require('../app/controllers/UserController');

const authMiddleware = require('../middleware/AuthMiddleware');
const roleMiddleware = require('../middleware/RoleMiddleware');

// Public Routes
router.get('/login', AuthController.getLogin);
router.post('/login', AuthController.postLogin);
router.get('/register', AuthController.getRegister);
router.post('/register', AuthController.postRegister);
router.get('/logout', AuthController.logout);

router.get('/', (req, res) => res.redirect('/dashboard'));
router.get('/dashboard', DashboardController.getDashboard);
router.get('/bookings/calendar', BookingController.getCalendar);

// Protected Routes (Require Login)
router.use(authMiddleware);

router.get('/bookings/new', BookingController.getNewForm);
router.get('/bookings/my', BookingController.getMyBookings);
router.get('/bookings/all', roleMiddleware(['admin', 'approver']), BookingController.getAllBookings);
router.get('/bookings/:id', BookingController.getDetail);
router.get('/bookings/:id/edit', roleMiddleware(['admin', 'approver']), BookingController.getEditForm);

router.get('/reports', DashboardController.getReports);
router.get('/settings', DashboardController.getSettings);

// Admin-Only Routes
router.get('/rooms', roleMiddleware(['admin']), RoomController.getRooms);
router.get('/users', roleMiddleware(['admin']), UserController.getUsers);

// Approver-Only Routes
router.get('/approvals/queue', roleMiddleware(['approver']), ApprovalController.getQueue);

module.exports = router;
