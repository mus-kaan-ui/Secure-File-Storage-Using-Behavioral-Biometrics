const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

const app = express();

// 🔥 ADD THIS (missing in your code)
const db = require("./config/db");

// ✅ MULTER MUST BE HERE (before routes)
const multer = require("multer");

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", express.static("uploads"));

// ✅ Upload API (NOW it works)
app.post("/upload", upload.single("file"), (req, res) => {

    const employeeId = req.body.employeeId;
    const department = req.body.department;
    if(!employeeId){
        return res.send("User not logged in!");
    }
    const sql = "INSERT INTO files (employee_id, filename, filepath, department) VALUES (?, ?, ?, ?)";

    db.query(sql, [employeeId, req.file.filename, req.file.path, department], (err) => {
        if (err) {
            console.log(err);
            return res.send("Upload failed");
        }

        res.send("File uploaded");
    });
});

// ✅ Fetch files API
app.get("/files", (req, res) => {
    const employeeId=req.query.employeeId;
    const sql=`SELECT * FROM files WHERE employee_id=? 
    UNION 
    SELECT f. * FROM files f 
    JOIN file_shares fs ON f.id = fs.file_id
    WHERE fs.shared_with =?`;

    db.query(sql,[employeeId, employeeId], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Error fetching files");
        }
        res.json(result);
    });
});

app.get("/shared-files", (req, res) => {
    const employeeId = req.query.employeeId;

    const sql = `
        SELECT f.*
        FROM files f
        JOIN file_shares fs ON f.id = fs.file_id
        WHERE fs.shared_with = ?
    `;

    db.query(sql, [employeeId], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Error fetching shared files");
        }

        res.json(result);
    });
});

app.get("/users",(req,res)=> {
    const sql ="SELECT id, name, email FROM employees";
    db.query(sql,(err, result)=>{
        if(err){
            console.log(err);
            return res.send("Error fetching users");
        }
        res.json(result);
    });
});

//share API
app.post("/share", (req, res) => {
    const { fileId, sharedWith, ownerId } = req.body;

    // 🔒 Ensure only owner can share
    const checkSql = "SELECT * FROM files WHERE id = ? AND employee_id = ?";

    db.query(checkSql, [fileId, ownerId], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Error checking ownership");
        }

        if (result.length === 0) {
            return res.send("Unauthorized: Not your file");
        }

        const insertSql = "INSERT INTO file_shares (file_id, shared_with) VALUES (?, ?)";

        db.query(insertSql, [fileId, sharedWith], (err) => {
            if (err) {
                console.log(err);
                return res.send("Share failed");
            }

            res.send("File shared successfully");
        });
    });
});

// Import routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
// Route middleware
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
// Start server
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});                      