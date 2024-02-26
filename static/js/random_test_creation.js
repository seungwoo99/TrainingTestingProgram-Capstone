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
        bloomsTaxonomyValue: [],
        subjectsValue: [],
        topicsValue: [],
        questionTypesValue: [],
        questionDifficultiesValue: []
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

      const numQuestionsValue = parseInt(document.getElementById('number_of_questions').value, 10);
      const testMaxPointValue = parseInt(document.getElementById('test_point_value').value, 10);
      const trainingLevelValue = document.getElementById('training_level_dropdown').value;
      const testNameValue = document.getElementById('test_name').value.trim();
      const testDescriptionValue = document.getElementById('test_description').value.trim();
      const isActiveValue = document.querySelector('.switch input[type="checkbox"]').checked;

      const formData = {
        blooms_taxonomy: selectedData.bloomsTaxonomyValue,
        subjects: selectedData.subjectsValue,
        topics: selectedData.topicsValue,
        question_types: selectedData.questionTypesValue,
        question_difficulties: selectedData.questionDifficultiesValue,
        training_level: trainingLevelValue,
        test_type:"random"
      };

      console.log('Attempting question retrieval.');
      fetch('/get_questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      .then(response => response.ok ? response.json() : handleAllErrors(response, {resetUI: resetUI}, handleQuestionSelection))
      .then(data => {
        console.log(data.message)
        return handleQuestionSelection(data.questions_pool, numQuestionsValue, testMaxPointValue);
      })
      .then(selectionData => {
        if (!selectionData || !selectionData.question_order) {
          throw new Error('Error selecting questions');
        }
        const thirdRequestData = {
          question_order: selectionData.question_order,
          total_score: selectionData.total_score,
          test_name: testNameValue,
          test_description: testDescriptionValue,
          is_active: isActiveValue,
        };
        console.log('Attempting test creation.');
        return fetch('/test_creation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(thirdRequestData)
        });
      })
      .then(response => response.ok ? response.json() : handleAllErrors(response, { focusElement: 'test_name' }))
      .then(() => {
        alert('Test created successfully!');
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please check the console for details.');
      });
    });
  }

  function handleQuestionSelection(questions_pool, numQuestions, testMaxPoints) {
    console.log('Attempting question selection.');
    return fetch('/select_questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        questions_pool: questions_pool, 
        num_questions: numQuestions, 
        test_max_points: testMaxPoints })
    })
    .then(response => response.ok ? response.json() : handleAllErrors(response, {
        questions_pool, numQuestions, testMaxPoints, resetUI: resetUI
    }))
    .then(data => {
      console.log("Questions successfully selected.");
      return data;
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while selecting questions.');
      return Promise.reject(error);
    });
  }

  function handleAllErrors(response, context = {}, retryCallback) {
    console.error(`Error occurred with status ${response.status}: ${response.message}`);
    
    response.json().then(data => {
      alert(data.message || 'An error occurred.');
      
      switch (response.status) {
        case 204:
          alert('No questions found that meet the selection criteria. Select new criteria and try again.');
          if (context.resetUI) context.resetUI();
          return Promise.reject('Process terminated due to no questions found meeting selection criteria.')
        case 409:
          alert(data.message || 'A conflict occurred. Please try a different name.');
          if (context.focusElement) document.getElementById(context.focusElement).focus();
          break;
        case 422:
          if (confirm(`Adjust number of questions to the available ${data.total_questions_in_pool}?`)) {
            handleQuestionSelection(context.questions_pool, data.total_questions_in_pool, context.testMaxPoints);
          } else {
            console.log('User terminated the process.');
            if (context.resetUI) context.resetUI();
            return Promise.reject('Process terminated due to user choice.')
          }
          break;
        case 412:
          if (confirm("Do you want to adjust the number of questions and max points based on the feedback?")) {
            const newNumQuestions = parseInt(prompt(`Enter new number of questions (Available: ${data.total_questions_in_pool}):`, context.numQuestions), 10);
            const newTestMaxPoints = parseInt(prompt("Enter new max points limit:", context.testMaxPoints), 10);
            handleQuestionSelection(context.questions_pool, newNumQuestions, newTestMaxPoints);
          } else {
            console.log('User terminated process.');
            if (context.resetUI) context.resetUI();
            return Promise.reject('Process terminated due to user choice.')
          }
          break;
        case 500:
          alert('An unexpected server error occurred. Please try again later.');
          return Promise.reject('Process terminated due to error.')
        default:
          alert('An unexpected error occurred.');
          return Promise.reject('Process terminated due to error.')
      }
    }).catch(error => {
      console.error('Error processing the error response:', error);
      alert('An error occurred while processing the error response. Please check the console for more details.');
      return Promise.reject('Process terminated due to error.')
    });
  }

  function resetUI() {
    document.querySelectorAll('.toggle-btn input[type="checkbox"]').forEach(checkbox => {
      checkbox.checked = false;
      const div = checkbox.closest('.toggle-btn');
      if (div) {
        div.setAttribute('data-selected', 'false');
        div.classList.remove('selected');
      }
    });

    document.querySelectorAll('.select-category').forEach(button => {
      button.classList.remove('selected');
    });

    const categories = document.querySelectorAll('.select-category');
    categories.forEach(button => {
      const category = button.getAttribute('data-category');
      updateSelection(category, false);
    });

    document.getElementById('number_of_questions').value = '';
    document.getElementById('test_point_value').value = '';
    document.getElementById('training_level_dropdown').selectedIndex = 0; 
    document.getElementById('test_name').value = '';
    document.getElementById('test_description').value = '';
    document.querySelector('.switch input[type="checkbox"]').checked = false; 
  }

});