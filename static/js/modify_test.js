// Wait for the DOM content to be fully loaded before executing JavaScript
document.addEventListener('DOMContentLoaded', (event) => {

  // Select necessary elements from the DOM
  const mainContainer = document.querySelector(".main-container");
  const sidePanelToggle = document.querySelector(".side-panel-toggle");
  const sidePanel = document.querySelector(".side-panel");
  const addButton = document.getElementById('add');
  const searchButton = document.getElementById('search');
  const selectedTableBody = document.querySelector('.selected-table tbody');
  const wrapper = document.querySelector(".wrapper");
  const animatedBorder = document.querySelector('.animated-border');
  const selectedQuestionsData = document.querySelector('#selected-questions-data');
  const testId = document.getElementById('testId').value;
    // Call your function with the test_id
    openSidebarAndPopulateQuestions(testId);
function openSidebarAndPopulateQuestions(testId) {
    // Create form data object
    const formData = new FormData();
    formData.append('test_id', testId);

    // Send fetch request to Flask endpoint
    fetch(`/get-questions-for-modify/${testId}`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        // Check if response is successful (status code 200-299)
        if (response.ok) {
            //console.log("respons was ok")
            return response.json();
        } else {
            //console.log("respons was not ok")
            return response.json().then(data => Promise.reject(data.error));
        }
    })
    .then(data => {
        // Open sidebar
        wrapper.classList.add("side-panel-open");

        // Populate selected questions
        const tableBody = document.querySelector('.selected-table tbody');
        tableBody.innerHTML = ""; // Clear existing content

        if (typeof data.question_order !== 'undefined' && data.question_order.length > 0) {
            data.question_order.forEach(question => {
                const row = tableBody.insertRow();
                row.dataset.questionId = question.question_id;

                const cell1 = row.insertCell(0);
                const cell2 = row.insertCell(1);
                const cell3 = row.insertCell(2);
                const cell4 = row.insertCell(3);
                // Populate input for question order
                const orderInput = document.createElement('input');
                orderInput.type = 'number';
                orderInput.name = 'question_order';
                orderInput.value = question.question_order;
                cell1.appendChild(orderInput);

                // Populate maximum points
                cell2.textContent = question.max_points;

                // Populate question desc
                cell3.textContent = question.question_desc;
                //populate question id
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'questionId';
                hiddenInput.value = question.question_id;
                cell4.appendChild(hiddenInput);
                // Add remove button
                const removeButtonCell = row.insertCell(3);
                removeButtonCell.appendChild(createRemoveButton(row));
            });
        } else {
            // Handle case where no questions are returned
            alert('No questions found for the provided test.');
        }

        // Update total points
        updateTotalPoints(data.total_score);
    })
    .catch(error => {
        // Handle fetch error
        console.error('Error:', error);
        alert('An error occurred while retrieving questions: ' + error);
    });
}




  // Function to adjust the position of the side panel based on scroll
  function adjustPanelPosition() {
    let newTopPosition = mainContainer.scrollTop;
    sidePanel.style.top = `${newTopPosition}px`;
    sidePanelToggle.style.top = `${newTopPosition + 20}px`;

    // Adjust position of animated border if it's being animated
    if(animatedBorder.classList.contains('animate')) {
      adjustAnimatedBorderPosition();
    }
  }

  // Add scroll event listener to main container for adjusting panel position
  mainContainer.addEventListener('scroll', adjustPanelPosition);

  // Add click event listener to side panel toggle button
  if (sidePanelToggle) {
    sidePanelToggle.addEventListener("click", () => {
      // Toggle class to open/close side panel
      wrapper.classList.toggle("side-panel-open");
      // Remove animation from animated border
      animatedBorder.classList.remove('animate');
    });
  }

  // Add click event listener to search button
  if (searchButton) {
    searchButton.addEventListener('click', handleSearchButtonClick);
  }

  // Add click event listener to add button
  if (addButton) {
    addButton.addEventListener('click', handleAddButtonClick);
  }

  // Function to handle search button click
  function handleSearchButtonClick(event) {
      // Prevent the default form submission behavior
      event.preventDefault();

      // Retrieve values from form inputs
      const bloomsTaxonomyValue = document.getElementById('blooms_level_dropdown').value;
      const subjectValue = document.getElementById('subject_dropdown').value;
      const topicValue = document.getElementById('topic_dropdown').value;
      const trainingLevelValue = document.getElementById('training_level_dropdown').value;
      const questionTypeValue = document.getElementById('question_type_dropdown').value;
      const questionDifficultyValue = document.getElementById('question_difficulty_dropdown').value;
      const questionMaxPointsInput = document.getElementById('question_max_points_input');

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

  // Function to handle add button click
  function handleAddButtonClick() {
    // Collect selected checkboxes
    const selectedCheckboxes = document.querySelectorAll('.results-table tbody input[type="checkbox"]:checked');

    if (selectedCheckboxes.length > 0) {
      // Add selected questions to selected table
      selectedCheckboxes.forEach(checkbox => {
        addQuestionToSelected(checkbox);
        checkbox.checked = false;
      });

      // Update total points and animate border
      updateTotalPoints()
      animatedBorder.classList.add('animate');
      adjustAnimatedBorderPosition()
    }
  }

  function addQuestionToSelected(checkbox) {
      const row = checkbox.closest('tr');
      const questionId = row.dataset.questionId;

      // Check if the question already exists in the selected table
      const existingQuestion = selectedTableBody.querySelector(`tr[data-question-id="${questionId}"]`);
      if (existingQuestion) {
          // If the question already exists, return without adding it again
          return;
      }

      const newRow = selectedTableBody.insertRow();
      newRow.dataset.questionId = questionId;

      const newCell1 = newRow.insertCell(0);
      const newCell2 = newRow.insertCell(1);
      const newCell3 = newRow.insertCell(2);
      const newCell4 = newRow.insertCell(3);

      const numInput = document.createElement('input');
      numInput.type = 'number';
      newCell1.appendChild(numInput);

      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = 'questionId';
      hiddenInput.value = questionId;
      newCell1.appendChild(hiddenInput);

      newCell2.textContent = row.cells[0].textContent;
      newCell3.textContent = row.cells[1].textContent;

      newCell4.appendChild(createRemoveButton(newRow));
  }
  // Function to create a remove button
  function createRemoveButton(row) {
    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.className = 'remove-button';
    removeButton.onclick = function() {
      row.remove();
      updateTotalPoints();
    };
    return removeButton;
  }

  // Function to update the total points in the selected table
  function updateTotalPoints() {
    let totalPoints = 0;
    // Calculate total points from selected table rows
    const selectedTableRows = document.querySelectorAll('.selected-table tbody tr');
    selectedTableRows.forEach(row => {
      totalPoints += parseInt(row.cells[1].textContent) || 0;
    });
    // Update total points display in the UI
    const submitTablePointValueTd = document.querySelector('.submit-table tr td:first-child');
    if (submitTablePointValueTd) {
      submitTablePointValueTd.textContent = totalPoints;
    }
  }

  // Function to calculate and return total points from selected table
  function getTotalPoints() {
    let totalPoints = 0;
    // Calculate total points from selected table rows
    const selectedTableRows = document.querySelectorAll('.selected-table tbody tr');
    selectedTableRows.forEach(row => {
      totalPoints += parseInt(row.cells[1].textContent) || 0;
    });
    return totalPoints;
  }

  // Function to handle submit button click
  document.getElementById('submit').addEventListener('click', function() {
    const selectedQuestions = document.querySelectorAll('.selected-table tbody tr');

    // Collect question order data
    const questionOrder = Array.from(selectedQuestions).map(row => {
      const input = row.querySelector('input[type="number"]');
      const questionId = row.dataset.questionId;
      const orderValue = input ? parseInt(input.value, 10) : null;
      return {
        question_id: questionId,
        question_order: !isNaN(orderValue) ? orderValue : null
      };
    });

    // Collect other form data
    const totalScore = parseInt(getTotalPoints(), 10);
    const testName = document.getElementById('test_name_input').value.trim();
    const testDescription = document.getElementById('test_description').value.trim();
    if (!testName || isNaN(totalScore) || !testDescription) {
      alert('Please fill in all the required fields correctly.');
      return;
    }

    const isActive = document.querySelector('.switch input[type="checkbox"]').checked;

    // Create request data object
    const requestData = {
      question_order: questionOrder,

      total_score: totalScore,
      test_name: testName,
      is_active: isActive,
      test_description: testDescription,
      test_type: "manual",
      testId: testId

    };

    // Send request to server via fetch
    fetch('/handle_test_creation_for_modify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
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

  // Function to adjust the position of the animated border
  function adjustAnimatedBorderPosition() {
    const toggleRect = sidePanelToggle.getBoundingClientRect();
    const containerRect = mainContainer.getBoundingClientRect();

    const topPosition = toggleRect.top - containerRect.top + mainContainer.scrollTop;
    const rightPosition = containerRect.right - toggleRect.right;

    animatedBorder.style.top = `${topPosition - 5}px`;
    animatedBorder.style.right = `${rightPosition - 17}px`;
    animatedBorder.style.width = `137px`;
    animatedBorder.style.height = `49px`;
  }

});
