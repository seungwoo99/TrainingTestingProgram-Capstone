function validateForm() {
    var firstName = document.forms["signupForm"]["first_name"].value;
    var lastName = document.forms["signupForm"]["last_name"].value;
    var username = document.forms["signupForm"]["username"].value;
    var email = document.forms["signupForm"]["email"].value;
    var password = document.forms["signupForm"]["password"].value;
    var confirmPassword = document.forms["signupForm"]["confirm_password"].value;

    // validate all entries filled
    if (firstName == "" || lastName == "" || username == "" || email == "" || password == "" || confirmPassword == "") {
        alert("All fields must be filled out");
        return false;
    }
    // ensure passwords match
    if (password != confirmPassword) {
        alert("Passwords do not match");
        return false;
    }
    // ensure username is alphanumeric
    var alphanumericRegex = /^[a-zA-Z0-9]+$/;

    if (!alphanumericRegex.test(username)) {
        alert("Username must contain only alphanumeric characters.");
        return false;
    }
    // ensure password is complex enough
    var passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d|[\W\_])[A-Za-z\d\W\_]{8,}$/;

    if (!passwordRegex.test(password)) {
        alert("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one digit or special character.");
        return false;
    }
    // ensure email is valid
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        alert("Please enter a valid email address.");
        return false;
    }
    return true; // If all validations pass
}

function validatePasswordChange() {
    var password = document.forms["password-update"]["new_password"].value;
    var confirmPassword = document.forms["password-update"]["confirm_password"].value;

        // validate all entries filled
    if (password == "" || confirmPassword == "") {
        alert("All fields must be filled out");
        return false;
    }

    // ensure passwords match
    if (password != confirmPassword) {
        alert("Passwords do not match");
        return false;
    }

    // ensure password is complex enough
    var passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d|[\W\_])[A-Za-z\d\W\_]{8,}$/;

    if (!passwordRegex.test(password)) {
        alert("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one digit or special character.");
        return false;
    }
    return true; //

}