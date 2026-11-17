// ==========================================
// EXPERIMENT 2
// ES6 Features and Billing Calculator
// ==========================================

console.log("Billing Calculator Loaded Successfully");

// Demonstrating var
function showVar() {
    var message = "Using var keyword";
    if (true) {
        var message = "Value changed using var";
    }
    console.log(message);
}

// Demonstrating let
function showLet() {
    let message = "Using let keyword";
    if (true) {
        let message = "Block scoped let";
        console.log(message);
    }
    console.log(message);
}

// Demonstrating const
const gstRate = 0.18;

showVar();
showLet();

// Billing Calculator
function generateBill() {

    const price = parseFloat(document.getElementById("price").value) || 0;
    const quantity = parseInt(document.getElementById("quantity").value) || 0;
    const discount = parseFloat(document.getElementById("discount").value) || 0;

    const gross = price * quantity;
    const discountAmount = gross * discount / 100;
    const subtotal = gross - discountAmount;
    const gst = subtotal * gstRate;
    const total = subtotal + gst;

    // Object
    const bill = {
        gross,
        discountAmount,
        gst,
        total
    };

    // Destructuring
    const { gross: g, discountAmount: d, gst: tax, total: payable } = bill;

    // Template Literals
    document.getElementById("output").innerHTML = `
        <h3>Bill Details</h3>
        <p>Gross Amount : ₹${g.toFixed(2)}</p>
        <p>Discount : ₹${d.toFixed(2)}</p>
        <p>GST (18%) : ₹${tax.toFixed(2)}</p>
        <hr>
        <h2>Total Amount : ₹${payable.toFixed(2)}</h2>
    `;

    console.log(`Total Bill Generated: ₹${payable.toFixed(2)}`);
}