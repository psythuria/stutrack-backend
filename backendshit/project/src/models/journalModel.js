import mongoose from 'mongoose';

const journalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  title: {
    type: String,
    required: [true, 'Journal title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Journal content is required']
  },
  mood: {
    type: String,
    enum: ['happy', 'excited', 'neutral', 'tired', 'stressed', 'sad'],
    default: 'neutral'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPrivate: {
    type: Boolean,
    default: true
  },
  attachments: [{
    name: String,
    url: String,
    type: String
  }]
}, {
  timestamps: true
});

// Index for faster queries
journalSchema.index({ user: 1, createdAt: -1 });
journalSchema.index({ tags: 1, user: 1 });

const Journal = mongoose.model('Journal', journalSchema);

export default Journal;