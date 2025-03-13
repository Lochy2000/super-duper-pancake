/**
 * Script to generate secure secrets for application
 * Run with: node src/scripts/generateSecrets.js
 */
const crypto = require('crypto');

// Generate a secure random string for JWT secret
const generateJwtSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

// Main function
const main = () => {
  console.log('\n=== Secure Secret Generator ===\n');
  
  // Generate JWT secret
  const jwtSecret = generateJwtSecret();
  console.log('JWT Secret:');
  console.log(jwtSecret);
  console.log('\nAdd this to your .env file:');
  console.log(`JWT_SECRET=${jwtSecret}`);
  
  // Only print warning in production mode
  if (process.env.NODE_ENV === 'production') {
    console.log('\n⚠️ WARNING: Store this secret securely and do not commit it to version control!');
  }
  
  console.log('\n=== End of Secure Secret Generator ===\n');
};

// Run the main function
main();
