document.addEventListener('DOMContentLoaded', (event) => {
  
  const toggleButton = document.querySelector(".side-panel-toggle");
  const wrapper = document.querySelector(".wrapper");
  
  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      console.log("Button clicked");
      wrapper.classList.toggle("side-panel-open");
      console.log("Toggled class:", wrapper.classList);
    });
  }

  var searchButton = document.getElementById('search'); 
  if (searchButton) {
    searchButton.addEventListener('click', function (event) {
      event.preventDefault();

      var bloomsLevelValue = document.getElementById('blooms_level_dropdown').value;
      var subjectValue = document.getElementById('subject_dropdown').value;
      var topicValue = document.getElementById('topic_dropdown').value;
      var trainingLevelValue = document.getElementById('training_level_dropdown').value;
      var questionTypeValue = document.getElementById('question_type_dropdown').value;
      var questionDifficultyValue = document.getElementById('question_difficulty_dropdown').value;
      var questionMaxPointValue = document.getElementById('question_max_points_input').value;
      //var keywordValue = document.querySelector('input[type="text"][name="keyword"]').value; 

      var formData = {
        blooms_levels: bloomsLevelValue !== "all" ? [bloomsLevelValue] : [],
        subjects: subjectValue !== "all" ? [subjectValue] : [],
        topics: topicValue !== "all" ? [topicValue] : [],
        question_types: questionTypeValue !== "all" ? [questionTypeValue] : [],
        question_difficulties: questionDifficultyValue !== "all" ? [questionDifficultyValue] : [],
        question_max_points: questionMaxPointValue,
        training_level: trainingLevelValue !== "all" ? trainingLevelValue : undefined,
        //keyword: keywordValue,
        test_type: "manual"
      };

      fetch('/get-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      .then(response => response.json())
      .then(data => {
        console.log('Success:', data);
        if (typeof data.total_questions_in_pool !== 'undefined' && data.selected_questions) {
          var resultsTable = document.querySelector(".results-table");
          var tableBody = resultsTable.querySelector("tbody");
          tableBody.innerHTML = "";
      
          if (data.total_questions_in_pool === 0) {
            alert(data.message || "No questions found that meet the selection criteria.");
          } else {
            data.selected_questions.forEach(function(question) {
              var row = tableBody.insertRow();
              var cell1 = row.insertCell(0);
              var cell2 = row.insertCell(1);
              var cell3 = row.insertCell(2);
      
              cell1.textContent = question.question_id;
              cell2.textContent = question.question_text;
              cell3.innerHTML = '<input type="checkbox" name="select_question" value="' + question.question_id + '">';
            });
          }
        } else {
          console.error('Error: Missing data from server response.');
          alert('An error occurred while processing your request. Please try again.');
        }
      })      
    });
  }
});