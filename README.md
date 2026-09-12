# Secure File Storage Using Behavioral Biometrics

A full-stack web application developed individually for secure employee file storage, incorporating behavioral biometric authentication based on typing characteristics and OTP-based verification.

## Overview

The system is designed to provide secure file storage and controlled access for employees in an organization. It combines user authentication, file management, behavioral biometric analysis, and OTP-based verification to add an additional layer of security.

## Key Features

- Employee registration and login
- Secure employee file upload and storage
- User-specific file access
- Department-oriented file functionality
- Behavioral biometric authentication using typing characteristics
- Typing speed and typing pattern analysis
- OTP-based user verification
- Password reset functionality
- Administrative/security management features
- Database-backed employee and file management

## Behavioral Biometrics

The application uses JavaScript event listeners to capture typing-related characteristics during user interaction.

The system can analyze characteristics such as:

- Typing speed
- Typing patterns
- Typing accuracy

These characteristics are used as an additional authentication factor alongside conventional login credentials.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- MySQL
- Multer
- OTP-based authentication
- dotenv

## Project Structure

```text
secure employee storage/
│
├── config/
│   └── db.js
│
├── controllers/
│   └── authController.js
│
├── public/
│   ├── admin.html
│   ├── dashboard.html
│   ├── forgot-password.html
│   ├── index.html
│   ├── login.html
│   ├── otp.html
│   ├── register.html
│   ├── report.html
│   ├── reset-password.html
│   ├── style.css
│   └── upload.html
│
├── routes/
│   ├── adminRoutes.js
│   └── authRoutes.js
│
├── .gitignore
├── package.json
├── server.js
└── setupDatabase.js