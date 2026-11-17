// ==========================================
// EXPERIMENT 4
// Palindrome Checker
// ==========================================

console.log("Palindrome Checker Loaded Successfully");

// Closure to count the number of checks
function createCounter() {
    let count = 0;

    return function () {
        count++;
        return count;
    };
}

const counter = createCounter();

// Arrow Function
const cleanString = text =>
    text.toLowerCase().replace(/[^a-z0-9]/g, "");

// Function Declaration
function checkPalindrome() {

    const input = document.getElementById("text").value;
    const output = document.getElementById("result");

    try {

        if (input.trim() === "") {
            throw new Error("Please enter some text.");
        }

        const cleaned = cleanString(input);

        const reversed = cleaned
            .split("")
            .reverse()
            .join("");

        const totalChecks = counter();

        if (cleaned === reversed) {

            output.innerHTML = `
                <h3>Result</h3>
                <p><strong>${input}</strong> is a Palindrome.</p>
                <p>Total Checks : ${totalChecks}</p>
            `;

        } else {

            output.innerHTML = `
                <h3>Result</h3>
                <p><strong>${input}</strong> is NOT a Palindrome.</p>
                <p>Total Checks : ${totalChecks}</p>
            `;

        }

    }

    catch(error){

        output.innerHTML = `
            <h3 style="color:red;">${error.message}</h3>
        `;

        console.error(error.message);

    }

    finally{

        console.log("Palindrome check completed.");

    }

}