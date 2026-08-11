const Feedback = require('../models/Feedback');
const { cleanString, boundedNumber } = require('../middleware/validate');

const createFeedback = async (req, res, next) => {
  try {
    const rating = boundedNumber(req.body.rating, { min: 1, max: 5, fallback: null });
    if (rating === null) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    const quickTags = Array.isArray(req.body.quickTags)
      ? req.body.quickTags.map(t => cleanString(t, 60)).filter(Boolean).slice(0, 20)
      : [];

    const metadata = (req.body.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata))
      ? req.body.metadata
      : {};

    const fb = await Feedback.create({
      rating,
      comment: cleanString(req.body.comment, 5000),
      quickTags,
      // Identity is taken from the token when present, never from the body.
      userId: req.user ? req.user.id : '',
      chatId: cleanString(req.body.chatId, 64),
      metadata,
    });
    return res.json({ success: true, feedback: fb });
  } catch (err) {
    return next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const total = await Feedback.countDocuments();
    const agg = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' }, positive: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } }, negative: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } } } }
    ]);
    const avgRating = agg[0] ? Number(agg[0].avgRating.toFixed(2)) : 0;
    const positive = agg[0] ? agg[0].positive : 0;
    const negative = agg[0] ? agg[0].negative : 0;

    // Most common quickTags
    const tagsAgg = await Feedback.aggregate([
      { $unwind: '$quickTags' },
      { $group: { _id: '$quickTags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Simple most common words in comments (bounded scan — was unbounded)
    const comments = await Feedback.find({ comment: { $ne: '' } })
      .select('comment -_id')
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    const stopwords = new Set(['the','and','a','to','is','in','it','of','for','on','that','this','with','i','you','my','me','was','are','be','have','has','but','not']);
    const freq = {};
    comments.forEach(c => {
      const words = (c.comment || '').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
      words.forEach(w => { if (!stopwords.has(w) && w.length > 2) freq[w] = (freq[w]||0) + 1; });
    });
    const commonWords = Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,10).map(w=>({ word: w, count: freq[w] }));

    return res.json({ total, avgRating, positive, negative, commonTags: tagsAgg, commonWords });
  } catch (err) {
    return next(err);
  }
};

module.exports = { createFeedback, getStats };
