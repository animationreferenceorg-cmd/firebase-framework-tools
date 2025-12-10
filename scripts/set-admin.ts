import admin from 'firebase-admin';

// This script is used to set a custom claim on a user's account to make them an admin.
// To run this script:
// 1. Make sure you have your service account credentials available as environment variables:
//    - GOOGLE_APPLICATION_CREDENTIALS: Path to your service account JSON file.
// 2. Run the script with the email of the user you want to make an admin:
//    `npx tsx scripts/set-admin.ts <user-email>`

async function setAdminClaim(email: string) {
  if (!email) {
    console.error('Usage: npx tsx scripts/set-admin.ts <user-email>');
    process.exit(1);
  }

  // Initialize the Firebase Admin SDK
  // The SDK will automatically pick up the GOOGLE_APPLICATION_CREDENTIALS environment variable.
  admin.initializeApp();

  try {
    console.log(`Fetching user with email: ${email}...`);
    const user = await admin.auth().getUserByEmail(email);
    
    // Check if the user is already an admin
    if (user.customClaims && user.customClaims.admin === true) {
      console.log(`User ${email} is already an admin.`);
      return;
    }

    console.log(`Setting admin claim for user: ${user.uid}...`);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    console.log('Successfully set admin claim!');
    console.log(`User ${email} (${user.uid}) is now an administrator.`);

  } catch (error) {
    console.error('Error setting admin claim:', error);
    process.exit(1);
  }
}

// Get the email from the command line arguments
const email = process.argv[2];
setAdminClaim(email);
