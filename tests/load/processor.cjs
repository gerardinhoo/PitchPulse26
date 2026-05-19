const fs = require("fs");
const path = require("path");

const FIXTURE_PATH = path.join(__dirname, "fixtures", "verified-users.csv");

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function loadTokens() {
  const rawFixture = fs.readFileSync(FIXTURE_PATH, "utf8").trim();
  const rows = rawFixture
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length < 2 || rows[0] !== "token") {
    throw new Error(
      'verified-users.csv must start with a "token" header followed by at least one JWT'
    );
  }

  return rows.slice(1);
}

const verifiedTokens = loadTokens();
let tokenIndex = 0;

module.exports = {
  buildRegistrationUser(context, _events, done) {
    const suffix = `${Date.now()}-${randomInt(1_000_000)}`;
    context.vars.registrationEmail = `loadtest+${suffix}@pitchpulse26.test`;
    context.vars.registrationPassword = "password123";
    context.vars.registrationDisplayName = `LoadTester-${suffix}`;
    return done();
  },

  attachAuthHeader(context, _events, done) {
    const token = verifiedTokens[tokenIndex % verifiedTokens.length];
    tokenIndex += 1;

    if (!token) {
      return done(new Error("Missing token in verified-users fixture"));
    }

    context.vars.token = token;
    context.vars.predictedHomeScore = randomInt(5);
    context.vars.predictedAwayScore = randomInt(5);
    return done();
  },
};
