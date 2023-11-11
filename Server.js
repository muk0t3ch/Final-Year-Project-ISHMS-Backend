const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const mongoose = require('mongoose');
const Student = require('./schema/Student');
const multer = require('multer');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const nodemailer = require('nodemailer');
const path = require('path');
const Admin = require('./schema/Admin');
const Report = require('./schema/Report');




const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**************DATABASE CONNECTION******************/

const mongoDBConnection = 'mongodb+srv://6upe:6upe123@zut-medical.644kyyh.mongodb.net/zut-medical-db';
const connectWithRetry = () => {
  console.log('Connecting to the database...');
  mongoose
    .connect(mongoDBConnection, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log('Connected to MongoDB');
      const port = 2010;
      app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    })
    .catch((error) => {
      console.error('Error connecting to MongoDB:', error);
      console.log('Retrying in 5 seconds...');
      setTimeout(connectWithRetry, 1000); // Retry after 5 seconds
    });
};
/************** END DATABASE CONNECTION ******************/

// Call the connectWithRetry function to initiate the connection and retries
connectWithRetry();

/************************* NODE MAILER ***************************/

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'mukwanjegiven@gmail.com',
    pass: 'waax jyao vgsc ggex', // Use an app-specific password or store this securely
  },
});

/*************************END of  NODE MAILER ***************************/





/************************* Route ***************************/

app.get('/', (req, res) => {
  res.send('Hello from the server');
});

app.post('/register', async (req, res) => {
  try {
    const { fullName, studentID, programOfStudy, gender, medicalHistory, allergies } = req.body;

    if (fullName && studentID && programOfStudy && gender && medicalHistory && allergies) {
      const student = new Student({
        fullName,
        studentID,
        programOfStudy,
        gender,
        medicalHistory,
        allergies,
      });

      await student.save();

      res.status(200).json({ message: 'Student registered successfully' });
    } else {
      res.status(400).json({ message: 'Missing required fields' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error registering student' });
  }
});

/************************* Route ***************************/





/************************ SENDING EMAIL ****************************/

app.post('/sendEmail', upload.single('file'), async (req, res) => {

  const { to, subject, text, html } = req.body;
  console.log('sending email from the server to: ', to);
  console.log('uploaded html', html);

  const pdfFile = req.file;
  const pdfFilePath = pdfFile.path;

  let info = html;
  let prescriptionPath = pdfFilePath;

  try {
    fs.writeFileSync(pdfFilePath, JSON.stringify(pdfFile.buffer));

  } catch (error) {
    console.log('Writing File Error: ', error);
    // res.status(500).json({ error: 'Failed to upload the file' });
  } finally {
    // Setup email data with provided values
    const mailOptions = {
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: pdfFile.originalname,
          path: pdfFilePath,
        }

      ]
    }

    try {
      // Send the email
      await transporter.sendMail(mailOptions);
      res.json({ message: 'email sent!' });
      console.log('email sent!');

      const report = new Report({
        info,
        prescriptionPath,
      });

      await report.save();

      console.log('Report Saved!');

    } catch (error) {
      console.log('Error:', error);
      res.json({ message: error });
    }
  }
});

/************************ END of SENDING EMAIL ****************************/


/************************* Route to handle the POST request ***************************/

app.post('/signup', async (req, res) => {
  try {
    // Assuming the request body contains the data you want to save to the Admin collection
    const adminData = req.body;

    // Create a new Admin document and save it to the collection
    try {
      const admin = new Admin(adminData);
      await admin.save();
      res.status(201).json({ message: 'Admin created successfully', status: 'success'});

    } catch (error) {
      console.log('Error Saving Data: ', error);
    }

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
/************************* End of Route to handle the POST request ***************************/




app.post('/student-data', async (req, res) => {
  try {
    // Assuming the request body contains the data you want to save to the Admin collection
    const { sid } = req.body;
    console.log('fetching Student Data (Sereverside): ', sid);
    // Find the student with the given SID
    const student = await Student.findOne({ 'studentID': sid });

    if (student) {
      // If a student is found, send it as JSON to the client
      res.json({student});
      console.log('Student Found!', student);
    } else {
      // If no student is found, send an appropriate response
      console.log('Student not found');
      res.json({ message: 'Student not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});




app.post('/login', async (req, res) => {
  console.log('Authenticating form the server side: ', req.body);
  try {
    const loginData = req.body;
    const admin = await Admin.findOne({ 'email': loginData.email });

    if (admin) {
      // Authentication successful

      const isPasswordCorrect = await admin.comparePassword(loginData.password);

      if(isPasswordCorrect){
        res.status(200).json({ message: 'Admin Login Success!'});
      }else{
        res.status(401).json({ message: 'Incorrect Password'});
      }

    } else {
      // Authentication failed
      res.status(401).json({ message: 'admin email not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/get-reports', async (req, res) => {
  console.log('Getting reports: ', req.body);
  try {
    const reports = await Report.find();

    if (reports.length > 0) {
      // reports found
      console.log(reports);
      
      // Create an array to store report data and file paths
      const reportsWithFilePaths = reports.map(report => ({
        info: report.info,
        prescriptionPath: report.prescriptionPath
      }));

      // Send both JSON response and PDF file paths
      res.json(reportsWithFilePaths);
    } else {
      // no reports
      res.json({ message: 'No reports found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve PDF files statically
// app.use('/prescriptions', express.static(path.join(__dirname, 'prescriptions')));

app.get('/download-pdf', (req, res) => {
  
  // Retrieve the file path from the query parameter
  const filePath = req.query.filePath;
  console.log('downloading PDF...', filePath);

  if (!filePath) {
    return res.status(400).send('File path not provided');
  }

  // Build the absolute path to the file
  const absoluteFilePath = path.join(__dirname, filePath);

  // Set the Content-Disposition header to make the browser download the file
  res.download(absoluteFilePath);
});

// // Start the server
// const port = 2010;
// app.listen(port, () => {
//   console.log(`Server started on http://localhost:${port}`);
// });
