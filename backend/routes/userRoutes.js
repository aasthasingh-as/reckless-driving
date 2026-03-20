

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Trip = require('../models/Trip');
const Event = require('../models/Event');
const User = require('../models/User');

// GET /api/users/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const trips = await Trip.find({
      userId: req.user.userId,
      endTime: { $exists: true, $ne: null },
    });

    const totalTrips = trips.length;

    let avgSafetyScore = 0;
    let totalEvents = 0;
    let highestSpeed = 0;
    let riskyTripsCount = 0;
    let totalDrivingTimeMs = 0;
    let totalBrakingEvents = 0;
    let totalAccelEvents = 0;
    let insights = [];
    let recentEvents = [];
    let safetyScoreTrend = [];
    let topSpeedTrend = [];
    let trendLabels = [];
    let eventsByType = [];
    let riskyVsSafe = [];

    if (totalTrips > 0) {
      const sumScore = trips.reduce((acc, t) => acc + (t.finalSafetyScore || 100), 0);
      avgSafetyScore = Math.round(sumScore / totalTrips);

      trips.forEach((t) => {
        if ((t.finalSafetyScore || 100) < 70) riskyTripsCount++;
        if (t.topSpeed && t.topSpeed > highestSpeed) highestSpeed = Math.round(t.topSpeed);
        if (t.endTime && t.startTime) {
          totalDrivingTimeMs += new Date(t.endTime) - new Date(t.startTime);
        }
      });

      const tripIds = trips.map((t) => t._id);

      const events = await Event.find({
        tripId: { $in: tripIds },
        userId: req.user.userId,
        eventType: { $ne: 'Safe Driving' },
      });

      totalEvents = events.length;
      let eveningEvents = 0;
      let overspeedEvents = 0;
      let sharpTurnEvents = 0;

      events.forEach((e) => {
        if (e.eventType.includes('Braking')) totalBrakingEvents++;
        else if (e.eventType.includes('Acceleration')) totalAccelEvents++;
        else if (e.eventType.includes('Overspeed')) overspeedEvents++;
        else if (e.eventType.includes('Turn')) sharpTurnEvents++;

        const hour = new Date(e.timestamp).getHours();
        if (hour >= 18 || hour <= 4) eveningEvents++;
      });

      const recentTripsAsc = [...trips]
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(-6);

      safetyScoreTrend = recentTripsAsc.map((t) => t.finalSafetyScore || 100);
      topSpeedTrend = recentTripsAsc.map((t) => Math.round(t.topSpeed || 0));
      trendLabels = recentTripsAsc.map((t) =>
        new Date(t.startTime).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })
      );

      eventsByType = [
        { name: 'Braking', population: totalBrakingEvents, color: '#f59e0b', legendFontColor: '#4b5563', legendFontSize: 12 },
        { name: 'Accel', population: totalAccelEvents, color: '#ef4444', legendFontColor: '#4b5563', legendFontSize: 12 },
        { name: 'Speed', population: overspeedEvents, color: '#3b82f6', legendFontColor: '#4b5563', legendFontSize: 12 },
        { name: 'Turn', population: sharpTurnEvents, color: '#8b5cf6', legendFontColor: '#4b5563', legendFontSize: 12 },
      ].filter((e) => e.population > 0);

      const safeTripsCount = totalTrips - riskyTripsCount;
      riskyVsSafe = [
        { name: 'Safe', population: safeTripsCount, color: '#16a34a', legendFontColor: '#4b5563', legendFontSize: 12 },
        { name: 'Risky', population: riskyTripsCount, color: '#dc2626', legendFontColor: '#4b5563', legendFontSize: 12 },
      ].filter((t) => t.population > 0);

      recentEvents = [...events]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 3);

      if (highestSpeed > 90) {
        insights.push('Top speed spikes are heavily affecting your score. Try to maintain consistent speeds.');
      }
      if (eveningEvents > totalEvents * 0.4 && totalEvents > 0) {
        insights.push('Most of your unsafe events happen in evening trips. Be extra cautious at night.');
      }
      if (totalBrakingEvents > totalAccelEvents * 2 && totalBrakingEvents > 3) {
        insights.push('You tend to brake harshly often. Try to anticipate stops earlier.');
      }
      if (totalTrips > 2 && avgSafetyScore > 85) {
        insights.push('Great job! Your braking and acceleration habits are very safe.');
      }
      if (insights.length === 0) {
        insights.push('Keep driving safely to unlock more personalized insights!');
      }
    }

    const totalDrivingMinutes = Math.round(totalDrivingTimeMs / 60000);

    res.json({
      success: true,
      stats: {
        totalTrips,
        avgSafetyScore,
        totalEvents,
        highestSpeed,
        riskyTripsCount,
        totalDrivingMinutes,
        totalBrakingEvents,
        totalAccelEvents,
        recentEvents,
        insights,
        charts:
          totalTrips > 0
            ? {
                safetyScoreTrend: safetyScoreTrend.length > 0 ? safetyScoreTrend : [100],
                topSpeedTrend: topSpeedTrend.length > 0 ? topSpeedTrend : [0],
                trendLabels: trendLabels.length > 0 ? trendLabels : ['Today'],
                eventsByType,
                riskyVsSafe,
              }
            : null,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// PUT /api/users/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { emergencyContacts } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (emergencyContacts !== undefined) {
      user.emergencyContacts = emergencyContacts;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        familyContact: user.familyContact || '',
        emergencyContacts: user.emergencyContacts,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

module.exports = router;