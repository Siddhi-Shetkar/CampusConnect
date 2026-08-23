const ConnectionRequest = require('../models/ConnectionRequest');
const PartnerRequest = require('../models/PartnerRequest');

// Send connection request
const sendConnectionRequest = async (req, res) => {
  try {
    const { partnerRequestId } = req.body;

    const partnerRequest = await PartnerRequest.findById(partnerRequestId);

    if (!partnerRequest) {
      return res.status(404).json({ message: 'Partner request not found' });
    }

    // Check if user is trying to connect to their own request
    if (partnerRequest.creator.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot connect to your own request' });
    }

    // Check if a connection request already exists
    const existingRequest = await ConnectionRequest.findOne({
      sender: req.user.id,
      partnerRequest: partnerRequestId,
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Connection request already sent' });
    }

    const connection = await ConnectionRequest.create({
      sender: req.user.id,
      receiver: partnerRequest.creator,
      partnerRequest: partnerRequestId,
    });

    res.status(201).json(connection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get connections for a user
const getConnections = async (req, res) => {
  try {
    // Get all connections where user is sender or receiver and status is accepted
    const connections = await ConnectionRequest.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
      status: 'accepted'
    })
    .populate('sender', 'name college profileImage skills interests')
    .populate('receiver', 'name college profileImage skills interests')
    .populate('partnerRequest', 'title activity category');

    res.status(200).json(connections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get pending connection requests received by user
const getReceivedRequests = async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      receiver: req.user.id,
      status: 'pending'
    })
    .populate('sender', 'name college year skills')
    .populate('partnerRequest', 'title activity');

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update connection request status
const updateConnectionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const connection = await ConnectionRequest.findById(req.params.id);

    if (!connection) {
      return res.status(404).json({ message: 'Connection request not found' });
    }

    // Verify receiver is the logged-in user
    if (connection.receiver.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    connection.status = status;
    await connection.save();

    res.status(200).json(connection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendConnectionRequest,
  getConnections,
  getReceivedRequests,
  updateConnectionStatus,
};
