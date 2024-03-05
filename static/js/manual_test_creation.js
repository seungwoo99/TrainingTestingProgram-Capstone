// This code waits for the DOMContentLoaded event to occur, 
// indicating that the HTML document's initial structure has been fully loaded and parsed.
document.addEventListener('DOMContentLoaded', (event) => {
  
  // These constants store references to various DOM elements using querySelector or getElementById methods.
  const searchButton = document.getElementById('search');
  const addButton = document.getElementById('add');
  const createTestButton = document.getElementById('create_test_button');
  const mainContainer = document.querySelector(".main-container");
  const sidePanelToggle = document.querySelector(".side-panel-toggle");
  const sidePanel = document.querySelector(".side-panel");
  const selectedTableBody = document.querySelector('.selected-table tbody');
  const wrapper = document.querySelector(".wrapper");
  const animatedBorder = document.querySelector('.animated-border');

  // Function to attach event listeners
  function initializeApp() {
    // Attach event listeners
    mainContainer.addEventListener('scroll', adjustPanelPosition);
    sidePanelToggle.addEventListener("click", toggleSidePanel);
    searchButton.addEventListener('click', queryForQuestions);
    addButton.addEventListener('click', handleAddButtonClick);
    createTestButton.addEventListener('click', function (event) {
      // Prevent the default form submission behavior
      event.preventDefault();

      // Call the function to handle test creation
      handleTestCreation();
    });
  }

  // ---------- Function that handles question retrieval ----------
  // Function to handle the click event on the search button
  function queryForQuestions(event) {
    // Prevent the default form submission behavior
    event.preventDefault();
  
    // Retrieve values from form inputs
    const bloomsTaxonomyValue = document.getElementById('blooms_taxonomy').value;
    const subjectValue = document.getElementById('subject').value;
    const topicValue = document.getElementById('topic').value;
    const trainingLevelValue = document.getElementById('training_level').value;
    const questionTypeValue = document.getElementById('question_type').value;
    const questionDifficultyValue = document.getElementById('question_difficulty').value;
    const questionMaxPointsInput = document.getElementById('question_max_points');
  
    // Initialize a flag to track form validity
    let isValid = true;
  
    // Retrieve and parse the maximum points value for a question
    const questionMaxPointsValue = parseInt(questionMaxPointsInput.value, 10);
  
    // Validate the maximum points value
    if (isNaN(questionMaxPointsValue) || questionMaxPointsValue <= 0) {
      // Add an error class to the input if the value is invalid
      questionMaxPointsInput.classList.add('error');
      isValid = false;
    } else {
      // Remove the error class if the value is valid
      questionMaxPointsInput.classList.remove('error');
    }
  
    // If the form is invalid, display an alert and stop further processing
    if (!isValid) {
      alert('Please ensure the maximum points for a question is a valid number greater than 0.');
      return false;
    }
  
    // Construct the request payload with form data
    const questionQueryFormData = {
      blooms_taxonomy: bloomsTaxonomyValue !== "all" ? [bloomsTaxonomyValue] : [],
      subjects: subjectValue !== "all" ? [subjectValue] : [],
      topics: topicValue !== "all" ? [topicValue] : [],
      question_types: questionTypeValue !== "all" ? [questionTypeValue] : [],
      question_difficulties: questionDifficultyValue !== "all" ? [questionDifficultyValue] : [],
      question_max_points: questionMaxPointsValue,
      training_level: trainingLevelValue !== "all" ? trainingLevelValue : undefined,
      test_type: "manual"
    };
  
    // Send a POST request to the server to retrieve questions based on the form data
    fetch('/get_questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(questionQueryFormData)
    })
    .then(response => {
      // Log the response status to the console
      console.log('Response status:', response.status);
      
      // Handle different response statuses
      if (response.status === 204) {
        // If no questions are found, display an alert and reset form inputs
        const error = '204 code occurred--No questions found.'
        console.log(error);
        alert('No questions found that meet the selection criteria. Select new criteria and try again.');
        resetInputs();
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
        console.log("Error in question retrieval occurred.");
        console.log('Data status:', data.status);
        console.log(`${status_code}: ${data.message}`);
          
        // Handle all errors
        return handleAllErrors({status_code: status_code, json: () => Promise.resolve(data)});
      }
      
      // Log the message from the server to the console
      console.log(data.message);
      return {data, status_code};
    })
    .then(({data}) => {
      // Display the selected questions in a table
      const resultsTable = document.querySelector(".results-table");
      const tableBody = resultsTable.querySelector("tbody");
      tableBody.innerHTML = "";
        
      // Iterate over the selected questions and create table rows
      data.selected_questions.forEach(question => {
        const row = tableBody.insertRow();
        row.dataset.questionId = question.question_id;
          
        // Insert cells for each question attribute
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        const cell3 = row.insertCell(2);
      
        // Create a checkbox input for selecting the question
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'select_question';
        checkbox.value = question.question_id; 
        cell3.appendChild(checkbox);
      
        // Populate cells with question attributes
        cell1.textContent = question.max_points;
        cell2.textContent = question.question_desc;
      });
    })
    .catch(error => {
      // Handle errors that occurred during question retrieval
      console.error('Error in question retrieval occurred: ', error.message || error);
    });
  }

  // ---------- Functions for handling adding questions to side panel ----------
  // Function to handle the click event on the add button
  function handleAddButtonClick() {
    // Retrieve all selected checkboxes from the results table
    const selectedCheckboxes = document.querySelectorAll('.results-table tbody input[type="checkbox"]:checked');
  
    // If there are selected checkboxes
    if (selectedCheckboxes.length > 0) {
      // Iterate over each selected checkbox
      selectedCheckboxes.forEach(checkbox => {
        // Add the corresponding question to the selected table
        addQuestionToSelected(checkbox);
        
        // Uncheck the checkbox after adding the question
        checkbox.checked = false;
      });
      
      // Update the total points displayed
      updateTotalPoints()
      
      // Add the 'animate' class to the animatedBorder element for animation
      animatedBorder.classList.add('animate');
      
      // Adjust the position of the animated border
      adjustAnimatedBorderPosition()
    }
  }
  
  // Function to add a selected question to the selected table
  function addQuestionToSelected(checkbox) {
    // Retrieve the parent row of the selected checkbox
    const row = checkbox.closest('tr');
    
    // Extract the question ID from the dataset of the parent row
    const questionId = row.dataset.questionId;

    // Insert a new row into the selected table
    const newRow = selectedTableBody.insertRow();
    newRow.dataset.questionId = questionId;

    // Insert cells into the new row to display question information
    const newCell1 = newRow.insertCell(0);
    const newCell2 = newRow.insertCell(1);
    const newCell3 = newRow.insertCell(2);
    const newCell4 = newRow.insertCell(3);

    // Create and append a number input field for specifying the question order
    const numInput = document.createElement('input');
    numInput.type = 'number';
    numInput.min = '1';
    newCell1.appendChild(numInput);

    // Create and append a hidden input field to store the question ID
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = 'questionId';
    hiddenInput.value = questionId;
    newCell1.appendChild(hiddenInput);

    // Copy the text content of cells from the original row to the new row
    newCell2.textContent = row.cells[0].textContent;
    newCell3.textContent = row.cells[1].textContent;

    // Create and append a remove button to delete the question from the selected table
    newCell4.appendChild(createRemoveButton(newRow));
  }
  
  // Function to create a remove button for deleting a question from the selected table
  function createRemoveButton(row) {
    // Create a new button element
    const removeButton = document.createElement('button');

    // Set the text content of the button to 'Remove'
    removeButton.textContent = 'Remove';

    // Add a class to the button for styling purposes
    removeButton.className = 'remove-button';

    // Attach an onclick event handler to the button
    removeButton.onclick = function() {
      // Remove the row from the selected table when the button is clicked
      row.remove();
      
      // Update the total points displayed after removing the question
      updateTotalPoints();
    };

    // Return the created remove button
    return removeButton;
  }

  // ---------- Functions to calculating and retrieving the point value of question on the side panel ----------
  // Function to update the total points displayed in the submission table
  function updateTotalPoints() {
    // Initialize totalPoints variable to store the sum of question points
    let totalPoints = 0;
  
    // Retrieve all rows in the selected table body
    const selectedTableRows = document.querySelectorAll('.selected-table tbody tr');
  
    // Iterate over each row in the selected table
    selectedTableRows.forEach(row => {
      // Retrieve the points from the second cell of each row and add it to totalPoints
      totalPoints += parseInt(row.cells[1].textContent) || 0;
    });
  
    // Select the first cell of the first row in the submission table
    const submitTablePointValueTd = document.querySelector('.submit-table tr td:first-child');
  
    // If the selected cell exists
    if (submitTablePointValueTd) {
      // Update the text content of the cell with the total points
      submitTablePointValueTd.textContent = totalPoints;
    }
  }

  // Function to calculate the total points from the questions in the selected table
  function getTotalPoints() {
    // Initialize totalPoints variable to store the sum of question points
    let totalPoints = 0;
  
    // Retrieve all rows in the selected table body
    const selectedTableRows = document.querySelectorAll('.selected-table tbody tr');
  
    // Iterate over each row in the selected table
    selectedTableRows.forEach(row => {
      // Retrieve the points from the second cell of each row and add it to totalPoints
      totalPoints += parseInt(row.cells[1].textContent) || 0;
    });
  
    // Return the calculated total points
    return totalPoints;
  }

  // ---------- Input validation and collection ----------
  function validateInputs() {
    // Log the validation stage
    console.log('Validating inputs.')
    
    // Retrieve all selected questions from the selected table
    const selectedQuestions = document.querySelectorAll('.selected-table tbody tr');
        
    // Initialize a variable to track the validation status
    let isValid = true;
    
    // Check each selected question's order value for validity
    selectedQuestions.forEach(row => {
      const input = row.querySelector('input[type="number"]');
      const orderValue = input ? parseInt(input.value, 10) : null;

      // Check if orderValue is not null and greater than 0
      if (orderValue === null || orderValue <= 0 || isNaN(orderValue)) {
        input.classList.add('error');
        isValid = false;
      } else {
        input.classList.remove('error');
      }
    });
    
    // Retrieve test name input
    const testNameInput = document.getElementById('test_name');
        
    // Validate test name
    if (!testNameInput.value.trim()) {
      testNameInput.classList.add('error');
      isValid = false;
    } else {
      testNameInput.classList.remove('error');
    }
    
    // Retrieve test description input and its value
    const testDescriptionInput = document.getElementById('test_description');

    // Validate test description
    if (!testDescriptionInput.value.trim()) {
      testDescriptionInput.classList.add('error');
      isValid = false;
    } else {
      testDescriptionInput.classList.remove('error');
    }

    return isValid;
  }

  function collectInputs() {
    // Log the data collection stage
    console.log('Collecting inputs.')

    // Retrieve all selected questions from the selected table
    const selectedQuestions = document.querySelectorAll('.selected-table tbody tr');
        
    // Map over each selected question to retrieve its order and ID
    const questionOrder = Array.from(selectedQuestions).map(row => {
      const input = row.querySelector('input[type="number"]');
      const questionId = row.dataset.questionId;
      const orderValue = input ? parseInt(input.value, 10) : null;
    
      // Return an object containing question ID and order
      return {
        question_id: questionId,
        question_order: orderValue
      };
    });
    
    // Retrieve other input values
    const testNameValue = document.getElementById('test_name').value.trim();
    const testDescriptionValue = document.getElementById('test_description').value.trim();        
    const totalScoreValue = parseInt(getTotalPoints(), 10);
    const isActiveValue = document.querySelector('.switch input[type="checkbox"]').checked;
        
    // Prepare data for test creation
    const testCreationData = {
      question_order: questionOrder,
      total_score: totalScoreValue,
      test_name: testNameValue,
      is_active: isActiveValue,
      test_description: testDescriptionValue,
    };
    
    return testCreationData;
  }
  
  // ---------- Function for test creation ----------
  // Function to handle the creation of a test based on user input and selected questions
  function handleTestCreation() {
    // Log the initiation of the test creation process
    console.log('Starting test creation process.')

    // Validate and collect inputs
    isValid = validateInputs();
    
    // If any validation fails, display an alert and stop the process
    if (!isValid) {
      alert('Please fill in all the required fields correctly.');
      return;
    }

    // Log the successful completions of input validation
    console.log('Inputs validated.');

    // Collect data from the inputs
    const testCreationData = collectInputs();
    
    // Log the initiation of test creation attempt
    console.log('Attempting test creation.');

    // Send a POST request to create the test
    fetch('/test_creation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCreationData)
    }).then(response => {
      // Parse response data and status code
      return response.json().then(data => ({data, status_code: response.status}));
    })
    .then(({data, status_code}) => {
      // Handle errors if the test creation fails
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
      // Log and handle any errors that occur during test creation
      console.error('Error occurred in test creation process: ', error.message || error);
    });
  }

  // ---------- Function to open created test in a new tab ----------
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

  // ---------- Function for error handling ----------
  // Function to handle all errors returned from API requests
  function handleAllErrors(response, context = {}) {
    // If the response status is 200, no error handling is required
    if (response.status === 200) {
      console.log('Status code 200, no error to handle, terminating handleAllErrors.')
      return Promise.resolve();
    }
    
    // Initialize a flag to track if an error has been triggered
    let errorTriggered = false;

    // Log the occurrence of an error with its status code
    console.error(`Error occurred with status ${response.status_code}.`);
    
    // Parse the error response and handle it accordingly
    return response.json().then(data => {
      // Display an alert with the error message or a generic message if none is provided
      alert(data.message || 'An error occurred.');
      
      // Switch statement to handle specific error cases
      switch (response.status_code) {
        // Case to handle the error that the name of the test being made already exists in the database
        case 409:
          console.log('409 error occurred--Duplicate name');
          const element = document.getElementById('test_name');
          if (element) {
            element.classList.add("error");
            element.focus();
          }
          return Promise.reject('Process terminated so user can choose a different name.')
        // Case to handle a 500 error
        case 500:
          console.log('500 error occurred')
          alert('An unexpected server error occurred. Please try again later.');
          errorTriggered = true;
          return Promise.reject('Process terminated due to error.')
        // Case to handle any errors not caught above
        default:
          console.log('No specified case for error--default')
          alert('An unexpected error occurred.');
          errorTriggered = true;
          return Promise.reject('Process terminated due to error.')
      }
    }).catch(error => {
      // Handle unexpected errors during error processing
      if (!errorTriggered) {
        console.error('Error processing the error response:', error);  
        return Promise.reject('Process terminated due to unexpected error.'); 
      } else {
        return Promise.reject('Process terminated due caught error.');
      }
    });
  }

  //---------- Function to reset inputs ---------- 
  // Function to reset the values of all select and input elements on the page
  function resetInputs() {
    // Select all select elements and reset their selected index to 0
    const selectElements = document.querySelectorAll('select');
    selectElements.forEach(select => {
      select.selectedIndex = 0;
    });
    
    // Select all input elements of type text or number and reset their values to an empty string
    const inputElements = document.querySelectorAll('input[type="text"], input[type="number"]');
    inputElements.forEach(input => {
      input.value = '';
    });
  }

  // ---------- Functions that manage element behavior ----------
  // Function to toggle the side panel's visibility and remove animation
  function toggleSidePanel() {
    // Toggle the "side-panel-open" class on the wrapper element
    // This class controls the visibility of the side panel
    wrapper.classList.toggle("side-panel-open");
  
    // Remove the 'animate' class from the animatedBorder element
    // This class controls the animation of the border element
    animatedBorder.classList.remove('animate');
  }

  // Function to adjust the position of the side panel and its toggle button based on the scroll position of the main container.
  function adjustPanelPosition() {
    // Get the new top position of the side panel based on the scroll position of the main container
    let newTopPosition = mainContainer.scrollTop;
  
    // Set the top position of the side panel to match the new scroll position
    sidePanel.style.top = `${newTopPosition}px`;
  
    // Set the top position of the side panel toggle button slightly below the side panel
    sidePanelToggle.style.top = `${newTopPosition + 20}px`;

    // If the animatedBorder element has the class 'animate', then adjust its position as well.
    if(animatedBorder.classList.contains('animate')) {
      // Call the adjustAnimatedBorderPosition function to reposition the animated border
      adjustAnimatedBorderPosition();
    }
  }


  // Function to adjust the position of the animated border relative to the side panel toggle button.
  function adjustAnimatedBorderPosition() {
    // Get the position and dimensions of the sidePanelToggle element and the mainContainer element
    const toggleRect = sidePanelToggle.getBoundingClientRect();
    const containerRect = mainContainer.getBoundingClientRect();

    // Calculate the top and right positions of the animated border
    const topPosition = toggleRect.top - containerRect.top + mainContainer.scrollTop;
    const rightPosition = containerRect.right - toggleRect.right;

    // Set the top, right, width, and height styles of the animated border
    // Adjusting them to align properly with the side panel toggle button
    animatedBorder.style.top = `${topPosition - 5}px`;
    animatedBorder.style.right = `${rightPosition - 17}px`; 
    animatedBorder.style.width = `137px`;
    animatedBorder.style.height = `49px`;
  }

  // Call the initializeApp function to run it on page load
  initializeApp();

});
