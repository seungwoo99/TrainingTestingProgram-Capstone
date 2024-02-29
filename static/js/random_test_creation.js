// Wait for the DOM content to be fully loaded before executing JavaScript
document.addEventListener('DOMContentLoaded', function () {
  
  // Select necessary elements from the DOM
  const toggleDivs = document.querySelectorAll('.toggle-btn');
  const confirmButton = document.getElementById('confirm-selection');

  // Function to update the selection status of checkboxes within a category
  function updateSelection(category, isChecked) {
    // Select all checkboxes with the specified category attribute
    document.querySelectorAll(`.toggle-btn input[data-category='${category}']`).forEach(function (checkbox) {
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

      console.log('Selected Data:', selectedData);

      // Collect form input values
      const numQuestionsValue = parseInt(document.getElementById('number_of_questions').value, 10);
      const testMaxPointsValue = parseInt(document.getElementById('test_max_points').value, 10);
      const trainingLevelValue = document.getElementById('training_level').value;
      const testNameValue = document.getElementById('test_name').value.trim();
      const testDescriptionValue = document.getElementById('test_description').value.trim();
      const isActiveValue = document.querySelector('.switch input[type="checkbox"]').checked;

      // Create form data object to send via fetch
      const questionQueryData = {
        blooms_taxonomy: selectedData.blooms_taxonomy,
        subjects: selectedData.subjects,
        topics: selectedData.topics,
        question_types: selectedData.question_types,
        question_difficulties: selectedData.question_difficulties,
        num_questions: numQuestionsValue,
        test_max_points: testMaxPointsValue,
        training_level: trainingLevelValue,
        test_type: 'random'
      };

      console.log('Attempting question retrieval.');
      fetch('/get_questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionQueryData)
      })
      .then(response => {
        console.log('Response status:', response.status);
        if (response.status === 204) {
          const error = '204 code occurred--No questions found.'
          console.log(error);
          alert('No questions found that meet the selection criteria. Select new criteria and try again.');
          resetUI();
          return Promise.reject(new Error(error));
        } else {
          return response.json().then(data => ({
              data,
              status_code: response.status
          }));
        }
      })
      .then(({data, status_code}) => {
        if (data.status === 'error') {
          console.log('Error in question retrieval occurred.');
          console.log('Data status:', data.status);
          console.log(`${status_code}: ${data.message}`);
          return handleAllErrors({status_code: status_code, json: () => Promise.resolve(data)});
        }
      
        console.log(data.message);
        return handleQuestionSelection(data.questions_pool, numQuestionsValue, testMaxPointsValue);
      })
      .then(selectionData => {
        if (!selectionData || !selectionData.question_order) {
          throw new Error('Error selecting questions.');
        }
      
        const testCreationData = {
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
          body: JSON.stringify(testCreationData)
        }).then(response => response.json().then(data => ({data, status_code: response.status})));
      })
      .then(({data, status_code}) => {
        if (data.status === 'error') {
          console.log('Error in test creation occurred.');
          console.log(`${status_code}: ${data.message}`);
          return handleAllErrors({status_code: status_code, json: () => Promise.resolve(data)}, {focusElement: 'test_name'});
        }
        alert('Test created successfully!');
      })
      .catch(error => {
        console.error('Error occurred in test creation process: ', error.message || error);
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
    .then(response => 
      response.json().then(data => ({
        data,
        status_code: response.status
      }))
      .then(({data, status_code}) => {
        if (data.status === 'error') {
          console.log('Error in question selection occurred.');
          console.log(`${status_code}: ${data.message}`);
          return handleAllErrors({status_code: status_code, json: () => Promise.resolve(data)}, {
            questions_pool, numQuestions, testMaxPoints
          });
        }
        if (data.message) {
          console.log(data.message);
        }
        return data;
      })
    )
    .catch(error => {
      const errorMessage = `An error occurred while selecting questions: ${error.message}`;
      const customError = new Error(errorMessage);
      return Promise.reject(customError);
    });
  }

  function handleAllErrors(response, context = {}) {
    if (response.status === 200) {
      console.log('Status code 200, no error to handle, terminating handleAllErrors.')
      return Promise.resolve();
    }
    
    let errorTriggered = false;
    console.error(`Error occurred with status ${response.status_code}.`);
    
    return response.json().then(data => {
      alert(data.message || 'An error occurred.');
      
      switch (response.status_code) {
        case 409:
          console.log('409 error occurred--Duplicate name');
          const element = document.getElementById('test_name');
          if (element) {
            element.classList.add('error');
            element.focus();
          }
          return Promise.reject('Process terminated so user can choose a different name.')
        case 422:
          console.log('422 error occurred--Less questions found then requested')
          if (confirm(`Adjust number of questions to the available ${data.total_questions_in_pool}?`)) {
            return handleQuestionSelection(context.questions_pool, data.total_questions_in_pool, context.testMaxPoints)
          } else {
            console.log('User terminated the process.');
            if (context.resetUI) context.resetUI();
            errorTriggered = true;
            return Promise.reject('Process terminated due to user choice.')
          }
        case 412:
          console.log('412 error occurred--Less questions found then requested and the available questions exceed the max point allowance')
          if (confirm('Do you want to adjust the number of questions and max points based on the feedback?')) {
            const newNumQuestions = parseInt(prompt(`Enter new number of questions (Available: ${data.total_questions_in_pool}).`, context.numQuestions), 10);
            const newTestMaxPoints = parseInt(prompt(`Enter new max points limit (Current maximum available: ${data.total_max_points}).`, context.testMaxPoints), 10);
            return handleQuestionSelection(context.questions_pool, newNumQuestions, newTestMaxPoints)
          } else {
            console.log('User terminated process.');
            if (context.resetUI) context.resetUI();
            errorTriggered = true;
            return Promise.reject('Process terminated due to user choice.')
          }
        case 406:
          console.log('406 error occurred--No valid combo')
          if (context.resetUI) context.resetUI();
          errorTriggered = true;
          return Promise.reject('Process terminated due to no valid combination of questions meeting selection criteria.')
        case 500:
          console.log('500 error occurred')
          alert('An unexpected server error occurred. Please try again later.');
          errorTriggered = true;
          return Promise.reject('Process terminated due to error.')
        default:
          console.log('No specified case for error--default')
          alert('An unexpected error occurred.');
          errorTriggered = true;
          return Promise.reject('Process terminated due to error.')
      }
    }).catch(error => {
      if (!errorTriggered) {
        console.error('Error processing the error response:', error);  
        return Promise.reject('Process terminated due to unexpected error.'); 
      } else {
        return Promise.reject('Process terminated due caught error.');
      }
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
    document.getElementById('training_level').selectedIndex = 0; 
    document.getElementById('test_name').value = '';
    document.getElementById('test_description').value = '';
    document.querySelector('.switch input[type="checkbox"]').checked = false; 
  }
});