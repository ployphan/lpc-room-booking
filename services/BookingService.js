const db = require('../config/database');

class BookingService {
    /**
     * Check if a room is available for the given date and time range
     * @param {number} roomId 
     * @param {string} date YYYY-MM-DD
     * @param {string} startTime HH:MM
     * @param {string} endTime HH:MM
     * @param {number|null} excludeBookingId 
     * @returns {Promise<boolean>}
     */
    static async isRoomAvailable(roomId, date, startTime, endTime, excludeBookingId = null) {
        let sql = `
            SELECT COUNT(*) as count FROM bookings
            WHERE room_id = ?
              AND meeting_date = ?
              AND booking_status != 'cancelled'
              AND approval_status != 'rejected'
              AND (
                  (start_time < ? AND end_time > ?)
              )
        `;
        const params = [roomId, date, endTime, startTime];

        if (excludeBookingId) {
            sql += ` AND id != ?`;
            params.push(excludeBookingId);
        }

        const result = await db.get(sql, params);
        return result.count === 0;
    }

    /**
     * Logs an action in the system audit log
     * @param {number|null} userId 
     * @param {string} module 
     * @param {string} action 
     * @param {string} referenceId 
     * @param {string} ipAddress 
     */
    static async logAudit(userId, module, action, referenceId, ipAddress = '127.0.0.1') {
        const sql = `
            INSERT INTO audit_logs (user_id, module, action, reference_id, ip_address)
            VALUES (?, ?, ?, ?, ?)
        `;
        await db.run(sql, [userId, module, action, referenceId, ipAddress]);
    }
}

module.exports = BookingService;
