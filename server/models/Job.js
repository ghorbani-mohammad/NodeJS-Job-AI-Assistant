const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  company: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  location: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  requirements: {
    type: [String],
    default: []
  },
  responsibilities: {
    type: [String],
    default: []
  },
  salary: {
    min: {
      type: Number,
      min: 0
    },
    max: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'yearly'
    }
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
    required: true,
    index: true
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive'],
    index: true
  },
  remote: {
    type: String,
    enum: ['on-site', 'remote', 'hybrid'],
    default: 'on-site',
    index: true
  },
  industry: {
    type: String,
    trim: true,
    index: true
  },
  skills: {
    type: [String],
    default: [],
    index: true
  },
  benefits: {
    type: [String],
    default: []
  },
  applicationUrl: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    required: true,
    enum: ['linkedin', 'indeed', 'glassdoor', 'manual', 'api'],
    index: true
  },
  sourceId: {
    type: String,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'filled', 'draft'],
    default: 'active',
    index: true
  },
  postedDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiryDate: {
    type: Date,
    index: true
  },
  contactInfo: {
    email: String,
    phone: String,
    website: String
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  views: {
    type: Number,
    default: 0
  },
  applications: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better search performance
jobSchema.index({ title: 'text', description: 'text', company: 'text', skills: 'text' });
jobSchema.index({ location: 1, jobType: 1, remote: 1 });
jobSchema.index({ postedDate: -1 });
jobSchema.index({ salary: 1 });

// Virtual for salary range display
jobSchema.virtual('salaryRange').get(function() {
  if (!this.salary.min && !this.salary.max) return 'Not specified';
  if (this.salary.min && this.salary.max) {
    return `${this.salary.currency} ${this.salary.min.toLocaleString()} - ${this.salary.max.toLocaleString()} ${this.salary.period}`;
  }
  if (this.salary.min) {
    return `${this.salary.currency} ${this.salary.min.toLocaleString()}+ ${this.salary.period}`;
  }
  if (this.salary.max) {
    return `${this.salary.currency} Up to ${this.salary.max.toLocaleString()} ${this.salary.period}`;
  }
});

// Virtual for days since posted
jobSchema.virtual('daysSincePosted').get(function() {
  const now = new Date();
  const posted = this.postedDate;
  const diffTime = Math.abs(now - posted);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware to set expiry date if not provided
jobSchema.pre('save', function(next) {
  if (!this.expiryDate) {
    // Set expiry to 30 days from posted date
    this.expiryDate = new Date(this.postedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
  }
  next();
});

// Static method to find active jobs
jobSchema.statics.findActive = function() {
  return this.find({
    status: 'active',
    $or: [
      { expiryDate: { $exists: false } },
      { expiryDate: { $gt: new Date() } }
    ]
  });
};

// Instance method to check if job is expired
jobSchema.methods.isExpired = function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
};

module.exports = mongoose.model('Job', jobSchema);
