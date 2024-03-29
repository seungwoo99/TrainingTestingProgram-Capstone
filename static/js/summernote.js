$(document).ready(function() {
  $('#summernote1').summernote({
    toolbar: [
      ['style', ['style']],
      ['font', ['bold', 'underline', 'clear']],
      ['fontname', ['fontname']],
      ['color', ['color']],
      ['fontsize', ['fontsize']],
      ['para', ['ul', 'ol', 'paragraph']],
      ['insert', ['picture']],
      ['view', ['fullscreen', 'codeview', 'help']],
      ['height', ['height']]
    ],
    fontSizes: ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '36'],
    width: "830px"
  });
  $('#summernote2').summernote({
    toolbar: [
      ['style', ['style']],
      ['font', ['bold', 'underline', 'clear']],
      ['fontname', ['fontname']],
      ['color', ['color']],
      ['fontsize', ['fontsize']],
      ['para', ['ul', 'ol', 'paragraph']],
      ['insert', ['picture']],
      ['view', ['fullscreen', 'codeview', 'help']],
      ['height', ['height']]
    ],
    fontSizes: ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '36'],
    width: "830px"
  });

  // Replace Summernote content with predefined HTML when a button is clicked
  $('.predefined-content-btn').on('click', function() {
    var predefinedHTML = $(this).data('html');
    $('#summernote1').summernote('code', predefinedHTML);
  });
});

function addQuestion(input_obj_id) {
    var obj_id = input_obj_id;
    var question_desc = $('input[name="question_desc"]').val();
    var question_text = $('#summernote1').summernote('code');
    var question_answer = $('#summernote2').summernote('code');
    var question_type = $('input[name="question_type"]').val();
    var question_difficulty = $('input[name="question_difficulty"]').val();
    var answer_explanation = $('input[name="answer_explanation"]').val();
    var points_definition = $('input[name="points_definition"]').val();
    var max_points = $('input[name="max_points"]').val();
    var source = $('input[name="source"]').val();

    //validation
    if (question_desc === "") {
        alert("Question description must be entered.");
        return;
    }

    if (question_text === "<p><br></p>" || question_text === "<br>") {
        alert("Question text must be entered.");
        return;
    }

    if (question_type === "") {
        alert("Question type must be entered.");
        return;
    }

    question_difficulty = parseInt(question_difficulty);
    if (!(question_difficulty <= 5 && question_difficulty >= 1 && question_difficulty !== "")) {
        alert("Question difficulty must be entered and be a whole number between 1 - 5");
        return;
    }

    if (points_definition === "") {
        alert("points rubric must be entered.");
        return;
    }

    max_points = parseInt(max_points);

    if (!(max_points > 0)) {
        alert("Max points must be entered, larger than 0, and a whole integer");
        return;
    }

    console.log('Objective ID:', obj_id);
    console.log('Question Description:', question_desc);
    console.log('Question Text:', question_text);
    console.log('Question Answer:', question_answer);
    console.log('Question Type:', question_type);
    console.log('Question Difficulty:', question_difficulty);
    console.log('Answer Explanation:', answer_explanation);
    console.log('Points Definition:', points_definition);
    console.log('Max Points:', points_definition);
    console.log('Source:', source);

    // Use jQuery AJAX to send the content to a Flask route
    $.ajax({
        type: 'POST',
        url: '/process_question',
        data: {
            obj_id: obj_id,
            question_desc: question_desc,
            question_text: question_text,
            question_answer: question_answer,
            question_type: question_type,
            question_difficulty: question_difficulty,
            answer_explanation: answer_explanation,
            points_definition: points_definition,
            max_points: max_points,
            source: source
        },
        success: function(response) {
            console.log(response); // Handle the response from the server
            alert(response);
            window.onbeforeunload = function() {
                if (window.opener && !window.opener.closed) {
                    window.opener.refreshParent(); // Call the refreshParent function in the parent window
                }
            };
            window.close();
        }
    });
}

function editQuestion(input_obj_id,input_question_id) {
    var obj_id = input_obj_id;
    var question_id = input_question_id;
    var question_desc = $('input[name="question_desc"]').val();
    var question_text = $('#summernote1').summernote('code');
    var question_answer = $('#summernote2').summernote('code');
    var question_type = $('input[name="question_type"]').val();
    var question_difficulty = $('input[name="question_difficulty"]').val();
    var answer_explanation = $('input[name="answer_explanation"]').val();
    var points_definition = $('input[name="points_definition"]').val();
    var max_points = $('input[name="max_points"]').val();
    var source = $('input[name="source"]').val();

    //validation
    if (question_desc === "") {
        alert("Question description must be entered.");
        return;
    }

    if (question_text === "<p><br></p>" || question_text === "<br>") {
        alert("Question text must be entered.");
        return;
    }

    if (question_type === "") {
        alert("Question type must be entered.");
        return;
    }

    question_difficulty = parseInt(question_difficulty);
    if (!(question_difficulty <= 5 && question_difficulty >= 1 && question_difficulty !== "")) {
        alert("Question difficulty must be entered and be a whole number between 1 - 5");
        return;
    }

    if (points_definition === "") {
        alert("points rubric must be entered.");
        return;
    }

    max_points = parseInt(max_points);

    if (!(max_points > 0)) {
        alert("Max points must be entered, larger than 0, and a whole integer");
        return;
    }

    console.log('Objective ID:', obj_id);
    console.log('Question Description:', question_desc);
    console.log('Question Text:', question_text);
    console.log('Question Answer:', question_answer);
    console.log('Question Type:', question_type);
    console.log('Question Difficulty:', question_difficulty);
    console.log('Answer Explanation:', answer_explanation);
    console.log('Points Definition:', points_definition);
    console.log('Max Points:', points_definition);
    console.log('Source:', source);

    // Use jQuery AJAX to send the content to a Flask route
    $.ajax({
        type: 'POST',
        url: '/modify_question',
        data: {
            obj_id: obj_id,
            question_id: question_id,
            question_desc: question_desc,
            question_text: question_text,
            question_answer: question_answer,
            question_type: question_type,
            question_difficulty: question_difficulty,
            answer_explanation: answer_explanation,
            points_definition: points_definition,
            max_points: max_points,
            source: source
        },
        success: function(response) {
            console.log(response); // Handle the response from the server
            alert(response);
            window.onbeforeunload = function() {
                if (window.opener && !window.opener.closed) {
                    window.opener.refreshParent(); // Call the refreshParent function in the parent window
                }
            };
            window.close();
        }
    });
}
