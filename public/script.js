// Get all the graph containers for CodeChef, Codeforces, and CSES
const graphContainers = [
    document.getElementById('codechef-graph-container'),
    document.getElementById('codeforces-graph-container'),
    document.getElementById('cses-graph-container')
  ];
  
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');
  
  let currentDate = startDate;
  
  while (currentDate <= endDate) {
    const dayElement = document.createElement('div');
    dayElement.className = 'day';
    // Data regarding the day 
    const activityLevel = Math.floor(Math.random() * 5);




    dayElement.setAttribute('data-count', activityLevel);
  
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerText = currentDate.toDateString();
    dayElement.appendChild(tooltip);
  
    // Add the created day element to all graph containers
    graphContainers.forEach(graphContainer => {
      graphContainer.appendChild(dayElement.cloneNode(true));
    });
  
    currentDate.setDate(currentDate.getDate() + 1);
  }
  