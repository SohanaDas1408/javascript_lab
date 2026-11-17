// ==========================================
// EXPERIMENT 6
// String Functions and Regex
// ==========================================

console.log("Regex Text Analyzer Loaded");

// Validate Email
function validateEmail() {

    const email = document.getElementById("email").value.trim();

    const emailPattern =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    const emailResult =
        document.getElementById("emailResult");

    if (emailPattern.test(email)) {

        emailResult.innerHTML =
            "<span style='color:green'>✓ Valid Email Address</span>";

    }

    else {

        emailResult.innerHTML =
            "<span style='color:red'>✗ Invalid Email Address</span>";

    }

}

// Analyze Text
function analyzeText() {

    const text =
        document.getElementById("text").value.trim();

    if (text === "") {

        alert("Please enter some text.");

        return;

    }

    const characterCount = text.length;

    const wordCount =
        text.split(/\s+/).filter(word => word !== "").length;

    const uppercase =
        (text.match(/[A-Z]/g) || []).length;

    const lowercase =
        (text.match(/[a-z]/g) || []).length;

    const digits =
        (text.match(/[0-9]/g) || []).length;

    const extractedEmails =
        text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);

    document.getElementById("analysis").innerHTML = `

        <h3>Text Analysis</h3>

        <p><strong>Total Characters:</strong> ${characterCount}</p>

        <p><strong>Total Words:</strong> ${wordCount}</p>

        <p><strong>Uppercase Letters:</strong> ${uppercase}</p>

        <p><strong>Lowercase Letters:</strong> ${lowercase}</p>

        <p><strong>Digits:</strong> ${digits}</p>

        <p><strong>Extracted Emails:</strong><br>

        ${extractedEmails ?
            extractedEmails.join("<br>")
            :
            "No email addresses found."
        }

        </p>

    `;

}