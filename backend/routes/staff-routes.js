// backend/routes/staff-routes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Import mongoose to use its ObjectId
const Users = require('../models/user-model');
const PatientRecord = require('../models/patientRecord-model');
const Appointment = require('../models/appointment-model');
const Doctor = require('../models/doctor-model');
const FinancialRecord = require('../models/financialRecord-model');

/**
 * @route   GET /api/staff/patients
 * @desc    Get a list of all patients with their last visit date included.
 * @access  Staff
 */
router.get('/patients', async (req, res) => {
    try {
        console.log("Fetching patient list using aggregation...");

        const patients = await Users.aggregate([
            // Stage 1: Filter for patients (Correct)
            {
                $match: {
                    isAdmin: { $ne: true },
                    isDoctor: { $ne: true },
                    isStaff: { $ne: true }
                }
            },
            // Stage 2: Join with appointments (Correct)
            {
                $lookup: {
                    from: 'appointments',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'patientAppointments'
                }
            },
            
            // --- THIS IS THE FIX ---
            // Stage 3: Add a new field to each appointment with a proper Date type
            {
                $addFields: {
                    patientAppointments: {
                        $map: {
                            input: "$patientAppointments",
                            as: "appt",
                            in: {
                                $mergeObjects: [
                                    "$$appt",
                                    { "convertedDate": { $toDate: "$$appt.date" } }
                                ]
                            }
                        }
                    }
                }
            },
            // --- END OF FIX ---

            // Stage 4: Reshape the data using the new convertedDate field
            {
                $project: {
                    firstName: 1,
                    lastName: 1,
                    suffix: 1,
                    signupEmail: 1,
                    PhoneNumber: 1,
                    lastVisit: {
                        // Find the maximum from the new convertedDate field
                        $max: "$patientAppointments.convertedDate" 
                    }
                }
            }
        ]);

        // Format the data for the frontend (This part is now more reliable)
        const formattedPatients = patients.map(p => {
            let fullname = `${p.firstName || ''} ${p.lastName || ''}`;
            if (p.suffix) {
                fullname += ` ${p.suffix}`;
            }

            return {
                _id: p._id,
                fullname: fullname.trim(),
                signupEmail: p.signupEmail,
                PhoneNumber: p.PhoneNumber,
                // The result from the DB is already a Date object or null
                lastVisit: p.lastVisit 
            };
        });

        console.log(`Aggregation found ${formattedPatients.length} patients.`);
        res.json(formattedPatients);

    } catch (error) {
        console.error("Error fetching patient list for staff:", error);
        res.status(500).json({ error: 'Server error while fetching patients.' });
    }
});

/**
 * @route   GET /api/staff/patient-record/:userId
 * @desc    Get a single patient's record, or create one if it doesn't exist
 * @access  Staff
 */
router.get('/patient-record/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
             return res.status(400).json({ error: 'Invalid user ID.' });
        }
        
        let record = await PatientRecord.findOne({ user: userId })
            .populate('user', 'firstName lastName suffix signupEmail Age Sex PhoneNumber Address') // <-- SELECT REAL FIELDS
            .sort({ 'consultationHistory.consultationDate': -1 });
        if (!record) {
            console.log(`No patient record found for user ${userId}. Creating one.`);
            const userExists = await Users.findById(userId);
            if (!userExists) {
                return res.status(404).json({ error: 'User not found.' });
            }
            record = new PatientRecord({ user: userId });
            await record.save();
            await record.populate('user', 'firstName lastName suffix signupEmail Age Sex PhoneNumber Address');
        }
        res.json(record);
    } catch (error) {
        console.error("Error fetching patient record:", error);
        res.status(500).json({ error: 'Server error fetching patient record.' });
    }
});

/**
 * @route   POST /api/staff/patient-record/:recordId/consultation
 * @desc    Add a new consultation note to a patient's record
 * @access  Staff
 */
router.post('/patient-record/:recordId/consultation', async (req, res) => {
    try {
        const { recordId } = req.params;
        const { attendingDoctor, complaint, diagnosis, treatmentPlan, notes } = req.body;

        if (!attendingDoctor || !complaint || !diagnosis) {
            return res.status(400).json({ error: 'Doctor, complaint, and diagnosis are required.' });
        }

        const record = await PatientRecord.findById(recordId);
        if (!record) {
            return res.status(404).json({ error: 'Patient record not found.' });
        }

        const newConsultation = {
            attendingDoctor,
            complaint,
            diagnosis,
            treatmentPlan,
            notes
        };
        record.consultationHistory.unshift(newConsultation);
        await record.save();

        res.status(201).json(record);
    } catch (error) {
        console.error("Error adding consultation:", error);
        res.status(500).json({ error: 'Server error adding consultation.' });
    }
});

router.get('/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find({ isActive: true })
            .populate('userAccount', 'firstName lastName suffix')
            .sort({ 'userAccount.firstName': 1, 'userAccount.lastName': 1 });

        // --- THIS IS THE FIX ---
        // Filter out any doctors whose userAccount could not be populated (is null).
        const doctorList = doctors
            .filter(doc => doc.userAccount !== null) // Keep only doctors with a valid user account
            .map(doc => {
                // Now we can safely access userAccount properties
                let fullname = `${doc.userAccount.firstName} ${doc.userAccount.lastName }`;
                if (doc.userAccount.suffix) {
                    fullname += ` ${doc.userAccount.suffix}`;
                }

                return {
                    _id: doc._id,
                    fullname: `Dr. ${fullname.trim()}`
                };
            });
        // --- END OF FIX ---

        res.json(doctorList);
    } catch (error) {
        console.error("Error fetching doctor list for staff:", error);
        res.status(500).json({ error: 'Server error while fetching doctors.' });
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

// POST /api/staff/financials
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
            recordedBy: req.session.user.id // From the logged-in staff's session
        });

        await newRecord.save();
        res.status(201).json(newRecord);

    } catch (error) {
        console.error("Error creating financial record:", error);
        res.status(500).json({ error: 'Server error while creating record.' });
    }
});

module.exports = router;