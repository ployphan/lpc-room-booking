const db = require('../config/database');

class NotificationService {
    /**
     * Send notification to a user
     * @param {number} userId 
     * @param {number|null} bookingId 
     * @param {string} channel 'email' | 'line' | 'in-app'
     * @param {string} message 
     */
    static async notify(userId, bookingId, channel, message) {
        const sql = `
            INSERT INTO notifications (user_id, booking_id, channel, message, status)
            VALUES (?, ?, ?, ?, 'unread')
        `;
        await db.run(sql, [userId, bookingId, channel, message]);

        // In a real system, you would trigger the actual email / LINE API here.
        console.log(`[Notification] Channel: ${channel} | User: ${userId} | Booking: ${bookingId} | Message: ${message}`);
    }

    /**
     * Notify all users with a specific role (e.g. notify all approvers about a new booking)
     * @param {string} roleName 
     * @param {number|null} bookingId 
     * @param {string} message 
     */
    static async notifyRole(roleName, bookingId, message) {
        const users = await db.query(`
            SELECT u.id FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.role_name = ? AND u.status = 'active'
        `, [roleName]);

        for (const user of users) {
            await this.notify(user.id, bookingId, 'in-app', message);
            await this.notify(user.id, bookingId, 'email', message); // Simulated email
        }
    }
}

module.exports = NotificationService;
