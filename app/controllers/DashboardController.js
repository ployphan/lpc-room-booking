const Report = require('../models/Report');
const Booking = require('../models/Booking');
const db = require('../../config/database');

const getLocalDateString = () => {
    const today = new Date();
    // Thailand is UTC+7
    const offset = today.getTimezoneOffset(); // in minutes
    // If server is already in UTC+7 (e.g. windows local), getTimezoneOffset() handles it.
    // To make sure it matches user local time, we can adjust:
    const utc = today.getTime() + (today.getTimezoneOffset() * 60000);
    const thTime = new Date(utc + (3600000 * 7));
    return thTime.toISOString().split('T')[0];
};

class DashboardController {
    // MVC View for Dashboard
    static async getDashboard(req, res) {
        try {
            const todayStr = getLocalDateString();
            const kpis = await Report.getDashboardKPIs(todayStr);

            // Fetch recent bookings
            const recentBookings = await db.query(`
                SELECT b.*, r.room_name, u.full_name as user_name 
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                JOIN users u ON b.user_id = u.id
                ORDER BY b.created_at DESC
                LIMIT 5
            `);

            // Fetch recent notifications for this user
            const notifications = await db.query(`
                SELECT * FROM notifications 
                WHERE user_id = ? 
                ORDER BY sent_at DESC 
                LIMIT 5
            `, [req.session.userId]);

            res.render('dashboard/index', { 
                kpis, 
                recentBookings, 
                notifications, 
                title: 'ภาพรวมระบบ - LPC Room Booking' 
            });
        } catch (err) {
            console.error('Error loading dashboard view:', err);
            res.status(500).send('Internal Server Error');
        }
    }

    // JSON API for dashboard charts
    static async apiGetStats(req, res) {
        try {
            const todayStr = getLocalDateString();
            
            // 1. KPIs
            const kpis = await Report.getDashboardKPIs(todayStr);

            // 2. Bar Chart Data (Bookings per Room)
            const roomBookings = await Report.getBookingsByRoom();
            const barChart = {
                labels: roomBookings.map(r => r.room_name.split(' ')[0]), // e.g. "Room A"
                data: roomBookings.map(r => r.count)
            };

            // 3. Donut Chart Data (Status distribution)
            const statusStats = await Report.getBookingStatusStats();
            const donutChart = {
                labels: ['อนุมัติแล้ว', 'รออนุมัติ', 'ปฏิเสธ', 'ยกเลิก'],
                data: [statusStats.approved, statusStats.pending, statusStats.rejected, statusStats.cancelled]
            };

            // 4. Line Chart Data (Weekly Trend - Last 7 Days)
            const end = new Date();
            const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000); // 7 days ago
            
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            const trendData = await Report.getWeeklyTrend(startStr, endStr);

            // Build full 7-day array
            const labels = [];
            const data = [];
            const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const curStr = d.toISOString().split('T')[0];
                const dayMatch = trendData.find(t => t.meeting_date === curStr);
                
                labels.push(dayNames[d.getDay()]);
                data.push(dayMatch ? dayMatch.count : 0);
            }

            const lineChart = {
                labels,
                data
            };

            res.json({
                status: 200,
                data: {
                    kpis,
                    barChart,
                    donutChart,
                    lineChart
                }
            });
        } catch (err) {
            console.error('Error fetching dashboard stats API:', err);
            res.status(500).json({ status: 500, message: 'Internal Server Error' });
        }
    }

    // MVC View for reports
    static getReports(req, res) {
        res.render('reports/index', { title: 'รายงานและสถิติ - LPC Room Booking' });
    }

    // MVC View for settings
    static getSettings(req, res) {
        res.render('settings/index', { title: 'ตั้งค่าระบบ - LPC Room Booking' });
    }
}

module.exports = DashboardController;
