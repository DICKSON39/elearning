// invite.service.ts
import { AppDataSource } from '../config/data-source';

export const validateInviteCode = async (code: string) => {
    const result = await AppDataSource.manager.query(
        `SELECT * FROM invite_code WHERE code = $1 AND is_used = false`,
        [code]
    );

    if (result.length === 0) {
        throw new Error('Invalid or used invite code');
    }

    return result[0]; // { id, code, roleId, isUsed }
};

export const markInviteCodeAsUsed = async (code: string) => {
    await AppDataSource.manager.query(
        `UPDATE invite_code SET is_used = true WHERE code = $1`,
        [code]
    );
};
