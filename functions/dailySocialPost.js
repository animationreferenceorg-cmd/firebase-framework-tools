const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');

const CRON_SECRET = defineSecret('CRON_SECRET');
const SITE_URL = process.env.SITE_URL || 'https://animationreference.org';

// Fires once a day and hits the app's own /api/social/cron endpoint, which
// picks an unposted video and publishes it to Instagram, X, and LinkedIn.
exports.dailySocialPost = onSchedule(
  {
    schedule: '0 16 * * *', // 16:00 UTC daily — adjust to your preferred posting time
    timeZone: 'UTC',
    secrets: [CRON_SECRET],
  },
  async () => {
    const url = `${SITE_URL}/api/social/cron?secret=${encodeURIComponent(CRON_SECRET.value())}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log('[dailySocialPost] cron result:', data);
    if (!res.ok) {
      throw new Error(data.error || `Cron endpoint returned ${res.status}`);
    }
  }
);
