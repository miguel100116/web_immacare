// routes/admin.routes.js
const express = require('express');
const Users = require('../models/user-model');
const Appointment = require('../models/appointment-model');
const InventoryItem = require('../models/inventoryItem-model');
const Doctor = require('../models/doctor-model');
const router = express.Router();
const Specialization = require('../models/specialization-model');
// NOTE: The `ensureAdmin` middleware will be applied in server.js for this whole router.

// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const allUsers = await Users.find({}, '-signupPassword');
        res.json(allUsers);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/admin/appointments
router.get('/appointments', async (req, res) => {
   try {
    const showArchived = req.query.archived === 'true'; // Check for query parameter

    let query = {};
    if (showArchived) {
      query.isArchived = true;
      console.log('SERVER: GET /api/admin/appointments - Fetching ARCHIVED appointments.');
    } else {
      // Fetch where isArchived is false OR isArchived does not exist (for older data)
      query.$or = [{ isArchived: false }, { isArchived: { $exists: false } }];
      console.log('SERVER: GET /api/admin/appointments - Fetching NON-ARCHIVED (active) appointments.');
    }

    const allAppointments = await Appointment.find(query)
      .sort({
        status: 1, // Sort by status first
        date: 1,   // Then by date
        time: 1    // Then by time
      });
    console.log(`SERVER: Found ${allAppointments.length} appointments matching query.`);
    res.json(allAppointments);
  } catch (err) {
    console.error("SERVER ERROR in GET /api/admin/appointments:", err);
    res.status(500).json({ error: 'Server error fetching appointments' });
  }
});

// POST /api/admin/appointments
router.post('/appointments', async (req, res) => {
    try {
        const {
            patientName, patientEmail, doctorName, specialization, date, time,
            reason, address, age, phone, status // status can be set by admin
        } = req.body;

        // Add more validation as needed
        if (!patientName || !doctorName || !date || !time || !status) {
            return res.status(400).json({ error: 'Missing required fields for new appointment.' });
        }

        // === START: Double Booking Check ===
        const existingAppointment = await Appointment.findOne({
          doctorName: doctorName,
          date: date,
          time: time,
          status: { $ne: 'Cancelled' } // Only consider Scheduled or Completed appointments
        });

        if (existingAppointment) {
          console.warn(`ADMIN WARN: Double booking attempt for Dr. ${doctorName} at ${date} ${time}`);
          return res.status(409).json({ error: `Dr. ${doctorName} is already booked at ${time} on ${date}. Please choose a different time or date.` }); // 409 Conflict
        }
        // === END: Double Booking Check ===

        const newAppointment = new Appointment({
            patientName, patientEmail, doctorName, specialization, date, time,
            reason, address, age, phone, status
            // userId can be tricky for admin-created appointments unless admin selects a user.
            // For now, it might be null or linked to the admin if necessary.
        });
        await newAppointment.save();
        console.log('✅ New appointment created by admin:', newAppointment._id);
        res.status(201).json(newAppointment);
    } catch (err) {
        console.error('Error creating new appointment by admin:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error creating appointment.' });
    }
});

// PUT /api/admin/appointments/:id/status
router.put('/appointments/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const appointmentId = req.params.id;

        if (!status || !['Scheduled', 'Completed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value provided.' });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            appointmentId,
            { status: status },
            { new: true, runValidators: true } // Return the updated document, run schema validators
        );

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }
        console.log(`✅ Appointment ${appointmentId} status updated to ${status}`);
        res.json(appointment);
    } catch (err) {
        console.error(`Error updating appointment ${req.params.id} status:`, err);
        res.status(500).json({ error: 'Server error updating appointment status.' });
    }
});

// PUT /api/admin/appointments/:id/archive
router.put('/appointments/:id/archive', async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        appointment.isArchived = !appointment.isArchived; // Toggle the archive status
        await appointment.save();

        console.log(`✅ Appointment ${appointmentId} archived status set to ${appointment.isArchived}`);
        res.json({ message: `Appointment ${appointment.isArchived ? 'archived' : 'unarchived'} successfully.`, appointment });
    } catch (err) {
        console.error(`Error archiving/unarchiving appointment ${req.params.id}:`, err);
        res.status(500).json({ error: 'Server error toggling appointment archive status.' });
    }
});

// --- INVENTORY ADMIN ROUTES ---

// GET /api/admin/inventory
router.get('/inventory', async (req, res) => {
    try {
    console.log('SERVER: GET /api/admin/inventory - Request received.');
    const allItems = await InventoryItem.find({}); // Fetch all items for now

    // Sort in JavaScript to achieve the custom status order
    // because virtual fields can't be directly sorted in MongoDB find queries easily.
    const customSortOrder = { 'Out of Stock': 1, 'Low Stock': 2, 'In Stock': 3 };
    allItems.sort((a, b) => {
        const statusOrderA = customSortOrder[a.status] || 4; // a.status is the virtual
        const statusOrderB = customSortOrder[b.status] || 4; // b.status is the virtual
        if (statusOrderA !== statusOrderB) {
            return statusOrderA - statusOrderB;
        }
        return a.itemName.localeCompare(b.itemName); // Secondary sort by name
    });

    console.log(`SERVER: Found ${allItems.length} inventory items.`);
    res.json(allItems);
  } catch (err) {
    console.error("SERVER ERROR in GET /api/admin/inventory:", err);
    res.status(500).json({ error: 'Server error fetching inventory items' });
  }
});

// POST /api/admin/inventory
router.post('/inventory', async (req, res) => {
    try {
        const { itemName, quantity, description, reorderLevel /*, other fields */ } = req.body;

        if (!itemName || quantity === undefined) { // quantity can be 0
            return res.status(400).json({ error: 'Item name and quantity are required.' });
        }
        if (await InventoryItem.findOne({ itemName })) {
             return res.status(400).json({ error: `Inventory item "${itemName}" already exists.` });
        }

        const newItem = new InventoryItem({
            itemName,
            quantity,
            description,
            reorderLevel: reorderLevel !== undefined ? reorderLevel : 10 // Use provided or default
            // ... other fields
        });
        await newItem.save();
        console.log('✅ New inventory item created by admin:', newItem._id);
        res.status(201).json(newItem);
    } catch (err) {
        console.error('Error creating new inventory item by admin:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error creating inventory item.' });
    }
});

// DELETE /api/admin/inventory/:id
router.delete('/inventory/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const deletedItem = await InventoryItem.findByIdAndDelete(itemId);

        if (!deletedItem) {
            return res.status(404).json({ error: 'Inventory item not found.' });
        }
        console.log(`✅ Inventory item ${itemId} deleted successfully.`);
        res.json({ message: 'Inventory item deleted successfully.', deletedItem });
    } catch (err) {
        console.error(`Error deleting inventory item ${req.params.id}:`, err);
        res.status(500).json({ error: 'Server error deleting inventory item.' });
    }
});

router.get('/doctors', async (req, res) => {
   try {
    const doctors = await Doctor.find({})
      .populate({
        path: 'userAccount',
        select: 'fullname signupEmail'
      })
      // --- CHANGE 1: Populate the specialization's name ---
      .populate({
        path: 'specialization',
        select: 'name' 
      })
      .sort({ createdAt: -1 });

    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors for admin panel:', error);
    res.status(500).json({ error: 'Server error fetching doctors.' });
  }
});

router.post('/users/:userId/promote', async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Check if the user exists
    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // 2. Check if a doctor profile already exists for this user
    if (user.isDoctor) {
      const existingDoctor = await Doctor.findOne({ userAccount: userId });
      if (existingDoctor) {
        return res.status(409).json({ error: 'This user already has a doctor profile.' });
      }
    }
    
    let defaultSpec = await Specialization.findOne({ name: 'Not Specified' });
    if (!defaultSpec) {
      console.warn("WARN: Could not find default specialization by name. Trying fallback lookup by ID.");
      defaultSpec = await Specialization.findById('6843ea4f218f1f7d99b0814e');
    }

    if (!defaultSpec) {
      const criticalError = 'Default specialization could not be found by name OR by hardcoded ID. Please check the "specializations" collection in the database.';
      console.error(`CRITICAL ERROR: ${criticalError}`);
      return res.status(500).json({ error: `Server Configuration Error: ${criticalError}` });
    }

    const newDoctor = new Doctor({
      userAccount: userId,
      specialization: defaultSpec._id, // Use the ID of the specialization
    });
    await newDoctor.save(); 

    user.isDoctor = true;
    await user.save();

    console.log(`✅ User promoted to Doctor: ${user.fullname}`);
    res.status(200).json({ message: 'User successfully promoted to a doctor.' });
  } catch (error) {
    console.error('Error promoting user to doctor:', error);
    res.status(500).json({ error: 'Server error while promoting user.' });
  }
});

router.delete('/doctors/:doctorId/demote', async (req, res) => {
    try {
        const { doctorId } = req.params;

        // 1. Find the Doctor profile to get the linked user's ID
        const doctorProfile = await Doctor.findById(doctorId);
        if (!doctorProfile) {
            return res.status(404).json({ error: 'Doctor profile not found.' });
        }
        
        const userId = doctorProfile.userAccount;

        // 2. Delete the Doctor profile document
        // This removes their specialization, schedules, etc.
        await Doctor.findByIdAndDelete(doctorId);

        // 3. Find the associated User and update their status
        //    THIS IS THE CRUCIAL STEP YOU ASKED ABOUT.
        await Users.findByIdAndUpdate(userId, { isDoctor: false });

        console.log(`✅ Doctor profile removed and user demoted for user ID: ${userId}`);
        res.status(200).json({ message: 'Doctor status successfully removed.' });

    } catch (error) {
        console.error('Error demoting doctor:', error);
        res.status(500).json({ error: 'Server error while demoting doctor.' });
    }
});


module.exports = router;