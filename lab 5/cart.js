// ==========================================
// EXPERIMENT 5
// Shopping Cart Calculator
// ==========================================

console.log("Shopping Cart Calculator Loaded");

// Product Catalog
const products = {
    Laptop: 55000,
    Mouse: 800,
    Keyboard: 1500,
    Headphones: 2000,
    Pendrive: 700
};

// Shopping Cart
const cart = [];

// Add Product to Cart
function addToCart() {

    const productName = document.getElementById("product").value;
    const quantity = parseInt(document.getElementById("quantity").value);

    if (quantity <= 0 || isNaN(quantity)) {
        alert("Please enter a valid quantity.");
        return;
    }

    const item = {
        name: productName,
        price: products[productName],
        quantity: quantity
    };

    cart.push(item);

    displayCart();

    document.getElementById("quantity").value = "";
}

// Display Cart
function displayCart() {

    const cartList = document.getElementById("cartItems");

    cartList.innerHTML = "";

    cart.forEach((item, index) => {

        cartList.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>₹${item.price}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price * item.quantity}</td>
            </tr>
        `;

    });

}

// Calculate Bill
function calculateBill() {

    if (cart.length === 0) {
        alert("Cart is empty.");
        return;
    }

    const subtotal = cart.reduce((total, item) => {

        return total + (item.price * item.quantity);

    }, 0);

    let discount = 0;

    if (subtotal >= 50000) {

        discount = subtotal * 0.10;

    }
    else if (subtotal >= 20000) {

        discount = subtotal * 0.05;

    }

    const finalAmount = subtotal - discount;

    document.getElementById("bill").innerHTML = `
        <h3>Bill Summary</h3>

        <p><strong>Subtotal :</strong> ₹${subtotal.toFixed(2)}</p>

        <p><strong>Discount :</strong> ₹${discount.toFixed(2)}</p>

        <hr>

        <h2>Total Amount : ₹${finalAmount.toFixed(2)}</h2>
    `;
}