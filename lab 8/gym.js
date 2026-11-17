// ==========================================
// EXPERIMENT 8
// Gym Admission Form
// Form Events and Live Validation
// ==========================================

console.log("Gym Admission Form Loaded Successfully");

// Access form elements
const form = document.getElementById("gymForm");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const ageInput = document.getElementById("age");
const genderInput = document.getElementById("gender");
const planInput = document.getElementById("plan");
const goalInput = document.getElementById("goal");

// ==========================================
// Validation Functions
// ==========================================

// Validate Name
function validateName() {
  const name = nameInput.value.trim();
  const message = document.getElementById("nameError");

  if (name === "") {
    message.textContent = "Name is required.";
    return false;
  }

  if (name.length < 3) {
    message.textContent = "Name must contain at least 3 characters.";

    return false;
  }

  message.textContent = "✓ Valid name";
  message.className = "success";

  return true;
}

// Validate Email
function validateEmail() {
  const email = emailInput.value.trim();
  const message = document.getElementById("emailError");

  const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  if (email === "") {
    message.textContent = "Email is required.";
    message.className = "error";

    return false;
  }

  if (!emailPattern.test(email)) {
    message.textContent = "Please enter a valid email address.";

    message.className = "error";

    return false;
  }

  message.textContent = "✓ Valid email";
  message.className = "success";

  return true;
}

// Validate Phone Number
function validatePhone() {
  const phone = phoneInput.value.trim();
  const message = document.getElementById("phoneError");

  const phonePattern = /^[0-9]{10}$/;

  if (phone === "") {
    message.textContent = "Phone number is required.";
    message.className = "error";

    return false;
  }

  if (!phonePattern.test(phone)) {
    message.textContent = "Phone number must contain exactly 10 digits.";

    message.className = "error";

    return false;
  }

  message.textContent = "✓ Valid phone number";
  message.className = "success";

  return true;
}

// Validate Age
function validateAge() {
  const age = Number(ageInput.value);
  const message = document.getElementById("ageError");

  if (ageInput.value === "") {
    message.textContent = "Age is required.";
    message.className = "error";

    return false;
  }

  if (age < 16 || age > 80) {
    message.textContent = "Age must be between 16 and 80.";

    message.className = "error";

    return false;
  }

  message.textContent = "✓ Valid age";
  message.className = "success";

  return true;
}

// Validate Gender
function validateGender() {
  const message = document.getElementById("genderError");

  if (genderInput.value === "") {
    message.textContent = "Please select gender.";
    message.className = "error";

    return false;
  }

  message.textContent = "✓ Selected";
  message.className = "success";

  return true;
}

// Validate Membership Plan
function validatePlan() {
  const message = document.getElementById("planError");

  if (planInput.value === "") {
    message.textContent = "Please select a membership plan.";

    message.className = "error";

    return false;
  }

  message.textContent = "✓ Plan selected";
  message.className = "success";

  return true;
}

// Validate Fitness Goal
function validateGoal() {
  const goal = goalInput.value.trim();
  const message = document.getElementById("goalError");

  if (goal === "") {
    message.textContent = "Please enter your fitness goal.";

    message.className = "error";

    return false;
  }

  if (goal.length < 5) {
    message.textContent = "Please enter a more detailed goal.";

    message.className = "error";

    return false;
  }

  message.textContent = "✓ Valid goal";
  message.className = "success";

  return true;
}

// ==========================================
// LIVE INPUT EVENTS
// ==========================================

nameInput.addEventListener("input", validateName);

emailInput.addEventListener("input", validateEmail);

phoneInput.addEventListener("input", validatePhone);

ageInput.addEventListener("input", validateAge);

genderInput.addEventListener("change", validateGender);

planInput.addEventListener("change", validatePlan);

goalInput.addEventListener("input", validateGoal);

// ==========================================
// FORM SUBMISSION
// ==========================================

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const validName = validateName();
  const validEmail = validateEmail();
  const validPhone = validatePhone();
  const validAge = validateAge();
  const validGender = validateGender();
  const validPlan = validatePlan();
  const validGoal = validateGoal();

  if (
    validName &&
    validEmail &&
    validPhone &&
    validAge &&
    validGender &&
    validPlan &&
    validGoal
  ) {
    const memberName = nameInput.value.trim();
    const plan = planInput.value;

    document.getElementById("successMessage").innerHTML = `
            <h3>Registration Successful!</h3>
            <p>
                Welcome, <strong>${memberName}</strong>.
            </p>
            <p>
                Your selected membership plan is
                <strong>${plan}</strong>.
            </p>
        `;

    console.log("Gym admission form submitted successfully.");

    form.reset();
  } else {
    document.getElementById("successMessage").innerHTML = "";

    console.log("Form submission failed due to invalid input.");
  }
});
