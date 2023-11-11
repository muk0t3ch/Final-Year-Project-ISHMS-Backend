


const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    studentID: {
        type: String,
        required: true,
        unique: true,
    },
    programOfStudy: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },
    medicalHistory: {
        type: String,
        required: true,
    },
    allergies: {
        type: String,
        required: true,
    },
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
