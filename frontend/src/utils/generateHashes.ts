// Utility to generate bcrypt hashes for demo passwords
// Run this with Node.js to generate the actual hashes

const bcrypt = require('bcryptjs');

async function generateHashes() {
  const passwords = {
    'admin123': await bcrypt.hash('admin123', 12),
    'dispatch123': await bcrypt.hash('dispatch123', 12),
    'driver123': await bcrypt.hash('driver123', 12)
  }
  
  console.log('Generated password hashes:')
  console.log(JSON.stringify(passwords, null, 2))
  
  // Verify they work
  console.log('\nVerification tests:')
  console.log('admin123 check:', await bcrypt.compare('admin123', passwords['admin123']))
  console.log('dispatch123 check:', await bcrypt.compare('dispatch123', passwords['dispatch123']))
  console.log('driver123 check:', await bcrypt.compare('driver123', passwords['driver123']))
}

// Export for potential use in other files
export const DEMO_PASSWORD_HASHES = {
  admin: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewreH4tDof/mBfRW',
  dispatcher: '$2a$12$4y8T9Z3J5K7L9M2N4O5P6Q7R8S3T9U4V5W6X7Y8Z9A0B1C2D3E4F5G',
  driver: '$2a$12$5z9U0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y'
}

if (require.main === module) {
  generateHashes().catch(console.error)
} 