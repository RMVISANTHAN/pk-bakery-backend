const asyncHandler = require('express-async-handler');
const admin = require('../config/firebase');
const User = require('../models/User');

// @desc    Register/update the FCM device token for the logged-in user
// @route   POST /api/notifications/register-token  { token }
// @access  Private
const registerToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id);
  if (!user.fcmTokens.includes(token)) {
    user.fcmTokens.push(token);
    await user.save();
  }
  res.json({ success: true });
});

// @desc    Send a push notification to a single user (order updates)
const sendToUser = async (userId, { title, body, data = {} }) => {
  const user = await User.findById(userId);
  if (!user || !user.fcmTokens.length) return;
  await admin.messaging().sendEachForMulticast({
    tokens: user.fcmTokens,
    notification: { title, body },
    data,
  });
};

// @desc    Broadcast a promotional notification to all customers
// @route   POST /api/notifications/broadcast  { title, body }
// @access  Private/Admin
const broadcast = asyncHandler(async (req, res) => {
  const { title, body } = req.body;
  const users = await User.find({ fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens');
  const tokens = users.flatMap((u) => u.fcmTokens);

  if (!tokens.length) {
    return res.json({ success: true, message: 'No registered devices to notify' });
  }

  // FCM multicast accepts max 500 tokens per call - chunk if needed
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));

  for (const chunk of chunks) {
    await admin.messaging().sendEachForMulticast({ tokens: chunk, notification: { title, body } });
  }

  res.json({ success: true, message: `Notification sent to ${tokens.length} devices` });
});

module.exports = { registerToken, sendToUser, broadcast };
