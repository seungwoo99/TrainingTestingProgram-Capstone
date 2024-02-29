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
    event.preventDefault();
    // Collect form input values
    const bloomsTaxonomyValue = document.getElementById('blooms_taxonomy').value;
    const subjectValue = document.getElementById('subject').value;
    const topicValue = document.getElementById('topic').value;
    const trainingLevelValue = document.getElementById('training_level').value;
    const questionTypeValue = document.getElementById('question_type').value;
    const questionDifficultyValue = document.getElementById('question_difficulty').value;
    
    // Validate question max points input
    const questionMaxPointsValue = document.getElementById('question_max_points');
    questionMaxPointsValue.classList.remove('error');
    if (!questionMaxPointsValue.checkValidity()) {
      questionMaxPointsValue.classList.add('error');
      questionMaxPointsValue.reportValidity();
      return;
    }

    // Create form data object to send via fetch
    const questionQueryFormData = {
      blooms_taxonomy: bloomsTaxonomyValue !== "all" ? [bloomsTaxonomyValue] : [],
      subjects: subjectValue !== "all" ? [subjectValue] : [],
      topics: topicValue !== "all" ? [topicValue] : [],
      question_types: questionTypeValue !== "all" ? [questionTypeValue] : [],
      question_difficulties: questionDifficultyValue !== "all" ? [questionDifficultyValue] : [],
      question_max_points: questionMaxPointsValue.value,
      training_level: trainingLevelValue !== "all" ? trainingLevelValue : undefined,
      test_type: "manual"
    };

    // Send form data to server via fetch
    fetch('/get_questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(questionQueryFormData)
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
        console.log("Error in question retrieval occurred.");
        console.log('Data status:', data.status);
        console.log(`${status_code}: ${data.message}`);
        return handleAllErrors({status_code: status_code, json: () => Promise.resolve(data)});
      }
    
      console.log(data.message);
      return {data, status_code};
    })
    .then(({data}) => {
      // Clear existing table body content
      const resultsTable = document.querySelector(".results-table");
      const tableBody = resultsTable.querySelector("tbody");
      tableBody.innerHTML = "";
      
      data.selected_questions.forEach(question => {
        const row = tableBody.insertRow();
        row.dataset.questionId = question.question_id;
    
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        const cell3 = row.insertCell(2);
    
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'select_question';
        checkbox.value = question.question_id; 
        cell3.appendChild(checkbox);
    
        cell1.textContent = question.max_points;
        cell2.textContent = question.question_desc;
      });
    })
    .catch(error => {
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
  
  // Function to add a question to the selected table
  function addQuestionToSelected(checkbox) {
    const row = checkbox.closest('tr');
    const questionId = row.dataset.questionId;

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
    const testName = document.getElementById('test_name').value.trim();
    const testDescription = document.getElementById('test_description').value.trim();
    if (!testName || isNaN(totalScore) || !testDescription) {
      alert('Please fill in all the required fields correctly.');
      return; // Stop execution if validation fails
    }
  
    const isActive = document.querySelector('.switch input[type="checkbox"]').checked;

    // Create request data object
    const testCreationData = {
      question_order: questionOrder,
      total_score: totalScore,
      test_name: testName,
      is_active: isActive,
      test_description: testDescription,
    };

    // Send request to server via fetch
    console.log('Attempting test creation.');
    fetch('/test_creation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCreationData)
    }).then(response => {
      return response.json().then(data => ({data, status_code: response.status}));
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
            element.classList.add("error");
            element.focus();
          }
          return Promise.reject('Process terminated so user can choose a different name.')
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
