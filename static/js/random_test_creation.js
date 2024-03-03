document.addEventListener('DOMContentLoaded', function () {
  
  const toggleDivs = document.querySelectorAll('.toggle-btn');
  const confirmButton = document.getElementById('confirm-selection');
  const categoryButtons = document.querySelectorAll('.select-category'); 

  function updateSelection(category, isChecked) {
    document.querySelectorAll(`.toggle-btn input[data-category='${category}']`).forEach(function (checkbox) {
      checkbox.checked = isChecked;
      const div = checkbox.closest('.toggle-btn');
      div.setAttribute('data-selected', isChecked);
      div.classList.toggle('selected', isChecked);
    });
    updateCategoryButtonState(category, isChecked);
  }

  function updateCategoryButtonState(category, isChecked) {
    const allSelected = Array.from(document.querySelectorAll(`.toggle-btn input[data-category='${category}']`)).every(checkbox => checkbox.checked);
    const categoryButton = document.querySelector(`.select-category[data-category='${category}']`);
    if (categoryButton) {
      categoryButton.classList.toggle('selected', allSelected);
    }
  }

  toggleDivs.forEach(function (div) {
    div.addEventListener('click', function () {
      const checkbox = div.querySelector('input[type="checkbox"]');
      checkbox.checked = !checkbox.checked;
      div.setAttribute('data-selected', checkbox.checked);
      div.classList.toggle('selected', checkbox.checked);

      const category = checkbox.getAttribute('data-category');
      updateCategoryButtonState(category, checkbox.checked);
    });
  });

  categoryButtons.forEach(function (button) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      const category = button.getAttribute('data-category');
      const isChecked = !button.classList.contains('selected');
      updateSelection(category, isChecked);
    });
  });  

  if (confirmButton) {
    confirmButton.addEventListener('click', function () {
      console.log('Confirm button clicked');
      
      confirmButton.disabled = true;
      confirmButton.classList.add('disabled');
      showProcessingOverlay()

      const selectedData = {
        blooms_taxonomy: [],
        subjects: [],
        topics: [],
        question_types: [],
        question_difficulties: []
      };

      toggleDivs.forEach(function (div) {
        const checkbox = div.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
          const category = checkbox.getAttribute('data-category');
          if (selectedData.hasOwnProperty(category)) {
            selectedData[category].push(checkbox.value);
          }
        }
      });

      console.log('Selected Data:', selectedData);
      let isValid = true; 

      const testNameInput = document.getElementById('test_name');
      const testNameValue = document.getElementById('test_name').value.trim();
      if (!testNameInput.value.trim()) {
        testNameInput.classList.add('error');
        isValid = false;
      } else {
        testNameInput.classList.remove('error');
      }
      
      const numQuestionsInput = document.getElementById('number_of_questions');
      const numQuestionsValue = parseInt(numQuestionsInput.value, 10);
      if (isNaN(numQuestionsValue) || numQuestionsValue <= 0) {
        numQuestionsInput.classList.add('error');
        isValid = false;
      } else {
        numQuestionsInput.classList.remove('error');
      }
      
      const testMaxPointsInput = document.getElementById('test_max_points');
      const testMaxPointsValue = parseInt(testMaxPointsInput.value, 10);
      if (isNaN(testMaxPointsValue) || testMaxPointsValue <= 0) {
        testMaxPointsInput.classList.add('error');
        isValid = false;
      } else {
        testMaxPointsInput.classList.remove('error');
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
        resetConfirmButtonState();
        setTimeout(() => {
          alert('Please fill in all the required fields correctly.');
        }, 100);
      }

      const trainingLevelValue = document.getElementById('training_level').value;
      const isActiveValue = document.querySelector('.switch input[type="checkbox"]').checked;

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
          resetConfirmButtonState();
          setTimeout(() => {
            alert('No questions found that meet the selection criteria. Select new criteria and try again.');
            resetInputs();
          }, 100);
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
          resetConfirmButtonState();
          
          form.submit();
        }
      })
      .catch(error => {
        console.error('Error occurred in test creation process: ', error.message || error);
        resetConfirmButtonState()
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
              resetInputs();
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
});