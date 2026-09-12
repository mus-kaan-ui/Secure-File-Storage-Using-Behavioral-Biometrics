const express = require("express");
const router = express.Router();
const db = require("../config/db");

//middleware 
function isAdmin(req, res, next){
    const role = req.headers.role;

    if(role !== "admin"){
        return
        res.status(403).json({ message: "Unauthorized"});
    }

    next();
}

// GET all employees
router.get("/users", isAdmin, (req, res) => {
    const sql = "SELECT id, name, email FROM employees";

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ message: "Error fetching users" });
        }

        res.json(result);
    });
});

// GET all files
router.get("/files",isAdmin, (req, res) => {
    const sql = "SELECT * FROM files";

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.json({ message: "Error fetching files" });
        }

        res.json(result);
    });
});

//SUSPICIOUS LOGIN
router.get("/suspicious", isAdmin, (req,res)=>{
    const sql="SELECT * FROM suspicious_logins ORDER BY created_at DESC";
    db.query(sql,(err, result)=>{
        if(err){
            console.log(err);
            return 
            res.json({ message: "Error"});
        }
        res.json(result);
    });
});
// DELETE USER
router.delete("/users/:id", (req, res) => {
    db.query("DELETE FROM employees WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.json({ message: "Delete failed" });
        res.json({ message: "User deleted" });
    });
});

// DELETE FILE
router.delete("/files/:id", (req, res) => {
    db.query("DELETE FROM files WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.json({ message: "Delete failed" });
        res.json({ message: "File deleted" });
    });
});
module.exports = router;