// Wait for the DOM content to be fully loaded before executing JavaScript
document.addEventListener('DOMContentLoaded', function () {
  
  // Select necessary elements from the DOM
  const toggleDivs = document.querySelectorAll('.toggle-btn');
  const confirmButton = document.getElementById('confirm-selection');

  // Function to update the selection status of checkboxes within a category
  function updateSelection(category, isChecked) {
    // Select all checkboxes with the specified category attribute
    document.querySelectorAll(`.toggle-btn input[data-category="${category}"]`).forEach(function (checkbox) {
      // Update checkbox status
      checkbox.checked = isChecked;
      // Update the data-selected attribute and class of the parent div
      const div = checkbox.closest('.toggle-btn');
      div.setAttribute('data-selected', isChecked);
      div.classList.toggle('selected', isChecked);
    });
  }

  // Select all toggle buttons
  toggleDivs.forEach(function (div) {
    div.addEventListener('click', function () {
      // Toggle the checkbox status when the div is clicked
      const checkbox = div.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      div.setAttribute('data-selected', checkbox.checked);
      div.classList.toggle('selected', checkbox.checked);
    });
  });

  // Select all category selection buttons and add click event listeners
  document.querySelectorAll('.select-category').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      // Get the category from the data-category attribute
      const category = button.getAttribute('data-category');
      // Check if all checkboxes in the category are checked
      const allChecked = Array.from(document.querySelectorAll(`.toggle-btn input[data-category="${category}"]`)).every(checkbox => checkbox.checked);
      // Determine the new checked status
      const isChecked = !allChecked;
      // Update the selection for the category
      updateSelection(category, isChecked);
      // Toggle the 'selected' class of the button
      button.classList.toggle('selected', isChecked);
    });
  });

  // Select the confirm button
  if (confirmButton) {
    confirmButton.addEventListener('click', function () {
      console.log('Confirm button clicked');
      // Initialize selected data object
      const selectedData = {
        blooms_taxonomy: [],
        subjects: [],
        topics: [],
        question_types: [],
        question_difficulties: []
      };

      // Iterate over toggle buttons to collect selected data
      toggleDivs.forEach(function (div) {
        const checkbox = div.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
          const category = checkbox.getAttribute('data-category');
          // Push the checked checkbox value to the corresponding category in selectedData
          if (selectedData.hasOwnProperty(category)) {
            selectedData[category].push(checkbox.value);
          }
        }
      });

      // Collect form input values
      const numQuestionsValue = document.getElementById('number_of_questions').value;
      const testMaxPointValue = parseInt(document.getElementById('test_point_value').value, 10);
      const trainingLevelValue = document.getElementById('training_level_dropdown').value;
      const testNameValue = document.getElementById('test_name').value.trim();
      const testDescriptionValue = document.getElementById('test_description').value.trim();
      const isActiveValue = document.querySelector('.switch input[type="checkbox"]').checked;
      console.log(isActiveValue);

      // Create form data object to send via fetch
      const formData = {
        blooms_taxonomy: selectedData.blooms_taxonomy,
        subjects: selectedData.subjects,
        topics: selectedData.topics,
        question_types: selectedData.question_types,
        question_difficulties: selectedData.question_difficulties,
        num_questions: numQuestionsValue,
        test_max_points: testMaxPointValue,
        training_level: trainingLevelValue,
        test_name: testNameValue,
        test_description: testDescriptionValue,
        is_active: isActiveValue,
        test_type: "random"
      };
      
      // Send form data to server via fetch
      fetch('/handle_test_creation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      .then(response => {
        // Check if response is successful (status code 200-299)
        if (response.ok) {
          // Parse response JSON
          return response.json().then(data => ({ status: response.status, body: data }));
        } else {
          // Parse error response JSON
          return response.json().then(data => Promise.reject({ status: response.status, body: data }));
        }
      })
      .then(result => {
        // Handle successful response
        if (result.status === 200) {
          alert('Test created successfully!');
        } else {
          // Handle server error
          console.error('Error:', result.body.error);
          alert('An error occurred while creating the test: ' + result.body.error);
        }
      })
      .catch(error => {
        // Handle fetch error
        console.error('Error:', error);
        alert('An error occurred while processing your request. Please check your network connection and try again.');
      });
    });
  }
});