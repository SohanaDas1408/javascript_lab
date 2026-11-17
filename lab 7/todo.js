// ==========================================
// EXPERIMENT 7
// DOM Traversal and Updates
// To-Do List Application
// ==========================================

console.log("To-Do List Application Loaded Successfully");

// Add a new task
function addTask() {
  const input = document.getElementById("taskInput");
  const taskText = input.value.trim();

  if (taskText === "") {
    alert("Please enter a task.");
    return;
  }

  // Create a new list item
  const listItem = document.createElement("li");

  // Create task text
  const taskSpan = document.createElement("span");
  taskSpan.textContent = taskText;

  // Create Edit button
  const editButton = document.createElement("button");
  editButton.textContent = "Edit";

  // Create Delete button
  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete";

  // Edit functionality
  editButton.addEventListener("click", function () {
    const currentText = taskSpan.textContent;

    const updatedText = prompt("Edit your task:", currentText);

    if (updatedText !== null && updatedText.trim() !== "") {
      taskSpan.textContent = updatedText.trim();

      console.log("Task updated:", updatedText);
    }
  });

  // Delete functionality
  deleteButton.addEventListener("click", function () {
    listItem.remove();

    console.log("Task deleted.");
  });

  // Add elements to the list item
  listItem.appendChild(taskSpan);
  listItem.appendChild(editButton);
  listItem.appendChild(deleteButton);

  // Add list item to the task list
  document.getElementById("taskList").appendChild(listItem);

  // Clear input field
  input.value = "";

  console.log("New task added:", taskText);
}

// ==========================================
// DOM TRAVERSAL DEMONSTRATION
// ==========================================

function inspectDOM() {
  const taskList = document.getElementById("taskList");

  console.log("Task List Element:", taskList);

  console.log("Number of Tasks:", taskList.children.length);

  // Traverse through child elements
  for (let task of taskList.children) {
    console.log("Task:", task.querySelector("span").textContent);
  }
}
