const mysql =require("mysql2");
require("dotenv").config();
const db=mysql.createConnection({
    host:"localhost",
    user:"root",
    password:process.env.DB_PASSWORD,
    database:"secure_employee_storage"
});
db.connect((err)=> {
    if(err) {
        console.log("database connection failed:", err);
    }
    else{
        console.log("Mysql connected");
    }
});
module.exports=db;