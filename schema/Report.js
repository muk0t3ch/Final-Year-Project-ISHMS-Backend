
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    info: {
        type: String,
        required: true,
        unique: true,
    },
    prescriptionPath: {
        type: String,
        required: true,
    },
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;