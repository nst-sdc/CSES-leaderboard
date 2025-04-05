document.addEventListener("DOMContentLoaded", function () {
  // Dark mode toggle
  const darkModeToggle = document.getElementById("darkModeToggle");
  const body = document.body;

  // Check for saved preference
  if (localStorage.getItem("darkMode") === "enabled") {
    body.classList.add("dark-mode");
    darkModeToggle.checked = true;
  }

  darkModeToggle.addEventListener("change", function () {
    if (this.checked) {
      body.classList.add("dark-mode");
      localStorage.setItem("darkMode", "enabled");
    } else {
      body.classList.remove("dark-mode");
      localStorage.setItem("darkMode", "disabled");
    }
  });

  // Animate elements on page load
  document.querySelectorAll(".card").forEach((card) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.5s ease, transform 0.5s ease";

    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, 100);
  });

  // Add tooltip initialization
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl, {
      boundary: document.body,
    });
  });

  // Weekly activity chart
  const ctx = document.getElementById("weeklyActivityChart")?.getContext("2d");
  if (ctx) {
    // Extract data from table for the chart
    const userData = [];
    const userLabels = [];
    document.querySelectorAll("tbody tr").forEach((row) => {
      if (userData.length < 5) {
        // Only get top 5 users
        const name = row
          .querySelector("td:nth-child(2) strong")
          .textContent.trim();
        const activitySquares = row.querySelectorAll(".activity-square");
        const activityData = [];

        activitySquares.forEach((square) => {
          activityData.push(square.classList.contains("bg-success") ? 1 : 0);
        });

        userData.push(activityData);
        userLabels.push(name);
      }
    });

    // Create chart
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const datasets = userLabels.map((label, i) => {
      const colors = [
        "rgba(78, 115, 223, 0.7)",
        "rgba(28, 200, 138, 0.7)",
        "rgba(54, 185, 204, 0.7)",
        "rgba(246, 194, 62, 0.7)",
        "rgba(231, 74, 59, 0.7)",
      ];

      return {
        label: label,
        data: userData[i],
        backgroundColor: colors[i % colors.length],
        borderWidth: 1,
      };
    });

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: days,
        datasets: datasets,
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  // Add search functionality
  const searchInput = document.getElementById("userSearch");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const query = this.value.toLowerCase();
      document.querySelectorAll("tbody tr").forEach((row) => {
        const username = row
          .querySelector("td:nth-child(2) strong")
          .textContent.toLowerCase();
        if (username.includes(query)) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      });
    });
  }
});
