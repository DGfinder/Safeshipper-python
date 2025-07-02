// Node.js script to generate bcrypt hashes for demo passwords
// Run this with: node scripts/generate-hashes.js

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

generateHashes().catch(console.error); 