// backend/services/logService.js
const AuditLog = require('./models/auditLog-model');
const Users = require('./models/user-model');

const createLog = async (actorId, action, details) => {
    try {
        let actorName = 'System';
        if (actorId) {
            const actor = await Users.findById(actorId).select('signupEmail');
            if (actor) {
                actorName = actor.signupEmail;
            }
        }

        await AuditLog.create({
            actor: actorId,
            actorName: actorName,
            action: action,
            details: details
        });
    } catch (error) {
        // We log the error but don't throw it, so a logging failure
        // doesn't crash the primary application function.
        console.error('CRITICAL: Failed to create audit log.', {
            actorId,
            action,
            details,
            error
        });
    }
};

module.exports = { createLog };