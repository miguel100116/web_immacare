// backend/models/financialRecord-model.js
const mongoose = require('mongoose');

const financialRecordSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
        trim: true
    },
    price: { // Price per single item
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    description: {
        type: String,
        trim: true
    },
    purchaseDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    // To track who added the record
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    }
}, { timestamps: true });

// Create an index on the purchaseDate for fast date-based filtering
financialRecordSchema.index({ purchaseDate: -1 });

// A virtual property to calculate the total price for a record
financialRecordSchema.virtual('totalPrice').get(function() {
    return this.price * this.quantity;
});

// Ensure virtuals are included when converting to JSON
financialRecordSchema.set('toJSON', { virtuals: true });
financialRecordSchema.set('toObject', { virtuals: true });


module.exports = mongoose.model('FinancialRecord', financialRecordSchema);