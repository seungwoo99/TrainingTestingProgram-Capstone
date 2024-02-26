/* Add new tester record */
function addRecord(test_id, tester_id, testee_name){
     // Show the pop-up page when Add button is clicked on tester_table.html
    const modal = document.getElementById('new_record');
    modal.style.display = 'block';

    // Get tester name data from the table row
    const name = document.getElementById('name');
    name.textContent = "Add New Record to " + testee_name;

    // Action when addNewRecord button is clicked on tester_list.html
    const addNewRecordBtn = document.getElementById('addNewRecord');
    addNewRecordBtn.addEventListener('click', function(){
        //Get user input data
        const newAttemptDate = document.getElementById('new_attemptDate').value;
        let score = document.getElementById('new_score').value;
        const passStatusCheck = document.getElementById('passStatus');
        let passStatus;

        // Display error Message when there is no input for attempt date
        if(!newAttemptDate.trim()){
            document.getElementById('newAttemptDateError').style.display = 'block';
        }else{
            document.getElementById('newAttemptDateError').style.display = 'none';
        }
        // Set score to -1 when user did not enter tester score
        if(!score.trim()){
            score = '-1'; // Will be displayed N/A on the page
        }
        // Check pass status checkbox
        if(passStatusCheck.checked){
            passStatus = 1;
        }else{
            passStatus = 0;
        }

        // Sends data to flask to add record
        if(newAttemptDate.trim() && score.trim()){
            //send data to flask
            let xhr = new XMLHttpRequest();
            let json = JSON.stringify({
                test_id:test_id,tester_id:tester_id, attemptDate:newAttemptDate, score:score, passStatus:passStatus
            });
            xhr.open("POST", '/add_record')
            xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');

            xhr.send(json);
            xhr.onload = function(event){
                window.location.reload();
            }
            modal.style.display = 'none';
        }
    });
}

// Wait for the DOM content to be fully loaded before executing JavaScript
document.addEventListener('DOMContentLoaded', function() {

    /* JS code for drop down table that displays tester's history */
    const dropdownTriggers = document.querySelectorAll('.dropdown-history');
    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(event) {
            const selectedRow = this.closest('tr'); // Get the closest parent <tr> element
            const dropdownTable = selectedRow.nextElementSibling;

            // Toggle visibility of the dropdown table
            dropdownTable.classList.toggle('show');
            sendTesterData(selectedRow);
        });
    });

    // Function that sends data to Flask to get tester's all history records
    function sendTesterData(selectedRow){
        const row = selectedRow.closest('tr');
        var testerId = row.getAttribute('data-tester-id');
        var testId  = row.getAttribute('data-test-id');
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/display_history?testerId=' + testerId + '&testId=' + testId, true);
        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && xhr.status == 200){
                document.getElementById('historyData_'+testerId).innerHTML = xhr.responseText;
            }
        };
        xhr.send();
    }

    /* Editing tester's attempt date, score, pass status */
    const table = document.querySelector('table');
    table.addEventListener('click', function(event) {
        const target = event.target;
        const scoreCell = target.closest('.score-cell');
        const attemptDateCell = target.closest('.attemptDate-cell');
        const passStatusCell = target.closest('.passStatus-cell');
        let isEditing;
        let isDateEditing;
        let isStatusEditing;

        if (!scoreCell && !attemptDateCell && !passStatusCell) {
            return; // Exit if the click is not on attempt date cell, grade cell, and pass status cell
        }else if(attemptDateCell){
            isDateEditing = attemptDateCell.querySelector('input'); // When attempt date cell is clicked
        }else if(scoreCell){
            isEditing = scoreCell.querySelector('input'); // When score cell is clicked
        }else if(passStatusCell){
            isStatusEditing = passStatusCell.querySelector('input'); // When pass status cell is clicked
        }

        // Enable editing score
        if (scoreCell && !isEditing) {
            // Add input field to enter score
            const inputField = document.createElement('input');
            inputField.type = 'number';
            inputField.value = scoreCell.textContent.trim();
            scoreCell.textContent = '';
            scoreCell.appendChild(inputField);
            inputField.focus();

            // Show the edit button
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', function(){
                // Send modified score data
                updateScore(scoreCell);
            });
            scoreCell.appendChild(editBtn);

            // Only allows numerical values
            inputField.addEventListener('keypress', function(event) {
                const keyCode = event.keyCode;
                const isValidInput = (keyCode >= 48 && keyCode <= 57);
                if (!isValidInput) {
                    event.preventDefault();
                }
            });
        }else if (attemptDateCell && !isDateEditing) { // Enable editing attempt date
            //Add input field to get attempt date data
            const dateInputField = document.createElement('input');
            dateInputField.type = 'datetime-local';
            dateInputField.value = attemptDateCell.textContent.trim();
            attemptDateCell.textContent = '';
            attemptDateCell.appendChild(dateInputField);
            dateInputField.focus(); // Focus on the input field

            // Show the edit button
            const dateEditBtn = document.createElement('button');
            dateEditBtn.textContent = 'Edit';
            dateEditBtn.addEventListener('click', function(){
                // Send modified attempt date data
                updateDate(attemptDateCell);
            });
            attemptDateCell.appendChild(dateEditBtn);

        }else if(passStatusCell && !isStatusEditing){ // Enable editing pass status
            // Add input fields to select pass status
            const passInputField = document.createElement('input');
            passInputField.type = 'radio';
            passInputField.id = 'passRadio';
            passInputField.checked = (passStatusCell.textContent.trim().toLowerCase() === 'pass');
            const failInputField = document.createElement('input');
            failInputField.type = 'radio';
            failInputField.checked = (passStatusCell.textContent.trim().toLowerCase() === 'fail');

            // Add labels to display text
            const passLabel = document.createElement('label');
            passLabel.textContent = 'PASS';
            const failLabel = document.createElement('label');
            failLabel.textContent = 'FAIL';

            passStatusCell.textContent = '';
            passStatusCell.appendChild(passInputField);
            passStatusCell.appendChild(passLabel);
            passStatusCell.appendChild(failInputField);
            passStatusCell.appendChild(failLabel);

            // Action when fail radio input field is clicked
            failInputField.addEventListener('click', function(){
                passInputField.checked = false;
                failInputField.checked = true;
            });
            // Action when pass radio input field is clicked
            passInputField.addEventListener('click', function(){
                passInputField.checked = true;
                failInputField.checked = false;
            });

            // Show the edit button
            const statusEditBtn = document.createElement('button');
            statusEditBtn.textContent = 'Edit';
            statusEditBtn.addEventListener('click', function(){
                // Send modified pass status data
                updateStatus(passStatusCell);
            });
            passStatusCell.appendChild(statusEditBtn);
        }
    });

    // Update score function
    function updateScore(scoreCell) {
        const newGrade = scoreCell.querySelector('input').value;
        scoreCell.textContent = newGrade;

        // Remove input field
        const inputField = scoreCell.querySelector('input');
        if (inputField) {
            inputField.remove();
        }
        // Remove edit button
        const editBtn = scoreCell.querySelector('button');
        if (editBtn) {
            editBtn.remove();
        }
        //send data
        sendData(scoreCell, newGrade);
    }
    //send new score to flask to update score
    function sendData(scoreCell, newGrade){
        const row = scoreCell.closest('tr');
        const scoreId = row.getAttribute('data-score-id');
        const testerId = row.getAttribute('data-tester-id');
        const testId  = row.getAttribute('data-test-id');
        let xhr = new XMLHttpRequest();
        xhr.open('GET', '/update_score?scoreId=' + scoreId +'&testerId=' + testerId + '&testId=' + testId + '&newGrade=' + newGrade,true);
        xhr.onreadystatechange = function() {
            if(xhr.readyState == 4 && xhr.status == 200){
                document.getElementById('datasTable').innerHTML = xhr.responseText;
                window.location.reload();
            }
        };
        xhr.send();
    }

    // Update attempt date function
    function updateDate(attemptDateCell) {
        const newDate = attemptDateCell.querySelector('input').value;
        attemptDateCell.textContent = newDate;

        // Remove input field
        const inputField = attemptDateCell.querySelector('input');
        if(inputField){
            inputField.remove();
        }
        // Remove edit button
        const editBtn = attemptDateCell.querySelector('button');
        if(editBtn){
            editBtn.remove();
        }
        //send date
        const row = attemptDateCell.closest('tr');
        const scoreId = row.getAttribute('data-score-id');
        const testerId = row.getAttribute('data-tester-id');
        const testId = row.getAttribute('data-test-id');
        let xhr = new XMLHttpRequest();

        let json = JSON.stringify({
            scoreId:scoreId, newDate:newDate, testerId:testerId, testId:testId
        });
        xhr.open("POST", '/update_date')
        xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');

        xhr.send(json);
        xhr.onload = function(event){
            window.location.reload();
        }
    }

    // Update pass status function
    function updateStatus(passStatusCell){
        const inputField = passStatusCell.querySelectorAll('input');
        let newStatus;
        if(inputField[0].checked){
            newStatus = 1;
            passStatusCell.textContent = 'PASS';
        }else{
            newStatus = 0;
            passStatusCell.textContent = 'FAIL';
        }

        // Remove input field
        passStatusCell.querySelectorAll('input').forEach(input => {
            input.remove();
        });
        // Remove labels
        passStatusCell.querySelectorAll('label').forEach(label => {
            label.remove();
        });
        // Remove edit button
        const editBtn = passStatusCell.querySelector('button');
        if(editBtn){
            editBtn.remove();
        }

        //send data
        const row = passStatusCell.closest('tr');
        const scoreId = row.getAttribute('data-score-id');
        const testerId = row.getAttribute('data-tester-id');
        const testId = row.getAttribute('data-test-id');
        let xhr = new XMLHttpRequest();

        let json = JSON.stringify({
            scoreId:scoreId, newStatus:newStatus, testerId:testerId, testId:testId
        });
        xhr.open("POST", '/update_status')
        xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');

        xhr.send(json);
        xhr.onload = function(event){
            window.location.reload();
        }
    }

    // Displays pop-up page to insert new tester data on the list
    const addButton = document.getElementById('addTester');
    const modal = document.getElementById('new_tester');
    const closeButton = modal.querySelector('.close');

    // Display pop-up page when button is clicked
    addButton.addEventListener('click', function() {
        modal.style.display = 'block'; // Show the modal when Add button is clicked
    });
    // Hide the pop-up page when the close button is clicked
    closeButton.addEventListener('click', function() {
        modal.style.display = 'none';
        window.location.reload();
    });
    // Close the modal if user clicks anywhere outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            window.location.reload();
        }
    });

    // Action when fail radio input field is clicked
    const newTesterRadio = document.getElementById('newTesterRadio');
    const existTesterRadio = document.getElementById('existTesterRadio');
    newTesterRadio.addEventListener('click', function(){
        existTesterRadio.checked = false;
        newTesterRadio.checked = true;
    });
    // Action when pass radio input field is clicked
    existTesterRadio.addEventListener('click', function(){
        existTesterRadio.checked = true;
        newTesterRadio.checked = false;
    });

    // check box that enables to select tester option
    const checkboxes = document.querySelectorAll('.tester_option input[type="radio"]');
    const dropdown = document.getElementById('dropdown');
    const testerNameInput = document.getElementById('testerName');

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
        if (this.value === 'exist') {
            dropdown.style.display = 'block';
            testerNameInput.style.display = 'none';
        }else{
            dropdown.style.display = 'none';
            testerNameInput.style.display = 'block';
        }
        // Uncheck all other checkboxes
            checkboxes.forEach(otherCheckbox => {
                if (otherCheckbox !== this) {
                    otherCheckbox.checked = false;
                }
            });
        });
    });

    //when addNewTester button is clicked
    const addNewTesterBtn = document.getElementById('addNewTester');
    addNewTesterBtn.addEventListener('click', function(){
        // Get input field values
        const testerName = document.getElementById('testerName').value;
        let testerId = document.getElementById('dropdown').value;
        const existChecked = document.getElementById('existTesterRadio');
        const attemptDate = document.getElementById('attemptDate').value;
        let score = document.getElementById('score').value;
        const passStatusCheck = document.getElementById('newPassStatus');
        let passStatus;
        const testId = this.getAttribute('data-test-id');

        // Displays error messages if there is no input
        if(!testerName.trim() && !existChecked.checked){
            document.getElementById('testerNameError').style.display = 'block';
        }else{
            document.getElementById('testerNameError').style.display = 'none';
        }
        if(testerId === '' && existChecked.checked){
            document.getElementById('testerIdError').style.display = 'block';
        }else{
            document.getElementById('testerIdError').style.display = 'none';
        }
        if(!attemptDate.trim()){
            document.getElementById('attemptDateError').style.display = 'block';
        }else{
            document.getElementById('attemptDateError').style.display = 'none';
        }
        // Set score to -1, when there is no input for score value
        if(!score.trim()){
            score = '-1';
        }
        // Check pass status checkbox
        if(passStatusCheck.checked){
            passStatus = 1;
        }else{
            passStatus = 0;
        }

        // When user selects new tester check box
        if(testerName.trim() && attemptDate.trim() && score.trim() && !existChecked.checked){
            //send data to flask
            let xhr = new XMLHttpRequest();

            let json = JSON.stringify({
                testerName:testerName, attemptDate:attemptDate, score:score, passStatus:passStatus, testId:testId
            });
            xhr.open("POST", '/add_new_tester')
            xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');

            xhr.send(json);
            xhr.onload = function(event){
                window.location.reload();
            }
            modal.style.display = 'none';

        // When user selects existing tester check box
        }else if(testerId !== '' && attemptDate.trim() && score.trim() && existChecked.checked){
            //send data to flask
            let xhr = new XMLHttpRequest();

            let json = JSON.stringify({
                testerId:testerId, attemptDate:attemptDate, score:score, passStatus:passStatus, testId:testId
            });
            xhr.open("POST", '/add_existing_tester')
            xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');

            xhr.send(json);
            xhr.onload = function(event){
                window.location.reload();
            }
            modal.style.display = 'none';
        }
    });

    // Shows pop up page to add new tester record
    const new_record_page = document.getElementById('new_record');
    const new_record_close_btn = new_record_page.querySelector('.close');

    // Close the page when close button is clicked
    new_record_close_btn.addEventListener('click', function() {
        new_record_page.style.display = 'none'; // Hide the modal when the close button is clicked
    });
    // Close the page if user clicks anywhere outside of it
    window.addEventListener('click', function(event) {
        if (event.target == new_record_page) {
            new_record_page.style.display = 'none';
        }
    });
});