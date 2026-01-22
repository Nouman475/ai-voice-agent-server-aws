const app = require("./app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Voice Assistant running on port ${PORT}`);
});