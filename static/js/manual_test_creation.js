document.addEventListener('DOMContentLoaded', (event) => {
  
  const mainContainer = document.querySelector(".main-container");
  const sidePanelToggle = document.querySelector(".side-panel-toggle");
  const sidePanel = document.querySelector(".side-panel");
  const addButton = document.getElementById('add');
  const searchButton = document.getElementById('search');
  const selectedTableBody = document.querySelector('.selected-table tbody');
  const wrapper = document.querySelector(".wrapper");
  const animatedBorder = document.querySelector('.animated-border');
  
  function adjustPanelPosition() {
    let newTopPosition = mainContainer.scrollTop;
    sidePanel.style.top = `${newTopPosition}px`;
    sidePanelToggle.style.top = `${newTopPosition + 20}px`;

    if(animatedBorder.classList.contains('animate')) {
      adjustAnimatedBorderPosition();
    }
  }

  mainContainer.addEventListener('scroll', adjustPanelPosition);

  if (sidePanelToggle) {
    sidePanelToggle.addEventListener("click", () => {
      wrapper.classList.toggle("side-panel-open");
      animatedBorder.classList.remove('animate');
    });
  }

  if (searchButton) {
    searchButton.addEventListener('click', handleSearchButtonClick);
  }

  if (addButton) {
    addButton.addEventListener('click', handleAddButtonClick);
  }

  function handleSearchButtonClick(event) {
    event.preventDefault();
    const bloomsTaxonomyValue = document.getElementById('blooms_taxonomy').value;
    const subjectValue = document.getElementById('subject').value;
    const topicValue = document.getElementById('topic').value;
    const trainingLevelValue = document.getElementById('training_level').value;
    const questionTypeValue = document.getElementById('question_type').value;
    const questionDifficultyValue = document.getElementById('question_difficulty').value;
    const questionMaxPointsInput = document.getElementById('question_max_points');

    let isValid = true;

    const questionMaxPointsValue = parseInt(questionMaxPointsInput.value, 10);
    if (isNaN(questionMaxPointsValue) || questionMaxPointsValue <= 0) {
      questionMaxPointsInput.classList.add('error');
      isValid = false;
    } else {
      questionMaxPointsInput.classList.remove('error');
    }

    console.log(questionMaxPointsValue);

    if (!isValid) {
      alert('Please ensure the maximum points for a question is a valid number greater than 0.');
      return false;
    }

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
        resetInputs();
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

  function handleAddButtonClick() {
    const selectedCheckboxes = document.querySelectorAll('.results-table tbody input[type="checkbox"]:checked');
  
    if (selectedCheckboxes.length > 0) {
      selectedCheckboxes.forEach(checkbox => {
        addQuestionToSelected(checkbox);
        checkbox.checked = false;
      });
  
      updateTotalPoints()
      animatedBorder.classList.add('animate');
      adjustAnimatedBorderPosition()
    }
  }
  
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
    numInput.min = '1';
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

  function updateTotalPoints() {
    let totalPoints = 0;
    const selectedTableRows = document.querySelectorAll('.selected-table tbody tr');
    selectedTableRows.forEach(row => {
      totalPoints += parseInt(row.cells[1].textContent) || 0;
    });
    const submitTablePointValueTd = document.querySelector('.submit-table tr td:first-child');
    if (submitTablePointValueTd) {
      submitTablePointValueTd.textContent = totalPoints;
    }
  }

  function getTotalPoints() {
    let totalPoints = 0;
    const selectedTableRows = document.querySelectorAll('.selected-table tbody tr');
    selectedTableRows.forEach(row => {
      totalPoints += parseInt(row.cells[1].textContent) || 0;
    });
    return totalPoints;
  }

  document.getElementById('submit').addEventListener('click', function() {
    console.log('Starting test creation process.')
    console.log('Validating and collecting data.')
    const selectedQuestions = document.querySelectorAll('.selected-table tbody tr');
    let isValid = true;

    const questionOrder = Array.from(selectedQuestions).map(row => {
      const input = row.querySelector('input[type="number"]');
      const questionId = row.dataset.questionId;
      const orderValue = input ? parseInt(input.value, 10) : null;

      if (orderValue <= 0 || isNaN(orderValue)) {
        input.classList.add('error');
        isValid = false;
      } else {
        input.classList.remove('error');
      }

      return {
        question_id: questionId,
        question_order: !isNaN(orderValue) && orderValue > 0 ? orderValue : null
      };
    });

    const testNameInput = document.getElementById('test_name');
    const testNameValue = document.getElementById('test_name').value.trim();
    if (!testNameInput.value.trim()) {
      testNameInput.classList.add('error');
      isValid = false;
    } else {
      testNameInput.classList.remove('error');
    }

    const testDescriptionInput = document.getElementById('test_description');
    const testDescriptionValue = document.getElementById('test_description').value.trim();
    if (!testDescriptionInput.value.trim()) {
      testDescriptionInput.classList.add('error');
      isValid = false;
    } else {
      testDescriptionInput.classList.remove('error');
    }

    if (!isValid) {
      alert('Please fill in all the required fields correctly.');
      return;
    }
    
    console.log('Validation completed.')

    const totalScoreValue = parseInt(getTotalPoints(), 10);
    const isActiveValue = document.querySelector('.switch input[type="checkbox"]').checked;

    const testCreationData = {
      question_order: questionOrder,
      total_score: totalScoreValue,
      test_name: testNameValue,
      is_active: isActiveValue,
      test_description: testDescriptionValue,
    };
    
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
      } else {
        const testId = data.test_id;
        console.log(`Test created successfully with ID: ${testId}`);
        
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/generate_test';
        form.target = '_blank';
        
        const testIdInput = document.createElement('input');
        testIdInput.type = 'hidden';
        testIdInput.name = 'test_id';
        testIdInput.value = testId;
        
        form.appendChild(testIdInput);
        
        document.body.appendChild(form);

        resetInputs();
        
        form.submit();
      }
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

  function resetInputs() {
    // Clear select elements
    const selectElements = document.querySelectorAll('select');
    selectElements.forEach(select => {
      select.selectedIndex = 0; // Select the first option (assuming it's the default option)
    });
  
    // Clear input fields
    const inputElements = document.querySelectorAll('input[type="text"], input[type="number"]');
    inputElements.forEach(input => {
      input.value = ''; // Clear the value
    });
  }
  
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
