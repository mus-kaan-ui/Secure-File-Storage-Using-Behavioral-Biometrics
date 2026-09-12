require("dotenv").config();

const nodemailer = require("nodemailer");
const db = require("../config/db");
const bcrypt = require("bcrypt");

// 🔐 OTP generator
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

// 📩 Email config
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


// ================= REGISTER =================
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = "INSERT INTO employees (name, email, password) VALUES (?, ?, ?)";

        db.query(sql, [name, email, hashedPassword], (err) => {
            if (err) {
                console.log(err);
                return res.json({ message: "Registration failed" });
            }

            res.json({ message: "User registered successfully" });
        });

    } catch (error) {
        console.log(error);
        res.json({ message: "Error registering user" });
    }
};


// ================= LOGIN =================
exports.loginUser = (req, res) => {

    console.log("LOGIN HIT");

    const { email, password, typingSpeed, typingAccuracy, typingPattern } = req.body;

    const sql = "SELECT * FROM employees WHERE email = ?";

    db.query(sql, [email], async (err, result) => {

        if (err) {
            console.log("DB ERROR:", err);
            return res.json({ message: "Database error" });
        }

        if (result.length === 0) {
            return res.json({ message: "User not found" });
        }

        const user = result[0];

        //check lock
        if(user.lock_until && Date.now()< user.lock_until){
            return res.json({ message: "Account locked. Try later"});
        }

        //check password
        try {
            const match = await bcrypt.compare(password, user.password);

            if(!match){
                let attempts = user.failed_attempts + 1;
            //lock after 3 attempts
            if (attempts>=3){
                const lockTime = Date.now() + (5 * 60 * 1000);
                db.query(
                    "UPDATE employees SET failed_attempts = ?, lock_until =? WHERE id=?",
                    [attempts, lockTime, user.id]
                );

            //log suspicious activity
                db.query("INSERT INTO suspicious_logins (employee_id, email, reason) VALUES(?,?,?)",
                    [user.id, user.email, "Multiple failed password attempts"]
                );    
                return res.json({
                    message: "Account locked due to multiple failed attempts"
                });
            }
            db.query("UPDATE employees SET failed_attempts = ? WHERE id = ?", 
                [attempts, user.id]
            );
            return res.json({
                message: `Invalid password (${3 - attempts}
                attempts left)`
            });
            }
            //password correct reset attempts
            db.query("UPDATE employees SET failed_attempts = 0, lock_until = NULL WHERE id =?", [user.id]);

            //parse pattern safely
            let parsedPattern=null;
            try{
                parsedPattern=typingPattern?JSON.parse(typingPattern):null;
            } catch(e){
                console.log("Invalid typingPattern JSON");
            }

            // 🔍 Get last 5 logins average
            const checkQuery = `
            SELECT 
                COUNT (*) AS recordCount,
                AVG(typing_speed) AS avgSpeed, 
                AVG(typing_accuracy) AS avgAccuracy 
            FROM (
                SELECT typing_speed, typing_accuracy 
                FROM typing_biometrics 
                WHERE employee_id = ?
                ORDER BY id DESC 
                LIMIT 5
            ) AS last5`;

            db.query(checkQuery, [user.id], async (err, previous) => {

                if (err) {
                    console.log(err);
                    return res.json({ message: "Error checking biometrics" });
                }

            const recordCount = previous[0].recordCount;
            const avgSpeed = previous[0].avgSpeed;
            const avgAccuracy = previous[0].avgAccuracy;

            console.log("Count:", recordCount);
            console.log("Avg Speed:", avgSpeed);
            console.log("Avg Accuracy:", avgAccuracy);
        //BOOTSTRAPPPING (FIRST 5 LOGINS)
        if(recordCount<5){
            console.log("Bootstrapping -> Direct login");
            return directLogin(user,typingSpeed, typingAccuracy, typingPattern);
        }
        //SCORING
        const speedDiff = Math.abs(avgSpeed - typingSpeed);
        const accDiff = Math.abs(avgAccuracy - typingAccuracy);

        console.log("SpeedDiff:", speedDiff);
        console.log("AccDiff:", accDiff);

        let score = 0;

        //SPEED (STRICT)
        if(speedDiff <10) score+=2;
        else if (speedDiff < 20) score+=1;

        //ACCURACY
        if(accDiff < 8) score+=1;

        console.log("Score:", score);

        //DECISION
        if(score < 2){
            return triggerOTP(user, email, typingSpeed, typingAccuracy, typingPattern);
        }

        //SAFE LOGIN
        return directLogin(user, typingSpeed, typingAccuracy, typingPattern);
            });

        } catch (error) {
            console.log("BCRYPT ERROR:", error);
            return res.json({ message: "Error during login" });
        }
    });


    // ================= HELPER FUNCTIONS =================

    function directLogin(user, typingSpeed, typingAccuracy, typingPattern) {
        console.log("FINAL VALUES:", user.id, typingSpeed, typingAccuracy, typingPattern);
        const biometricsQuery =
            "INSERT INTO typing_biometrics (employee_id, typing_speed, typing_accuracy, typing_pattern) VALUES (?, ?, ?, ?)";

        db.query(
            biometricsQuery,
            [user.id, typingSpeed, typingAccuracy, typingPattern],
            (err) => {

                if (err) {
                    console.log(err);
                    return res.json({ message: "Biometrics save error" });
                }

                return res.json({
                    message: "Login successful",
                    userId: user.id,
                    role: user.role
                });
            }
        );
    }

    async function triggerOTP(user, email, typingSpeed, typingAccuracy, typingPattern) {
        global.otpStore = global.otpStore||{};
        console.log("NEW OTP STORED:", global.otpStore[email]);
       const existing = global.otpStore?.[email];
        if(existing && Date.now()< existing.expiresAt){
            console.log("OTP already exists, not regenerating");
            return res.json({
                message: "OTP already sent. Please wait.",
                requireOTP: true,
                email
            });
        }
        const otp = generateOTP();
        console.log("⚠️ Suspicious login - OTP:", otp);
        //SUSPICIOUS
        const suspiciousQuery=` INSERT INTO suspicious_logins(employee_id, email, typing_speed, typing_accuracy,  reason) VALUES(?,?,?,?,?)`;
        db.query(suspiciousQuery,[
            user.id,
            email,
            typingSpeed,
            typingAccuracy,
            "Behavior mismatch - OTP triggered"
        ]);
        global.otpStore = global.otpStore || {};
        global.otpStore[email] = {
            otp,
            userId: user.id,
            role: user.role,
            typingSpeed: typingSpeed,
            typingAccuracy: typingAccuracy,
            typingPattern: typingPattern||null,
            expiresAt: Date.now() + 2 * 60 * 1000, 
            attempts: 0
        };

        await transporter.sendMail({
            from: "shaikmuskan288@gmail.com",
            to: email,
            subject: "Suspicious Login OTP",
            text: `Hello ${user.name},

A suspicious login attempt was detected on your account due to typing biometrics mismatch.

🔐 Your OTP Code: ${otp}

This OTP will expire in 5 minutes.

Login Time:
${new Date().toLocaleString()}

If this wasn't you, please contact your administrator immediately.

Secure Employee Storage Team`
        });

        return res.json({
            message: "Suspicious login - OTP sent",
            requireOTP: true,
            email
        });
    }
};


// ================= VERIFY OTP =================
console.log("VERIFY OTP API HIT");
exports.verifyOTP = (req, res) => {

    const { email, otp } = req.body;

    const record = global.otpStore?.[email];

    console.log("VERIFY HIT:", record);

    // ❌ No OTP found
    if (!record) {
        return res.json({ success: false, message: "No OTP found" });
    }

    // ⏰ Check expiry FIRST
    if (Date.now() > record.expiresAt) {
        delete global.otpStore[email];
        return res.json({ success: false, message: "OTP expired" });
    }

    // 🚫 Check attempts BEFORE validating OTP
    if (record.attempts >= 3) {
        
        const lockTime = Date.now()+(5*60*1000); //5 mins

        //lock account
        db.query("UPDATE employees SET failed_attempts=3, lock_until=? WHERE id=?",
            [lockTime, record.userId],
            (err)=>{
                if (err)
                    console.log("Lock error:", err);
                else console.log("User locked due to OTP failures");
            }
        );

        //log suspicious activity
        db.query("INSERT INTO suspicious_logins (employee_id, email, reason) VALUES(?,?,?)",
            [record.userId, email, "Multiple wrong OTP attempts"]
        );
        
        //clear OTP session
        delete global.otpStore[email];
        return res.json({ success: false, message: "Too many attempts"

         });
    }

    // ❌ Wrong OTP
    if (String(record.otp) !== String(otp)) {

    record.attempts++;

    console.log("❌ Wrong OTP entered");
    console.log("Updated attempts:", record.attempts);

    if (record.attempts >= 3) {
        delete global.otpStore[email];
        return res.json({
            success: false,
            message: "Too many attempts"
        });
    }

    return res.json({
        success: false,
        message: `Invalid OTP (${3 - record.attempts} attempts left)`
    });
}

    // ✅ Correct OTP
    console.log("OTP VERIFIED SUCCESS");
    delete global.otpStore[email];

return res.json({
    success: true,
    message: "Login successful",
    userId: record.userId
});
        }
// ================= FORGOT PASSWORD =================

exports.forgotPassword = (req, res) => {

    const { email } = req.body;

    const sql =
    "SELECT * FROM employees WHERE email = ?";

    db.query(sql, [email], async (err, result) => {

        if(err){

            console.log(err);

            return res.json({
                success:false,
                message:"Database error"
            });
        }

        if(result.length === 0){

            return res.json({
                success:false,
                message:"Email not found"
            });
        }

        const otp = generateOTP();

        global.resetOTPStore =
        global.resetOTPStore || {};

        global.resetOTPStore[email] = {

            otp,

            expiresAt:
            Date.now() + 5 * 60 * 1000

        };

        try{

            await transporter.sendMail({

                from:
                "shaikmuskan288@gmail.com",

                to: email,

                subject:
                "Password Reset OTP",

                text:
`Hello,

Your OTP for password reset is:

${otp}

This OTP will expire in 5 minutes.

If this wasn't you,
please contact administrator immediately.

Secure Employee Storage Team`

            });

            return res.json({

                success:true,

                message:
                "OTP sent successfully"

            });

        }

        catch(error){

            console.log(error);

            return res.json({

                success:false,

                message:
                "Failed to send OTP"

            });

        }

    });

};



// ================= RESET PASSWORD =================

exports.resetPassword = async (req, res) => {

    const {
        email,
        otp,
        newPassword
    } = req.body;

    const record =
    global.resetOTPStore?.[email];

    if(!record){

        return res.json({

            success:false,

            message:"No OTP found"

        });

    }

    // OTP expiry
    if(Date.now() > record.expiresAt){

        delete global.resetOTPStore[email];

        return res.json({

            success:false,

            message:"OTP expired"

        });

    }

    // OTP mismatch
    if(String(record.otp) !== String(otp)){

        return res.json({

            success:false,

            message:"Invalid OTP"

        });

    }

    try{

        const hashedPassword =
        await bcrypt.hash(newPassword, 10);

        const sql =
        "UPDATE employees SET password = ? WHERE email = ?";

        db.query(
            sql,
            [hashedPassword, email],
            (err) => {

            if(err){

                console.log(err);

                return res.json({

                    success:false,

                    message:"Database error"

                });

            }

            delete global.resetOTPStore[email];

            return res.json({

                success:true,

                message:
                "Password reset successful"

            });

        });

    }

    catch(error){

        console.log(error);

        return res.json({

            success:false,

            message:
            "Password reset failed"

        });

    }

};        