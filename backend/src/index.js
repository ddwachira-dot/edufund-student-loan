const app = require('./app');
const simulation = require('./services/simulation');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Student Loan API listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

simulation.start();

module.exports = app;