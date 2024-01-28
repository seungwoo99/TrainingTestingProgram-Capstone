// Get all the toggle button divs
var toggleDivs = document.querySelectorAll('.toggle-btn');

// Add click event listeners to each div
toggleDivs.forEach(function(div) {
  div.addEventListener('click', function() {
    var checkbox = div.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked; // toggle the checkbox
    div.setAttribute('data-selected', checkbox.checked); // update the data-selected attribute
    div.classList.toggle('selected', checkbox.checked); // toggle the selected class
  });
});

// Confirmation button
document.getElementById('confirmSelection').addEventListener('click', function() {
  var selectedButtons = [];
  
  // Check which checkboxes are checked
  toggleDivs.forEach(function(div) {
    var checkbox = div.querySelector('input[type="checkbox"]');
    if (checkbox.checked) {
      selectedButtons.push(checkbox.id); // Use the checkbox id or any other relevant identifier
    }
  });
  
  // Do something with the selected buttons
  console.log('Selected checkboxes:', selectedButtons);
  // For example, you could send this information to a server or display it on the page
});
