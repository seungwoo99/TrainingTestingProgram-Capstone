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
    const bloomsTaxonomyValue = document.getElementById('blooms_level_dropdown').value;
    const subjectValue = document.getElementById('subject_dropdown').value;
    const topicValue = document.getElementById('topic_dropdown').value;
    const trainingLevelValue = document.getElementById('training_level_dropdown').value;
    const questionTypeValue = document.getElementById('question_type_dropdown').value;
    const questionDifficultyValue = document.getElementById('question_difficulty_dropdown').value;
    const questionMaxPointValue = document.getElementById('question_max_points_input').value;
    
    // Validate question max points input
    const questionMaxPointsInput = document.getElementById('question_max_points_input');
    questionMaxPointsInput.classList.remove('error');
    if (!questionMaxPointsInput.checkValidity()) {
      questionMaxPointsInput.classList.add('error');
      questionMaxPointsInput.reportValidity();
      return;
    }

    // Create form data object to send via fetch
    const formData = {
      blooms_levels: bloomsTaxonomyValue !== "all" ? [bloomsTaxonomyValue] : [],
      subjects: subjectValue !== "all" ? [subjectValue] : [],
      topics: topicValue !== "all" ? [topicValue] : [],
      question_types: questionTypeValue !== "all" ? [questionTypeValue] : [],
      question_difficulties: questionDifficultyValue !== "all" ? [questionDifficultyValue] : [],
      question_max_points: questionMaxPointValue,
      training_level: trainingLevelValue !== "all" ? trainingLevelValue : undefined,
      test_type: "manual"
    };

    // Send form data to server via fetch
    fetch('/get_questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
      // Clear existing table body content
      const resultsTable = document.querySelector(".results-table");
      const tableBody = resultsTable.querySelector("tbody");
      tableBody.innerHTML = "";

      // Populate table with received data or show alert if no data
      if (typeof data.total_questions_in_pool !== 'undefined' && data.selected_questions) {
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
      } else if (data.total_questions_in_pool === 0) {
        alert(data.message || "No questions found that meet the selection criteria.");
      } else {
        console.error('Error: Missing data from server response.');
        alert('An error occurred while processing your request. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('An error occurred while processing your request. Please check your network connection and try again.');
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
    };
  
    // Send request to server via fetch
    fetch('/test_creation', {
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
