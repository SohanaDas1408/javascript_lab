// ==========================================
// EXPERIMENT 3
// Control Structures and Form Validation
// Student Grading System
// ==========================================

console.log("Student Grading System Loaded Successfully");

function calculateGrade() {

    const marks = document.getElementById("marks").value;
    const result = document.getElementById("result");

    // Form Validation
    if (marks === "") {
        alert("Please enter marks.");
        return;
    }

    if (isNaN(marks)) {
        alert("Marks must be numeric.");
        return;
    }

    const score = Number(marks);

    if (score < 0 || score > 100) {
        alert("Marks should be between 0 and 100.");
        return;
    }

    let grade;

    // Control Structures
    if (score >= 90) {
        grade = "A+";
    }
    else if (score >= 80) {
        grade = "A";
    }
    else if (score >= 70) {
        grade = "B";
    }
    else if (score >= 60) {
        grade = "C";
    }
    else if (score >= 50) {
        grade = "D";
    }
    else {
        grade = "F (Fail)";
    }

    result.innerHTML = `
        <h3>Result</h3>
        <p><strong>Marks:</strong> ${score}</p>
        <p><strong>Grade:</strong> ${grade}</p>
    `;

    console.log(`Marks: ${score}, Grade: ${grade}`);
}