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
    width: "7.8in"
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
    width: "7.8in"
  });

  // Replace Summernote content with predefined HTML when a button is clicked
  $('.predefined-content-btn').on('click', function() {
    var predefinedHTML = $(this).data('html');
    $('#summernote1').summernote('code', predefinedHTML);
  });
});

function getEditorContent() {
    var htmlContent = $('#summernote').summernote('code');
    console.log(htmlContent);

    // Use jQuery AJAX to send the content to a Flask route
    $.ajax({
        type: 'POST',
        url: '/process_question',
        data: { content: htmlContent },
        success: function(response) {
            console.log(response); // Handle the response from the server
        }
    });
}