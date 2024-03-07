// This code waits for the DOMContentLoaded event to occur, 
// indicating that the HTML document's initial structure has been fully loaded and parsed.
document.addEventListener('DOMContentLoaded', function () {
  
  // These constants store references to various DOM elements using querySelectorAll or getElementById methods.
  const toggleDivs = document.querySelectorAll('.toggle-btn');
  const confirmButton = document.getElementById('confirm-selection');
  const categoryButtons = document.querySelectorAll('.select-category');
  const resetButton = document.getElementById('reset-selection');
  
  // Function to attach event listeners
  function initializeApp() {
    // Attach event listeners
    confirmButton.addEventListener('click', handleTestCreation);
    resetButton.addEventListener('click', resetInputs);

    toggleDivs.forEach(function (div) {
      // Specify the 'click' event and provide the function to be called
      div.addEventListener('click', function () {
        // Call the function when the event occurs
        handleToggleDivClick(div);
      });
    });

    categoryButtons.forEach(function (button) {
      button.addEventListener('click', function (event) {
        // Prevent default form submission behavior
        event.preventDefault();
        // Call the handleCategoryButtonClick function with the button as an argument
        handleCategoryButtonClick(button);
      });
    });
  }

  // Function to update the selection status of checkboxes based on category and checked state
  function updateSelection(category, isChecked) {
    // Select all checkboxes with the specified category
    document.querySelectorAll(`.toggle-btn input[data-category='${category}']`).forEach(function (checkbox) {
      // Set the checked state of the checkbox
      checkbox.checked = isChecked;
      // Find the parent div of the checkbox
      const div = checkbox.closest('.toggle-btn');
      // Set the data-selected attribute of the div to the checked state
      div.setAttribute('data-selected', isChecked);
      // Toggle the 'selected' class of the div based on the checked state
      div.classList.toggle('selected', isChecked);
    });
    // Update the category button state after updating checkboxes
    updateCategoryButtonState(category, isChecked);
  }

  // Function to update the state of the category button based on the checkboxes' checked state
  function updateCategoryButtonState(category, isChecked) {
    // Check if all checkboxes with the specified category are checked
    const allSelected = Array.from(document.querySelectorAll(`.toggle-btn input[data-category='${category}']`)).every(checkbox => checkbox.checked);
    // Find the category button element
    const categoryButton = document.querySelector(`.select-category[data-category='${category}']`);
    // Toggle the 'selected' class of the category button based on whether all checkboxes are checked
    if (categoryButton) {
      categoryButton.classList.toggle('selected', allSelected);
    }
  }

  // Function to handle click events on toggle div elements
  function handleToggleDivClick(div) {
    // Find the checkbox within the clicked div
    const checkbox = div.querySelector('input[type="checkbox"]');
    
    // Toggle the checkbox's checked state
    checkbox.checked = !checkbox.checked;
    
    // Update the data attribute to reflect the checkbox state
    div.setAttribute('data-selected', checkbox.checked);
    
    // Toggle the 'selected' class based on the checkbox state
    div.classList.toggle('selected', checkbox.checked);
    
    // Get the category of the checkbox
    const category = checkbox.getAttribute('data-category');
    
    // Update the category button state based on the checkbox state
    updateCategoryButtonState(category, checkbox.checked);
  }

  // Function to handle category button click events
  function handleCategoryButtonClick(button) {
    // Get the category from the button's data attribute
    const category = button.getAttribute('data-category');
    // Determine the checked state based on the presence of the 'selected' class
    const isChecked = !button.classList.contains('selected');
    // Call the updateSelection function with the category and checked state
    updateSelection(category, isChecked);
  }

  // Function to validate inputs for test creation
  function validateInputs() {
    // Log the validation stage
    console.log('Validating inputs.')

    let isValid = true; 

    // Validate test name input
    const testNameInput = document.getElementById('test_name');
    if (!testNameInput.value.trim()) {
      testNameInput.classList.add('error');
      isValid = false;
    } else {
      testNameInput.classList.remove('error');
    }
  
    // Validate number of questions input
    const numQuestionsInput = document.getElementById('number_of_questions');
    const numQuestionsValue = parseInt(numQuestionsInput.value, 10);
    if (isNaN(numQuestionsValue) || numQuestionsValue <= 0) {
      numQuestionsInput.classList.add('error');
      isValid = false;
    } else {
      numQuestionsInput.classList.remove('error');
    }
  
    // Validate test max points input
    const testMaxPointsInput = document.getElementById('test_max_points');
    const testMaxPointsValue = parseInt(testMaxPointsInput.value, 10);
    if (isNaN(testMaxPointsValue) || testMaxPointsValue <= 0) {
      testMaxPointsInput.classList.add('error');
      isValid = false;
    } else {
      testMaxPointsInput.classList.remove('error');
    }
  
    // Validate test description input
    const testDescriptionInput = document.getElementById('test_description');
    if (!testDescriptionInput.value.trim()) {
      testDescriptionInput.classList.add('error');
      isValid = false;
    } else {
      testDescriptionInput.classList.remove('error');
    }

    console.log(isValid)
    // Return the validation result
    return isValid;
  }
  
  function handleTestCreation() {
    // Log the initiation of the test creation process
    console.log('Starting test creation process.')  
    
    // Disable the confirm button and show processing overlay
    confirmButton.disabled = true;
    confirmButton.classList.add('disabled');
    showProcessingOverlay()

    // Validate inputs
    isValid = validateInputs();

    // If inputs are not valid, display an alert and reset the confirm button state
    if (!isValid) {
      resetConfirmButtonState();
      setTimeout(() => {
        alert('Please fill in all the required fields correctly.');
      }, 100);
      return;
    }
      
    // Log the successful completions of input validation
    console.log('Inputs validated.');

    // Initialize selected data object
    const selectedData = {
      blooms_taxonomy: [],
      subjects: [],
      topics: [],
      question_types: [],
      question_difficulties: []
    };

    // Map over each toggle button to collect selected data
    toggleDivs.forEach(function (div) {
      const checkbox = div.querySelector('input[type="checkbox"]');
      if (checkbox.checked) {
        const category = checkbox.getAttribute('data-category');
        if (selectedData.hasOwnProperty(category)) {
          selectedData[category].push(checkbox.value);
        }
      }
    });

    // Log the selected data
    console.log('Selected Data:', selectedData);

    // Retrieve values from various inputs
    const testNameValue = document.getElementById('test_name').value.trim();
    const testDescriptionValue = document.getElementById('test_description').value.trim();
    const trainingLevelValue = document.getElementById('training_level').value;
    const isActiveValue = document.querySelector('.switch input[type="checkbox"]').checked;
    const numQuestionsInput = document.getElementById('number_of_questions');
    const numQuestionsValue = parseInt(numQuestionsInput.value, 10);
    const testMaxPointsInput = document.getElementById('test_max_points');
    const testMaxPointsValue = parseInt(testMaxPointsInput.value, 10);

    // Prepare data for question retrieval
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

    // Log the initiation of test creation process
    console.log('Starting test creation process.');

     // Log the initiation of question retrieval
    console.log('Attempting question retrieval.');
    
    // Send a POST request to the server to retrieve questions based on the form data
    fetch('/get_questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questionQueryData)
    })
    .then(response => {
      // Log the response status to the console
      console.log('Response status:', response.status);
      
      // Handle different response statuses
      if (response.status === 204) {
        // If no questions are found, display an alert and reset form inputs
        const error = '204 code occurred--No questions found.'
        console.log(error);
        resetConfirmButtonState();
        setTimeout(() => {
          alert('No questions found that meet the selection criteria. Select new criteria and try again.');
          resetInputs();
        }, 100);
        return Promise.reject(new Error(error));
      } else {
        // Parse the response JSON data
        return response.json().then(data => ({
          data,
          status_code: response.status
        }));
      }
    })
    .then(({data, status_code}) => {
      // Handle data received from the server
      if (data.status === 'error') {
        // If an error occurred, log the error message
        console.log('Error in question retrieval occurred.');
        console.log('Data status:', data.status);
        console.log(`${status_code}: ${data.message}`);
        
        // Handle all errors
        return handleAllErrors({status_code: status_code, json: () => Promise.resolve(data)});
      }
      
      // Log the message from the server to the console
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
      } else {
        // If test creation is successful
        const testId = data.test_id;

        // Display an alert with the test ID
        alert(`Test created successfully with ID: ${testId}`);

        // Export the test immediately after the alert is closed
        exportTest(testId);

        // Refresh the page
        location.reload();
      }
    })
    .catch(error => {
      console.error('Error occurred in test creation process: ', error.message || error);
      resetConfirmButtonState()
    });
  }

  // Function to export the test after successful creation
  function exportTest(testId) {
    // Log the successful test creation
    console.log(`Exporting test with ID: ${testId}`);
    
    // Create a form element
    const form = document.createElement('form');
    form.method = 'POST'; // Set the HTTP method
    form.action = '/generate_test'; // Set the action URL
    form.target = '_blank'; // Open the form submission in a new tab
    
    // Create an input field to hold the test ID
    const testIdInput = document.createElement('input');
    testIdInput.type = 'hidden'; // Set the input type to hidden
    testIdInput.name = 'test_id'; // Set the input name
    testIdInput.value = testId; // Set the input value to the test ID
    
    // Append the test ID input field to the form
    form.appendChild(testIdInput);
  
    // Append the form to the document body
    document.body.appendChild(form);
  
    // Submit the form to generate the test
    form.submit();
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
      resetConfirmButtonState()
      return Promise.reject(customError);
    });
  }

  function handleAllErrors(response, context = {}) {
    if (response.status === 200) {
      console.log('Status code 200, no error to handle, terminating handleAllErrors.')
      return Promise.resolve();
    }

    hideProcessingOverlay();
    
    let errorTriggered = false;
    
    return new Promise((resolve, reject) => {
      response.json().then(data => {
        setTimeout(() => {
          console.error(`Error occurred with status ${response.status_code}.`);
          alert(data.message || 'An error occurred.');
      
          switch (response.status_code) {
            case 409:
              errorTriggered = true;
              console.log('409 error occurred--Duplicate name');
              const element = document.getElementById('test_name');
              if (element) {
                element.classList.add('error');
                element.focus();
              }
              resetConfirmButtonState();
              reject(new Error('Process terminated so user can choose a different name.'));
              break;
            case 422:
              errorTriggered = true;
              console.log('422 error occurred--Less questions found then requested')
              if (confirm(`Adjust number of questions to the available ${data.total_questions_in_pool}?`)) {
                showProcessingOverlay();
                return handleQuestionSelection(context.questions_pool, data.total_questions_in_pool, context.testMaxPoints)
                  .then(selectionData => {
                    resolve(selectionData);
                  })
                  .catch(error => {
                    resetInputs();
                    resetConfirmButtonState();
                    reject(error);
                  });
              } else {
                console.log('User terminated the process.');
                resetInputs();
                resetConfirmButtonState();
                reject(new Error('Process terminated due to user choice.'));
              }
              break;
            case 412:
              errorTriggered = true;
              console.log('412 error occurred--Less questions found then requested and the available questions exceed the max point allowance')
              if (confirm('Do you want to adjust the number of questions and max points based on the feedback?')) {
                const newNumQuestions = parseInt(prompt(`Enter new number of questions (Available: ${data.total_questions_in_pool}).`, context.numQuestions), 10);
                const newTestMaxPoints = parseInt(prompt(`Enter new max points limit (Current maximum available: ${data.total_max_points}).`, context.testMaxPoints), 10);
                showProcessingOverlay();
                return handleQuestionSelection(context.questions_pool, newNumQuestions, newTestMaxPoints)
                  .then(selectionData => {
                    resolve(selectionData);
                  })
                  .catch(error => {
                    resetInputs();
                    resetConfirmButtonState();
                    reject(error);
                  });
              } else {
                console.log('User terminated process.');
                resetInputs();
                resetConfirmButtonState();
                reject(new Error('Process terminated due to user choice.'));
              }
              break;
            case 406:
              errorTriggered = true;
              console.log('406 error occurred--No valid combo')
              resetConfirmButtonState()
              reject(new Error('Process terminated due to no valid combination of questions meeting selection criteria.'));
              break;
            case 500:
              errorTriggered = true;  
              console.log('500 error occurred')
              alert('An unexpected server error occurred. Please try again later.');
              resetInputs();
              resetConfirmButtonState()
              reject(new Error('Process terminated due to error.'));
              break;
            default:
              console.log('No specified case for error--default')
              resetInputs();
              resetConfirmButtonState()
              reject(new Error(`Unhandled error code: ${response.status_code}`));
              break;
          }
        }, 100);
      }).catch(error => {
        if (!errorTriggered) {
          console.error('Error processing the error response:', error);  
          resetInputs();
          resetConfirmButtonState()
          reject(new Error('Process terminated due to unexpected error.')); 
        } else {
          reject(new Error('Process terminated due caught error.'));
        }
      });
    })
  }

  function resetConfirmButtonState() {
    confirmButton.disabled = false;
    confirmButton.classList.remove('disabled');
    hideProcessingOverlay();
  }

  function resetInputs() {
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
    document.getElementById('test_max_points').value = '';
    document.getElementById('training_level').selectedIndex = 0; 
    document.getElementById('test_name').value = '';
    document.getElementById('test_description').value = '';
    document.querySelector('.switch input[type="checkbox"]').checked = false; 
  }

  function showProcessingOverlay() {
    const mainContainer = document.querySelector('.main-container');
    
    const overlay = document.createElement('div');
    overlay.setAttribute('id', 'processing-overlay');
    overlay.style.position = 'fixed';
    overlay.style.top = '50%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)'; 
    overlay.style.width = '30%'; 
    overlay.style.height = '22.5%'; 
    overlay.style.backgroundImage = 'url("/static/img/processing.gif")';
    overlay.style.backgroundRepeat = 'no-repeat';
    overlay.style.backgroundPosition = 'center';
    overlay.style.backgroundSize = 'contain'; 
    overlay.style.backgroundColor= '#FEFCFE'
    overlay.style.zIndex = '1000';
    overlay.style.border = '10px solid #708B75';
    overlay.style.boxShadow = '0 5px 10px rgba(0,0,0,0.3)'; 
    mainContainer.appendChild(overlay);
  }
  
  function hideProcessingOverlay() {
    const mainContainer = document.querySelector('.main-container');
    mainContainer.style.overflow = 'auto';
    
    const overlay = document.getElementById('processing-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  initializeApp()
  
});