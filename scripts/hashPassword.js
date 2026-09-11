const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/hashPassword.js <password>');
  console.log('Example: node scripts/hashPassword.js mySecretPassword123');
  process.exit(1);
}

const SALT_ROUNDS = 12;

bcrypt.hash(password, SALT_ROUNDS)
  .then(hash => {
    console.log('\n=== Password Hash Generated ===\n');
    console.log('Add this to your .env file:\n');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('\n===============================\n');
  })
  .catch(err => {
    console.error('Error hashing password:', err.message);
    process.exit(1);
  });
