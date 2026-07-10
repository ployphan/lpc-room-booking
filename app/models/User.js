const db = require('../../config/database');

class User {
    static async findByEmail(email) {
        const sql = `
            SELECT u.*, (u.first_name || ' ' || u.last_name) AS full_name, r.role_name, d.department_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.email = ?
        `;
        return await db.get(sql, [email]);
    }

    static async findById(id) {
        const sql = `
            SELECT u.*, (u.first_name || ' ' || u.last_name) AS full_name, r.role_name, d.department_name 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
        `;
        return await db.get(sql, [id]);
    }

    static async getAll() {
        const sql = `
            SELECT u.id, u.first_name, u.last_name, (u.first_name || ' ' || u.last_name) AS full_name, 
                   u.email, u.phone, u.status, u.created_at,
                   r.role_name, d.department_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON u.department_id = d.id
            ORDER BY u.id DESC
        `;
        return await db.query(sql);
    }

    static async create(firstName, lastName, email, phone, passwordHash, roleId, departmentId) {
        const sql = `
            INSERT INTO users (first_name, last_name, email, phone, password_hash, role_id, department_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `;
        const result = await db.run(sql, [firstName, lastName, email, phone, passwordHash, roleId, departmentId]);
        return result.id;
    }

    static async updateStatus(id, status) {
        const sql = `UPDATE users SET status = ? WHERE id = ?`;
        return await db.run(sql, [status, id]);
    }

    static async updateRole(id, roleId) {
        const sql = `UPDATE users SET role_id = ? WHERE id = ?`;
        return await db.run(sql, [roleId, id]);
    }
}

module.exports = User;
