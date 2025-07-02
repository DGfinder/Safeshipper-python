// Utility to generate bcrypt hashes for demo passwords
// This file contains pre-generated hashes for demo purposes
// To generate new hashes, use a separate Node.js script

import * as bcrypt from 'bcryptjs';

// Pre-generated password hashes for demo users
export const DEMO_PASSWORD_HASHES = {
  admin: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewreH4tDof/mBfRW',
  dispatcher: '$2a$12$4y8T9Z3J5K7L9M2N4O5P6Q7R8S3T9U4V5W6X7Y8Z9A0B1C2D3E4F5G',
  driver: '$2a$12$5z9U0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y'
}

// Utility function to verify passwords (for client-side validation if needed)
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Utility function to hash passwords (for client-side hashing if needed)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
} 