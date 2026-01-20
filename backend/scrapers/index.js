function detectStore(url) {
  const u = String(url || "").toLowerCase();
  if (u.includes("ica.se")) return "ICA";
  if (u.includes("willys.se")) return "WILLYS";
  return "UNKNOWN";
}

module.exports = { detectStore };