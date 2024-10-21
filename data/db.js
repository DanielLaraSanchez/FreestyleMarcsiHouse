const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI; // Replace with your MongoDB connection string

mongoose.connect('mongodb+srv://f-raps-db:Mayusculas2@cluster0.fnkdvcm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    tlsAllowInvalidCertificates: true, // Add this line
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

module.exports = mongoose;