const db = require('../../config/database');

class Room {
    static async getAll() {
        return await db.query('SELECT * FROM rooms ORDER BY room_name ASC');
    }

    static async getActive() {
        return await db.query('SELECT * FROM rooms WHERE status = "active" ORDER BY room_name ASC');
    }

    static async findById(id) {
        return await db.get('SELECT * FROM rooms WHERE id = ?', [id]);
    }

    static async getFeatures(roomId) {
        const sql = `
            SELECT rf.* FROM room_features rf
            JOIN room_feature_map rfm ON rf.id = rfm.feature_id
            WHERE rfm.room_id = ?
        `;
        return await db.query(sql, [roomId]);
    }

    static async create(name, location, floor, capacity, equipmentSummary, images = null, status = 'active') {
        const sql = `
            INSERT INTO rooms (room_name, location, floor, capacity, equipment_summary, images, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await db.run(sql, [name, location, floor, capacity, equipmentSummary, images, status]);
        return result.id;
    }

    static async update(id, name, location, floor, capacity, equipmentSummary, images, status) {
        const sql = `
            UPDATE rooms 
            SET room_name = ?, location = ?, floor = ?, capacity = ?, equipment_summary = ?, images = ?, status = ?
            WHERE id = ?
        `;
        return await db.run(sql, [name, location, floor, capacity, equipmentSummary, images, status, id]);
    }

    static async delete(id) {
        // Feature maps will be deleted via ON DELETE CASCADE in SQLite
        return await db.run('DELETE FROM rooms WHERE id = ?', [id]);
    }

    static async updateFeatures(roomId, featureIds) {
        // Clear existing features
        await db.run('DELETE FROM room_feature_map WHERE room_id = ?', [roomId]);
        // Insert new ones
        for (const featId of featureIds) {
            await db.run('INSERT INTO room_feature_map (room_id, feature_id) VALUES (?, ?)', [roomId, featId]);
        }
    }
}

module.exports = Room;
