const mysql = require("mysql2");
require("dotenv").config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

connection.connect((err) => {
  if (err) {
    console.error("Connection failed:", err);
    return;
  }

  console.log("Connected to MySQL");

  // Create Database
  connection.query(
    `CREATE DATABASE IF NOT EXISTS secure_employee_storage`,
    (err) => {
      if (err) throw err;
      console.log("Database created or already exists");

      connection.changeUser(
        { database: "secure_employee_storage" },
        (err) => {
          if (err) throw err;

          // Employees Table
          const employeesTable = `
          CREATE TABLE IF NOT EXISTS employees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100) UNIQUE,
            password VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;

          connection.query(employeesTable, (err) => {
            if (err) throw err;
            console.log("Employees table ready");
          });

          // Typing Biometrics Table
          const typingTable = `
          CREATE TABLE IF NOT EXISTS typing_biometrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT,
            typing_speed FLOAT,
            typing_accuracy FLOAT,
            typing_pattern TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
          )
        `;

          connection.query(typingTable, (err) => {
            if (err) throw err;
            console.log("Typing biometrics table ready");
          });

          console.log("Setup completed");
          connection.end();
        }
      );
    }
  );
});