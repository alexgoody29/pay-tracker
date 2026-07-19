const STORAGE_KEY = "payTrackerShifts";

const openShiftFormButton =
    document.getElementById("open-shift-form");

const closeShiftFormButton =
    document.getElementById("close-shift-form");

const shiftFormSection =
    document.getElementById("shift-form-section");

const shiftForm =
    document.getElementById("shift-form");

const shiftDateInput =
    document.getElementById("shift-date");

const formMessage =
    document.getElementById("form-message");

const shiftList =
    document.getElementById("shift-list");

const clearShiftsButton =
    document.getElementById("clear-shifts-button");

const seaworldSummary =
    document.getElementById("seaworld-summary");

const healthSummary =
    document.getElementById("health-summary");

let shifts = loadShifts();

function loadShifts() {
    const savedShifts = localStorage.getItem(STORAGE_KEY);

    if (!savedShifts) {
        return [];
    }

    try {
        const parsedShifts = JSON.parse(savedShifts);

        if (Array.isArray(parsedShifts)) {
            return parsedShifts;
        }

        return [];
    } catch (error) {
        console.error("Could not load saved shifts.", error);
        return [];
    }
}

function saveShifts() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(shifts)
    );
}

function setTodayAsDefaultDate() {
    if (shiftDateInput.value) {
        return;
    }

    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    shiftDateInput.value =
        `${year}-${month}-${day}`;
}

function openShiftForm() {
    shiftFormSection.classList.remove("hidden");

    setTodayAsDefaultDate();

    shiftFormSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function closeShiftForm() {
    shiftFormSection.classList.add("hidden");

    hideFormMessage();
}

function showFormMessage(message, isError = false) {
    formMessage.textContent = message;

    formMessage.classList.remove("hidden");
    formMessage.classList.toggle("error", isError);
}

function hideFormMessage() {
    formMessage.textContent = "";

    formMessage.classList.add("hidden");
    formMessage.classList.remove("error");
}

function convertTimeToMinutes(timeValue) {
    const parts = timeValue.split(":");

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    return (hours * 60) + minutes;
}

function calculateShiftHours(
    startTime,
    finishTime,
    breakMinutes
) {
    const startMinutes =
        convertTimeToMinutes(startTime);

    let finishMinutes =
        convertTimeToMinutes(finishTime);

    if (finishMinutes <= startMinutes) {
        finishMinutes += 24 * 60;
    }

    const totalMinutes =
        finishMinutes -
        startMinutes -
        breakMinutes;

    return totalMinutes / 60;
}

function formatHours(hours) {
    const roundedHours =
        Math.round(hours * 100) / 100;

    return `${roundedHours} hrs`;
}

function formatDate(dateValue) {
    const date =
        new Date(`${dateValue}T00:00:00`);

    return new Intl.DateTimeFormat(
        "en-AU",
        {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    ).format(date);
}

function formatTime(timeValue) {
    const parts = timeValue.split(":");

    const date = new Date();

    date.setHours(
        Number(parts[0]),
        Number(parts[1]),
        0,
        0
    );

    return new Intl.DateTimeFormat(
        "en-AU",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    ).format(date);
}

function getEmployerName(employerValue) {
    if (employerValue === "seaworld") {
        return "SeaWorld";
    }

    if (employerValue === "queensland-health") {
        return "Queensland Health";
    }

    return "Unknown employer";
}

function updateEmployerSummaries() {
    const seaworldShifts =
        shifts.filter(
            shift => shift.employer === "seaworld"
        );

    const healthShifts =
        shifts.filter(
            shift =>
                shift.employer ===
                "queensland-health"
        );

    const seaworldHours =
        seaworldShifts.reduce(
            (total, shift) =>
                total + shift.hours,
            0
        );

    const healthHours =
        healthShifts.reduce(
            (total, shift) =>
                total + shift.hours,
            0
        );

    if (seaworldShifts.length === 0) {
        seaworldSummary.textContent =
            "No shifts added";
    } else {
        seaworldSummary.textContent =
            `${seaworldShifts.length} shift${
                seaworldShifts.length === 1
                    ? ""
                    : "s"
            } • ${formatHours(seaworldHours)}`;
    }

    if (healthShifts.length === 0) {
        healthSummary.textContent =
            "No shifts added";
    } else {
        healthSummary.textContent =
            `${healthShifts.length} shift${
                healthShifts.length === 1
                    ? ""
                    : "s"
            } • ${formatHours(healthHours)}`;
    }
}

function renderShifts() {
    updateEmployerSummaries();

    if (shifts.length === 0) {
        shiftList.innerHTML = `
            <div class="empty-state">
                <p>No shifts have been saved yet.</p>
            </div>
        `;

        clearShiftsButton.classList.add("hidden");

        return;
    }

    clearShiftsButton.classList.remove("hidden");

    const sortedShifts = [...shifts].sort(
        (firstShift, secondShift) =>
            secondShift.date.localeCompare(
                firstShift.date
            )
    );

    shiftList.innerHTML = sortedShifts
        .map(shift => {
            const breakDescription =
                shift.breakMinutes === 0
                    ? "No unpaid break"
                    : `${shift.breakMinutes}-minute unpaid break`;

            return `
                <article class="shift-card">
                    <div class="shift-card-top">
                        <div>
                            <h3>
                                ${getEmployerName(
                                    shift.employer
                                )}
                            </h3>

                            <p class="shift-date">
                                ${formatDate(shift.date)}
                            </p>
                        </div>

                        <strong class="shift-hours">
                            ${formatHours(shift.hours)}
                        </strong>
                    </div>

                    <p class="shift-details">
                        ${formatTime(shift.startTime)}
                        –
                        ${formatTime(shift.finishTime)}
                        <br>
                        ${breakDescription}
                    </p>

                    <button
                        class="delete-shift-button"
                        type="button"
                        data-shift-id="${shift.id}"
                    >
                        Delete shift
                    </button>
                </article>
            `;
        })
        .join("");
}

function deleteShift(shiftId) {
    shifts = shifts.filter(
        shift => shift.id !== shiftId
    );

    saveShifts();
    renderShifts();
}

openShiftFormButton.addEventListener(
    "click",
    openShiftForm
);

closeShiftFormButton.addEventListener(
    "click",
    closeShiftForm
);

shiftForm.addEventListener(
    "submit",
    function (event) {
        event.preventDefault();

        hideFormMessage();

        const formData =
            new FormData(shiftForm);

        const employer =
            formData.get("employer");

        const date =
            formData.get("shiftDate");

        const startTime =
            formData.get("startTime");

        const finishTime =
            formData.get("finishTime");

        const breakMinutes =
            Number(
                formData.get("breakMinutes")
            );

        const hours =
            calculateShiftHours(
                startTime,
                finishTime,
                breakMinutes
            );

        if (hours <= 0) {
            showFormMessage(
                "The unpaid break cannot be longer than the shift.",
                true
            );

            return;
        }

        if (hours > 24) {
            showFormMessage(
                "The shift cannot be longer than 24 hours.",
                true
            );

            return;
        }

        const newShift = {
            id:
                Date.now().toString() +
                Math.random()
                    .toString(16)
                    .slice(2),

            employer,
            date,
            startTime,
            finishTime,
            breakMinutes,
            hours
        };

        shifts.push(newShift);

        saveShifts();
        renderShifts();

        shiftForm.reset();
        setTodayAsDefaultDate();

        showFormMessage(
            `Shift saved: ${formatHours(hours)}.`
        );

        setTimeout(() => {
            closeShiftForm();
        }, 800);
    }
);

shiftList.addEventListener(
    "click",
    function (event) {
        const deleteButton =
            event.target.closest(
                ".delete-shift-button"
            );

        if (!deleteButton) {
            return;
        }

        const shiftId =
            deleteButton.dataset.shiftId;

        deleteShift(shiftId);
    }
);

clearShiftsButton.addEventListener(
    "click",
    function () {
        const confirmed =
            window.confirm(
                "Delete every saved shift?"
            );

        if (!confirmed) {
            return;
        }

        shifts = [];

        saveShifts();
        renderShifts();
    }
);

renderShifts();
