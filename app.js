const openShiftFormButton =
    document.getElementById("open-shift-form");

const closeShiftFormButton =
    document.getElementById("close-shift-form");

const shiftFormSection =
    document.getElementById("shift-form-section");

const shiftForm =
    document.getElementById("shift-form");

function openShiftForm() {
    shiftFormSection.classList.remove("hidden");

    shiftFormSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function closeShiftForm() {
    shiftFormSection.classList.add("hidden");
}

openShiftFormButton.addEventListener(
    "click",
    openShiftForm
);

closeShiftFormButton.addEventListener(
    "click",
    closeShiftForm
);

shiftForm.addEventListener("submit", function (event) {
    event.preventDefault();

    alert("The shift form is working.");

    shiftForm.reset();
    closeShiftForm();
});
