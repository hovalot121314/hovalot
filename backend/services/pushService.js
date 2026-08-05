const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const BusinessSettings = require('../models/BusinessSettings');
const Message = require('../models/Message');

let configuredPublicKey = null;

async function configure() {
  if (configuredPublicKey) return configuredPublicKey;
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    let settings = await BusinessSettings.findOne().select('+vapidPublicKey +vapidPrivateKey');
    if (!settings) settings = await BusinessSettings.create({});
    if (!settings.vapidPublicKey || !settings.vapidPrivateKey) {
      const generated = webpush.generateVAPIDKeys();
      settings.vapidPublicKey = generated.publicKey;
      settings.vapidPrivateKey = generated.privateKey;
      await settings.save();
    }
    publicKey = settings.vapidPublicKey;
    privateKey = settings.vapidPrivateKey;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:owner@example.com', publicKey, privateKey);
  configuredPublicKey = publicKey;
  return publicKey;
}

exports.getPublicKey = configure;

exports.saveSubscription = async (adminId, subscription, userAgent) => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) throw new Error('מנוי התראות לא תקין');
  return PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    { admin: adminId, endpoint: subscription.endpoint, keys: subscription.keys, userAgent },
    { upsert: true, new: true, runValidators: true }
  );
};

exports.removeSubscription = (adminId, endpoint) => PushSubscription.deleteOne({ admin: adminId, endpoint });

exports.sendToAdmin = async (adminId, payload) => {
  const tag = String(payload.tag || `message-${Date.now()}`);
  await Message.updateOne(
    { admin: adminId, tag },
    {
      $set: {
        appointment: payload.appointmentId || null,
        title: String(payload.title || 'תזכורת חדשה'),
        body: String(payload.body || ''),
        url: String(payload.url || './dashboard.html')
      },
      $setOnInsert: { admin: adminId, tag }
    },
    { upsert: true }
  );
  await configure();
  const subscriptions = await PushSubscription.find({ admin: adminId });
  let sent = 0;
  let failed = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, JSON.stringify(payload));
      sent += 1;
    } catch (error) {
      failed += 1;
      if ([404, 410].includes(error.statusCode)) await subscription.deleteOne();
      else console.error('Push delivery failed:', error.message);
    }
  }
  return { sent, failed };
};
