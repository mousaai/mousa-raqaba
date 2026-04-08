module.exports = {
  apps: [{
    name: "raqaba",
    script: "dist/index.js",
    env: {
      NODE_ENV: "production",
      PORT: "3002",
      JWT_SECRET: "gUZSqUcmSESjwVurZ47xye",
      DATABASE_URL: "mysql://3RYRgiKBksaJ9ku.eff254cfce12:8Hmi5APhIhZsYO1P269W@gateway03.us-east-1.prod.aws.tidbcloud.com:4000/6PpfERRQXfuwb7GGi2gFrK?sslaccept=strict",
      OAUTH_SERVER_URL: "https://api.manus.im",
      OWNER_OPEN_ID: "KwRg52bYbwq6pk2Z3iTWwk",
      VITE_APP_ID: "6PpfERRQXfuwb7GGi2gFrK",
      BUILT_IN_FORGE_API_URL: "https://forge.manus.ai",
      BUILT_IN_FORGE_API_KEY: "9h8Ntk6wQ3qZ9bNu5wdqUD",
      MOUSA_API_URL: "https://www.mousa.ai",
      WEBHOOK_SECRET: "816350e1619ed3ad26351ebfcfc3c65f9ba22929941767e4bbaa9f16b5cdeca7",
      PLATFORM_API_KEY: "711dab362bb6a4b52193eb38e7891cbdc1aaaa1bf3f463412353a13a35634090",
      MY_GOOGLE_AI_KEY: "AIzaSyAIMIAu6wWYjHj8CFjm4fq7uQOo2PNEibA",
      OPENAI_API_KEY: "AIzaSyAIMIAu6wWYjHj8CFjm4fq7uQOo2PNEibA",
      OPENAI_MODEL: "gemini-2.5-flash"
    }
  }]
};
