import pool from '../config/db.config'; // Adjust the path to your db connection

const inviteCodes = [
    { code: 'ADMIN-123', roleId: 1 },
    { code: 'TEACHER-456', roleId: 2 },
    { code: 'STUDENT-789', roleId: 3 },
];

export async function seedInviteCodes() {
    try {
        for (const invite of inviteCodes) {
            const res = await pool.query(
                `INSERT INTO invite_code (code, "roleId")
         VALUES ($1, $2)
         ON CONFLICT (code) DO NOTHING
         RETURNING *`,
                [invite.code, invite.roleId]
            );
            if (res.rows.length) {
                console.log(`Inserted invite code: ${invite.code}`);
            } else {
                console.log(`Invite code ${invite.code} already exists, skipped.`);
            }
        }
    } catch (error) {
        console.error('Error seeding invite codes:', error);
    }
}

seedInviteCodes();
