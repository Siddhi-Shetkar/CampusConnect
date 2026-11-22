const PartnerRequest = require('../models/PartnerRequest');

// Create a new request
const createRequest = async (req, res) => {
  try {
    const { category, activity, title, description, skillLevel, availability, frequency, location, peopleNeeded } = req.body;

    const request = await PartnerRequest.create({
      creator: req.user.id,
      category,
      activity,
      title,
      description,
      skillLevel,
      availability,
      frequency,
      location,
      peopleNeeded,
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all requests (with optional filters)
const getRequests = async (req, res) => {
  try {
    const { category, activity, skillLevel, search } = req.query;
    
    let query = { status: 'Open' };

    if (category) query.category = category;
    if (activity) query.activity = activity;
    if (skillLevel) query.skillLevel = skillLevel;
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { activity: { $regex: search, $options: 'i' } }
      ];
    }

    const requests = await PartnerRequest.find(query)
      .populate('creator', 'name college year')
      .sort({ createdAt: -1 });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single request
const getRequestById = async (req, res) => {
  try {
    const request = await PartnerRequest.findById(req.params.id)
      .populate('creator', 'name college year skills bio');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update request
const updateRequest = async (req, res) => {
  try {
    const request = await PartnerRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if user is the creator
    if (request.creator.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const updatedRequest = await PartnerRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updatedRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete request
const deleteRequest = async (req, res) => {
  try {
    const request = await PartnerRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if user is the creator
    if (request.creator.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await request.deleteOne();

    res.status(200).json({ id: req.params.id, message: 'Request removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
};
