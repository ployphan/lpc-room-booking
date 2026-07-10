const express = require('express');
const router = express.Router();
const BookingController = require('../app/controllers/BookingController');
const RoomController = require('../app/controllers/RoomController');
const ApprovalController = require('../app/controllers/ApprovalController');
const DashboardController = require('../app/controllers/DashboardController');
const UserController = require('../app/controllers/UserController');

const authMiddleware = require('../middleware/AuthMiddleware');
const roleMiddleware = require('../middleware/RoleMiddleware');

// Public APIs (No authentication required)
router.get('/rooms', RoomController.apiGetRooms);
router.get('/bookings', BookingController.apiGetBookings);
router.get('/dashboard/stats', DashboardController.apiGetStats);

// All following API routes require authentication
router.use(authMiddleware);

// Rooms Management
router.get('/rooms/available', BookingController.apiGetAvailableRooms);
router.post('/rooms', roleMiddleware(['admin']), RoomController.apiPostCreate);
router.put('/rooms/:id', roleMiddleware(['admin']), RoomController.apiPostUpdate);
router.delete('/rooms/:id', roleMiddleware(['admin']), RoomController.apiDelete);

// Bookings Management
router.post('/bookings', BookingController.apiPostBooking);
router.get('/bookings/my', async (req, res) => {
    try {
        const BookingModel = require('../app/models/Booking');
        const data = await BookingModel.getByUserId(req.session.userId);
        res.json({ status: 200, data });
    } catch (e) {
        res.status(500).json({ status: 500, message: e.message });
    }
});
router.get('/bookings/:id', BookingController.apiGetDetail);
router.put('/bookings/:id', roleMiddleware(['admin', 'approver']), BookingController.apiPutBooking);
router.post('/bookings/:id/cancel', BookingController.apiCancelBooking);

// Approvals (Admin & Approver)
router.post('/bookings/:id/approve', roleMiddleware(['admin', 'approver']), ApprovalController.apiPostApprove);
router.post('/bookings/:id/reject', roleMiddleware(['admin', 'approver']), ApprovalController.apiPostReject);
router.post('/bookings/:id/reset-approval', roleMiddleware(['admin', 'approver']), ApprovalController.apiPostResetApproval);

// Dashboard & Reports
router.get('/reports/usage', async (req, res) => {
    // Return booking summary reports
    try {
        const db = require('../config/database');
        const usage = await db.query(`
            SELECT r.room_name, 
                   COUNT(b.id) as total_bookings,
                   SUM(CASE WHEN b.approval_status = 'approved' THEN 1 ELSE 0 END) as approved_bookings,
                   SUM(b.attendee_count) as total_attendees
            FROM rooms r
            LEFT JOIN bookings b ON r.id = b.room_id
            GROUP BY r.id
        `);
        res.json({ status: 200, data: usage });
    } catch (e) {
        res.status(500).json({ status: 500, message: e.message });
    }
});

// Users Management (Admin Only)
router.get('/users', roleMiddleware(['admin']), UserController.apiGetUsers);
router.post('/users', roleMiddleware(['admin']), UserController.apiCreateUser);
router.put('/users/:id', roleMiddleware(['admin']), UserController.apiUpdateUser);
router.delete('/users/:id', roleMiddleware(['admin']), UserController.apiDeleteUser);

module.exports = router;
