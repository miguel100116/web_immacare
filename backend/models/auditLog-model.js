// backend/models/auditLog-model.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // Who performed the action? Can be null for system actions.
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    },
    // For easy display without needing to populate every time
    actorName: {
        type: String,
        default: 'System'
    },
    // What was the action? Using an enum for consistency.
    action: {
        type: String,
        required: true,
        enum: [
            'USER_LOGIN',
            'USER_PROFILE_UPDATE',
            'USER_PROMOTED_TO_DOCTOR',
            'USER_DEMOTED_FROM_DOCTOR',
            'INVENTORY_ITEM_CREATED',
            'INVENTORY_ITEM_DELETED',
            'APPOINTMENT_STATUS_CHANGED',
            'APPOINTMENT_ARCHIVED',
            'APPOINTMENT_UNARCHIVED',
            'USER_ACCOUNT_CREATED',
            'INVENTORY_ITEM_UPDATED',
        ]
    },
    // A human-readable description of the event.
    details: {
        type: String,
        required: true
    },
    // Optional: If the action targeted a specific document
    target: {
        targetId: mongoose.Schema.Types.ObjectId,
        targetModel: String
    }
}, {
    timestamps: { createdAt: true, updatedAt: false } // We only care about when it was created.
});

// Create an index on the timestamp for fast date-based queries
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);