// ==========================================
// EXPERIMENT 10
// JSON Loading using fetch() and jQuery
// ==========================================

console.log("Experiment 10 Loaded Successfully");

// ==========================================
// FETCH API IMPLEMENTATION
// ==========================================

function loadUsingFetch() {
  fetch("data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to load JSON data.");
      }

      return response.json();
    })

    .then((data) => {
      console.log("Data loaded using fetch():", data);

      renderTable(data, "fetchTableBody");
    })

    .catch((error) => {
      console.error("Fetch Error:", error);

      document.getElementById("fetchStatus").textContent =
        "Error loading JSON data.";
    });
}

// ==========================================
// JQUERY $.getJSON() IMPLEMENTATION
// ==========================================

function loadUsingJQuery() {
  $.getJSON("data.json")

    .done(function (data) {
      console.log("Data loaded using $.getJSON():", data);

      renderTable(data, "jqueryTableBody");
    })

    .fail(function () {
      console.error("jQuery Error: Unable to load JSON data.");

      document.getElementById("jqueryStatus").textContent =
        "Error loading JSON data.";
    });
}

// ==========================================
// DYNAMIC TABLE RENDERING
// ==========================================

function renderTable(data, tableBodyId) {
  const tableBody = document.getElementById(tableBodyId);

  // Clear previous rows
  tableBody.innerHTML = "";

  data.forEach((student) => {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");

    const nameCell = document.createElement("td");

    const courseCell = document.createElement("td");

    const semesterCell = document.createElement("td");

    const marksCell = document.createElement("td");

    idCell.textContent = student.id;

    nameCell.textContent = student.name;

    courseCell.textContent = student.course;

    semesterCell.textContent = student.semester;

    marksCell.textContent = student.marks;

    row.appendChild(idCell);

    row.appendChild(nameCell);

    row.appendChild(courseCell);

    row.appendChild(semesterCell);

    row.appendChild(marksCell);

    tableBody.appendChild(row);
  });
}
