const User = require('../models/User');
const Alert = require('../models/Alert');

/**
 * Placeholder for enterprise SMS/Email pipeline
 * Real connections like Twilio or SendGrid would be initiated here.
 */
const sendAlert = async (userId, triggerType, payload) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.emergencyContacts || user.emergencyContacts.length === 0) return;

    // Build the payload
    const locationStr = payload.location && payload.location.latitude ? `Lat: ${payload.location.latitude.toFixed(4)}, Lon: ${payload.location.longitude.toFixed(4)}` : 'Unknown Location';
    const message = `[🚨 EMERGENCY ALERT from ${user.name || 'Driver'}] 
Trigger: ${triggerType}
Time: ${new Date().toLocaleTimeString()}
Location: ${locationStr}
Speed: ${payload.speed ? payload.speed.toFixed(1) + ' km/h' : 'N/A'}`;

    const dispatchedTo = [];

    // Filter contacts based on trigger type preferences
    user.emergencyContacts.forEach((contact, idx) => {
      let shouldNotify = false;
      if (triggerType === 'Manual SOS') shouldNotify = true;
      else if (triggerType === 'Crash Detected' && contact.notifyOnCrash) shouldNotify = true;
      else if (triggerType === 'High Risk Zone' && contact.notifyOnRiskZone) shouldNotify = true;
      else if (triggerType === 'Critical Safety Score' && contact.notifyOnLowScore) shouldNotify = true;

      // Placeholder execution
      if (shouldNotify) {
        dispatchedTo.push({ name: contact.name, phone: contact.phone, status: 'Sent' });
        
        console.log(`\n=================================================`);
        console.log(`📡 [DISPATCHING PROVIDER -> TWILIO]`);
        console.log(`👤 Target: ${contact.name} (${contact.phone})`);
        console.log(`✉️ Payload: ${message}`);
        console.log(`=================================================\n`);
      }
    });

    if (dispatchedTo.length > 0) {
      const newAlert = new Alert({
        userId,
        triggerType,
        dispatchedTo,
        payload: {
          location: payload.location || null,
          speed: payload.speed || 0
        }
      });
      await newAlert.save();
    }

  } catch (err) {
    console.error("Pipeline failure in notification service:", err);
  }
};

module.exports = { sendAlert };
