// models/inventoryItem.model.js
const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    itemName: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    description: String,
    reorderLevel: { type: Number, default: 10 },
    isArchived: { type: Boolean, default: false } 
}, { timestamps: true });

// Virtual for status (calculated based on quantity and reorderLevel)
inventoryItemSchema.virtual('status').get(function() {
    if (this.quantity <= 0) {
        return 'Out of Stock';
    } else if (this.quantity <= this.reorderLevel) {
        return 'Low Stock';
    } else {
        return 'In Stock';
    }
});

// Ensure virtuals are included when converting to JSON
inventoryItemSchema.set('toJSON', { virtuals: true });
inventoryItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("InventoryItem", inventoryItemSchema, "inventory");