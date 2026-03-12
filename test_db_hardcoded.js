const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://ryan11027wi_db_user:01861601745%40%40Hkkk@e-com.lthga5l.mongodb.net/?appName=e-com";

console.log('Connecting to:', MONGODB_URI.replace(/:([^@]+)@/, ':***@'));
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB successfully!');
        process.exit(0);
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1);
    });
