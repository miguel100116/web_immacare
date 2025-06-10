// routes/admin.routes.js
const express = require('express');
const Users = require('../models/user-model');
const Appointment = require('../models/appointment-model');
const InventoryItem = require('../models/inventoryItem-model');
const Doctor = require('../models/doctor-model');
const router = express.Router();
const Specialization = require('../models/specialization-model');
const { createLog } = require('../logService');
const AuditLog = require('../models/auditLog-model');
const bcrypt = require('bcrypt');
const FinancialRecord = require('../models/financialRecord-model');
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
        
        const adminUser = await Users.findById(req.session.user.id);
        if (!adminUser) {
            // This is a very unlikely edge case but good to have
            return res.status(403).json({ error: 'Admin performing the action could not be found.' });
        }
        
        // --- LOG INVENTORY CREATION ---
        const invCreateDetails = `Admin '${adminUser.fullname}' created new inventory item '${newItem.itemName}' with quantity ${newItem.quantity}.`;
        await createLog(req.session.user.id, 'INVENTORY_ITEM_CREATED', invCreateDetails);

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

        // --- LOG INVENTORY DELETION ---
        const invDeleteDetails = `Admin '${req.session.user.firstName}' deleted inventory item '${deletedItem.itemName}'.`;
        await createLog(req.session.user.id, 'INVENTORY_ITEM_DELETED', invDeleteDetails);


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
        select: 'firstName lastName suffix signupEmail' 
      })
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

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (user.isStaff) {
      return res.status(409).json({ error: 'Cannot promote a Staff member to Doctor. Demote from Staff first.' });
    }

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
      specialization: defaultSpec._id,
    });
    await newDoctor.save(); 

    user.isDoctor = true;
    await user.save();

    const adminUser = await Users.findById(req.session.user.id);
        if (!adminUser) {
            // This is a very unlikely edge case but good to have
            return res.status(403).json({ error: 'Admin performing the action could not be found.' });
        }
        const demoteDetails = `Admin '${adminUser.fullname}' promoted user '${user.fullname}' to Doctor.`;
        await createLog(req.session.user.id, 'USER_DEMOTED_FROM_DOCTOR', demoteDetails);

    console.log(`✅ User promoted to Doctor: ${user.firstName}`);
    res.status(200).json({ message: 'User successfully promoted to a doctor.' });
  } catch (error) {
    console.error('Error promoting user to doctor:', error);
    res.status(500).json({ error: 'Server error while promoting user.' });
  }
});


router.get('/audit-logs', async (req, res) => {
    try {
        console.log("➡️ [API] Received request for /api/admin/audit-logs");
        const { date } = req.query;
        let query = {};

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            query.createdAt = {
                $gte: startOfDay,
                $lt: endOfDay
            };
        }

        const logs = await AuditLog.find(query).sort({ createdAt: -1 });
        res.json(logs);

    } catch (error) {
        console.error("Error fetching audit logs:", error);
        res.status(500).json({ error: 'Server error fetching audit logs.' });
    }
});

router.post('/users/:userId/toggle-staff', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await Users.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isPromotingToStaff = !user.isStaff;
        if (isPromotingToStaff && user.isDoctor) {
            return res.status(409).json({ error: 'Cannot make a Doctor a Staff member. Demote from Doctor first.' });
        }
        
        // Toggle the staff status
        user.isStaff = !user.isStaff;
        await user.save();

        // Log the action
        const adminUser = await Users.findById(req.session.user.id);
        const action = user.isStaff ? 'promoted' : 'demoted';
        const logDetails = `Admin '${adminUser.fullname}' ${action} user '${user.fullname}' ${user.isStaff ? 'to' : 'from'} Staff.`;
        
        // We can reuse the doctor promotion/demotion action types for simplicity or create new ones.
        // For now, let's keep it simple. If you need more specific logging, you can add new enums.
        await createLog(req.session.user.id, 'USER_PROFILE_UPDATE', logDetails);

        res.json({
            message: `User successfully ${action} ${user.isStaff ? 'to' : 'from'} Staff.`,
            user: user
        });

    } catch (error) {
        console.error('Error toggling staff status:', error);
        res.status(500).json({ error: 'Server error while toggling staff status.' });
    }
});

router.post('/create-doctor', async (req, res) => {
    try {
        const { firstName, lastName, suffix, signupEmail } = req.body;

        if (!firstName || !lastName || !signupEmail) {
            return res.status(400).json({ error: "First name, last name, and email are required." });
        }
        if (await Users.findOne({ signupEmail })) {
            return res.status(409).json({ error: "Email is already registered." });
        }

        const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/gi, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/gi, '');
        const currentYear = new Date().getFullYear();
        const defaultPassword = `${cleanFirstName}${cleanLastName}ImmaCare!${currentYear}`;
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

        const newUser = new Users({
            firstName, lastName, suffix, signupEmail,
            signupPassword: hashedPassword,
            isVerified: true,
            isDoctor: true,
        });
        await newUser.save();
        
        let defaultSpec = await Specialization.findOne({ name: 'Not Specified' });
        if (!defaultSpec) {
            defaultSpec = await Specialization.findById('6843ea4f218f1f7d99b0814e');
        }
        if (!defaultSpec) {
            const criticalError = 'Default specialization could not be found. Cannot create doctor profile.';
            console.error(`CRITICAL ERROR: ${criticalError}`);
            return res.status(500).json({ error: `Server Configuration Error: ${criticalError}` });
        }
        
        const newDoctorProfile = new Doctor({
            userAccount: newUser._id,
            specialization: defaultSpec._id,
        });
        await newDoctorProfile.save();

        // --- FINALIZED LOGGING LOGIC ---
        const adminUser = await Users.findById(req.session.user.id);

        if (!adminUser) {
            console.error(`CRITICAL: Admin user with ID ${req.session.user.id} not found for logging action.`);
            const logDetails = `New doctor account created for '${newUser.fullname}'. (Admin actor not found for full log details).`;
            // Log as a system action, using the correct enum value
            await createLog(null, 'USER_ACCOUNT_CREATED', logDetails);
        } else {
            const logDetails = `Admin '${adminUser.fullname}' created new doctor account for '${newUser.fullname}'.`;
            // Use the correct, now-valid enum value
            await createLog(req.session.user.id, 'USER_ACCOUNT_CREATED', logDetails);
        }
        console.log(`CURRENT YEAR: ${currentYear}`)
        console.log(`✅ Admin created new doctor: ${newUser.fullname} (User ID: ${newUser._id})`);
        
        res.status(201).json({ 
            message: 'Doctor account created successfully.',
            defaultPassword: defaultPassword
        });

    } catch (error) {
        // This will now correctly report a validation error if the enum is wrong.
        console.error('Error in /api/admin/create-doctor:', error);
        res.status(500).json({ error: 'Server error while creating doctor account.' });
    }
});

router.get('/staff', async (req, res) => {
   try {
    // Find users who are marked as staff but are NOT doctors or admins
    const staffMembers = await Users.find({
      isStaff: true,
      isDoctor: { $ne: true },
      isAdmin: { $ne: true }
    }, '-signupPassword') // Exclude password from the result
    .sort({ lastName: 1, firstName: 1 });

    res.json(staffMembers);
  } catch (error) {
    console.error('Error fetching staff for admin panel:', error);
    res.status(500).json({ error: 'Server error fetching staff members.' });
  }
});

router.post('/create-staff', async (req, res) => {
    try {
        const { firstName, lastName, suffix, signupEmail } = req.body;

        if (!firstName || !lastName || !signupEmail) {
            return res.status(400).json({ error: "First name, last name, and email are required." });
        }
        if (await Users.findOne({ signupEmail })) {
            return res.status(409).json({ error: "Email is already registered." });
        }

        // --- AUTOMATIC PASSWORD GENERATION (same logic as doctors) ---
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/gi, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/gi, '');
        const currentYear = new Date().getFullYear();
        const defaultPassword = `${cleanFirstName}${cleanLastName}ImmaCare!${currentYear}`;
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

        // --- Create the User account with isStaff: true ---
        const newUser = new Users({
            firstName,
            lastName,
            suffix,
            signupEmail,
            signupPassword: hashedPassword,
            isVerified: true, // Admin-created accounts are auto-verified
            isStaff: true,    // Mark them as a staff member
        });
        await newUser.save();

        // --- Log the Action ---
        const adminUser = await Users.findById(req.session.user.id);
        const logDetails = `Admin '${adminUser ? adminUser.fullname : 'System'}' created new staff account for '${newUser.fullname}'.`;
        // Use the correct, now-valid enum value
        await createLog(adminUser ? adminUser._id : null, 'USER_ACCOUNT_CREATED', logDetails);

        console.log(`✅ Admin created new staff member: ${newUser.fullname} (User ID: ${newUser._id})`);
        
        // --- Send the generated password back to the admin ---
        res.status(201).json({ 
            message: 'Staff account created successfully.',
            defaultPassword: defaultPassword 
        });

    } catch (error) {
        console.error('Error in /api/admin/create-staff:', error);
        res.status(500).json({ error: 'Server error while creating staff account.' });
    }
});

router.get('/financials', async (req, res) => {
    try {
        const { month } = req.query; // Expecting month in "YYYY-MM" format

        if (!month) {
            return res.status(400).json({ error: 'Month query parameter (YYYY-MM) is required.' });
        }

        const year = parseInt(month.split('-')[0]);
        const monthIndex = parseInt(month.split('-')[1]) - 1; // JS months are 0-11

        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59); // Last day of the month

        const records = await FinancialRecord.find({
            purchaseDate: {
                $gte: startDate,
                $lte: endDate
            }
        })
        .populate('recordedBy', 'fullname') // Get the name of the staff who recorded it
        .sort({ purchaseDate: -1 });

        res.json(records);

    } catch (error) {
        console.error("Error fetching financial records:", error);
        res.status(500).json({ error: 'Server error while fetching records.' });
    }
});

// POST /api/admin/financials
// Creates a new financial record
router.post('/financials', async (req, res) => {
    try {
        const { itemName, price, quantity, description, purchaseDate } = req.body;

        if (!itemName || price === undefined || quantity === undefined) {
            return res.status(400).json({ error: 'Item name, price, and quantity are required.' });
        }

        const newRecord = new FinancialRecord({
            itemName,
            price,
            quantity,
            description,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
            recordedBy: req.session.user.id // From the logged-in admin's session
        });

        await newRecord.save();
        res.status(201).json(newRecord);

    } catch (error) {
        console.error("Error creating financial record:", error);
        res.status(500).json({ error: 'Server error while creating record.' });
    }
});

module.exports = router;
