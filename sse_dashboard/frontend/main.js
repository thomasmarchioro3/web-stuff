// API Configuration
const API_URL = 'http://localhost:8000';
const dashboardSection = document.getElementById('dashboard-section');
const MAX_DATA_POINTS = 100;

let currentUsername = null;
let chart = null;

let lastTimestamp = 1761860044000;

/**
 * Initialize the application
 */
function init() {
	// Check if user is already logged in
	// const token = localStorage.getItem('auth_token');
	const username = localStorage.getItem('username');

	showDashboard();

	// Set up event listeners
	// loginForm.addEventListener('submit', handleLogin);
	// logoutBtn.addEventListener('click', handleLogout);
}


/**
 * Show dashboard section
 */
function showDashboard() {
	// loginSection.style.display = 'none';
	dashboardSection.style.display = 'block';
	document.body.style.alignItems = 'flex-start';

	// Update username display
	// usernameDisplay.textContent = `Logged in as: ${currentUsername}`;

	// Initialize chart and start streaming
	initChart();
	startStream();
}


/**
 * Initialize Chart.js
 */
function initChart() {
	const ctx = document.getElementById('ts-chart').getContext('2d');

	const chartConfig = {
		type: 'line',
		data: {
			labels: [],
			datasets: [{
				label: 'Value',
				data: [],
				borderColor: '#008800',
				backgroundColor: '#1DBC60',
				borderWidth: 0,
				tension: 0.4,
				//fill: true,
				pointRadius: 3,
				pointHoverRadius: 5,
			}]

		},
		options: {
			scales: {
				x: {
					// type: 'time',
					title: {
						display: true,
						text: 'Time'
					}
				},
				y: {
					min: 0,
					max: 1,
					ticks: {
						stepSize: 0.1
					},
					title: {
						display: true,
						text: 'Value'
					}
				}
			},
			plugins: {
				legend: {
					display: true,
					position: 'top'
				},
			},

		}
	};


	chart = new Chart(ctx, chartConfig);


}


/**
 * Update chart with new measurement
 */
function updateChart(value, timestamp) {

	// convert POSIX timestamp to local time
	const timeLabel = new Date(timestamp).toLocaleTimeString();

	// Add new data point
	chart.data.labels.push(timeLabel);
	chart.data.datasets[0].data.push(value);

	// Keep only last MAX_DATA_POINTS
	if (chart.data.labels.length > MAX_DATA_POINTS) {
		chart.data.labels.shift();
		chart.data.datasets[0].data.shift();
	}

	chart.update('none'); // 'none' mode for performance

	// Update latest value display
	document.getElementById('latest-value').textContent = value.toFixed(4);
}

/**
 * Start SSE stream
 */
function startStream() {
	const connectionStatus = document.getElementById('connection-status');

	const url = `${API_URL}/stream`;

	connectToStream(url);
}



/**
 * Connect to SSE stream using fetch API (supports Authorization header)
 */
async function connectToStream(url) {
	const connectionStatus = document.getElementById('connection-status');

	try {
		const response = await fetch(url, {
			// headers: {
			//     'Authorization': `Bearer ${currentToken}`,
			// },
		});

		if (!response.ok) {
			throw new Error('Failed to connect to stream');
		}

		connectionStatus.textContent = 'Connected';
		connectionStatus.classList.remove('disconnected');
		connectionStatus.classList.add('connected');

		// Read the stream
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				console.log('Stream ended');
				break;
			}

			// Decode the chunk and add to buffer
			buffer += decoder.decode(value, { stream: true });

			// Process complete SSE messages
			const lines = buffer.split('\n');
			buffer = lines.pop(); // Keep incomplete line in buffer

			for (const line of lines) {

				// console.log(line);
				if (line.startsWith('{')) {
					const linefix = line.replace("'", '"');
					console.log("Received data:", line);
					const data = JSON.parse(line);
					const timestamp = parseFloat(data.timestamp) * 1000;
					const value = parseFloat(data.value);
					// const data = line.substring(6).trim();
					// const measurement = parseFloat(data);

					if (!isNaN(value)) {
						updateChart(value, timestamp);
					}
				}
			}
		}

	} catch (error) {
		console.error('Stream error:', error);
		connectionStatus.textContent = 'Disconnected';
		connectionStatus.classList.remove('connected');
		connectionStatus.classList.add('disconnected');

		// Try to reconnect after 5 seconds if still on dashboard
		// if (currentToken) {
		// 	setTimeout(() => {
		// 		if (currentToken) {
		// 			console.log('Attempting to reconnect...');
		// 			connectToStream(url);
		// 		}
		// 	}, 5000);
		// }
	}
}



document.addEventListener('DOMContentLoaded', init);
