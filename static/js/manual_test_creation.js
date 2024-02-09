document.addEventListener('DOMContentLoaded', (event) => {
  const toggleButton = document.querySelector(".side-panel-toggle");
  const wrapper = document.querySelector(".wrapper");
  toggleButton.addEventListener("click", () => {
    console.log("Button clicked"); // Check if this message appears in the console
    wrapper.classList.toggle("side-panel-open");
    console.log("Toggled class:", wrapper.classList); // Check the class list
  });
});



