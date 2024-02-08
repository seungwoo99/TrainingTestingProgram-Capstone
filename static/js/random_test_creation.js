// Wrap your JavaScript code in a DOMContentLoaded event listener to ensure it runs after the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', function () {
  
  // Utility function to update the selected state of checkboxes and toggle buttons
  function updateSelection(category, isChecked) {
    document.querySelectorAll(`.toggle-btn input[data-category="${category}"]`).forEach(function (checkbox) {
      checkbox.checked = isChecked;
      var div = checkbox.closest('.toggle-btn');
      div.setAttribute('data-selected', isChecked);
      div.classList.toggle('selected', isChecked);
    });
  }

  // Event listener for individual toggle buttons
  var toggleDivs = document.querySelectorAll('.toggle-btn');
  toggleDivs.forEach(function (div) {
    div.addEventListener('click', function () {
      var checkbox = div.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      div.setAttribute('data-selected', checkbox.checked);
      div.classList.toggle('selected', checkbox.checked);
    });
  });

  // Event listeners for 'Select All' buttons in each category
  document.querySelectorAll('.selectCategory').forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      var category = button.getAttribute('data-category');
      var allChecked = Array.from(document.querySelectorAll(`.toggle-btn input[data-category="${category}"]`)).every(checkbox => checkbox.checked);
      var isChecked = !allChecked;
      updateSelection(category, isChecked);
      button.classList.toggle('selected', isChecked);
    });
  });

  // Event listener for 'Confirm Selection' button
  var confirmButton = document.getElementById('confirmSelection');
  if (confirmButton) {
    confirmButton.addEventListener('click', function () {
      console.log('Confirm button clicked');
      var selectedData = {
        blooms_levels: [],
        subjects: [],
        topics: [],
        question_types: [],
        question_difficulties: []
      };

      toggleDivs.forEach(function (div) {
        var checkbox = div.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
          var category = checkbox.getAttribute('data-category');
          if (selectedData.hasOwnProperty(category)) {
            selectedData[category].push(checkbox.value);
          }
        }
      });

      var numQuestionsValue = document.getElementById('number_of_questions').value;
      var maxPointsValue = document.getElementById('test_point_value').value;

      fetch('/get-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          blooms_levels: selectedData.blooms_levels,
          subjects: selectedData.subjects,
          topics: selectedData.topics,
          question_types: selectedData.question_types,
          question_difficulties: selectedData.question_difficulties,
          num_questions: numQuestionsValue,
          max_points: maxPointsValue
        })
      })
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Server responded with an error!');
          }
        })
        .then(data => {
          console.log('Success:', data);
          if (typeof data.total_questions_in_pool !== 'undefined' && typeof data.questions_chosen_for_test !== 'undefined') {
            if (data.total_questions_in_pool === 0) {
              alert(data.message || "No questions found that meet the selection criteria.");
            } else {
              alert(`Total questions in pool: ${data.total_questions_in_pool}\nQuestions chosen for test: ${data.questions_chosen_for_test}`);
            }
          } else {
            console.error('Error: Missing data from server response.');
            alert('An error occurred while processing your request. Please try again.');
          }
        })
        .catch((error) => {
          console.error('Error:', error);
          alert('An error occurred while fetching questions.');
        });
    });
  }
});
