const Joi = require('joi');
const logger = require('../utils/logger');

// Job creation validation schema
const jobSchema = Joi.object({
  title: Joi.string().required().min(3).max(200).trim(),
  company: Joi.string().required().min(2).max(100).trim(),
  location: Joi.string().required().min(2).max(100).trim(),
  description: Joi.string().required().min(10).max(5000).trim(),
  requirements: Joi.array().items(Joi.string().trim()).max(50),
  responsibilities: Joi.array().items(Joi.string().trim()).max(50),
  salary: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD').default('USD'),
    period: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly', 'yearly').default('yearly')
  }),
  jobType: Joi.string().required().valid('full-time', 'part-time', 'contract', 'internship', 'freelance'),
  experienceLevel: Joi.string().valid('entry', 'junior', 'mid', 'senior', 'lead', 'executive'),
  remote: Joi.string().valid('on-site', 'remote', 'hybrid').default('on-site'),
  industry: Joi.string().max(100).trim(),
  skills: Joi.array().items(Joi.string().trim()).max(100),
  benefits: Joi.array().items(Joi.string().trim()).max(50),
  applicationUrl: Joi.string().uri().trim(),
  source: Joi.string().required().valid('linkedin', 'indeed', 'glassdoor', 'manual', 'api'),
  sourceId: Joi.string().trim(),
  status: Joi.string().valid('active', 'expired', 'filled', 'draft').default('active'),
  postedDate: Joi.date().default(Date.now),
  expiryDate: Joi.date(),
  contactInfo: Joi.object({
    email: Joi.string().email().trim(),
    phone: Joi.string().trim(),
    website: Joi.string().uri().trim()
  }),
  tags: Joi.array().items(Joi.string().trim()).max(20)
});

// Job update validation schema (all fields optional)
const jobUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(200).trim(),
  company: Joi.string().min(2).max(100).trim(),
  location: Joi.string().min(2).max(100).trim(),
  description: Joi.string().min(10).max(5000).trim(),
  requirements: Joi.array().items(Joi.string().trim()).max(50),
  responsibilities: Joi.array().items(Joi.string().trim()).max(50),
  salary: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD', 'AUD'),
    period: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly', 'yearly')
  }),
  jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'freelance'),
  experienceLevel: Joi.string().valid('entry', 'junior', 'mid', 'senior', 'lead', 'executive'),
  remote: Joi.string().valid('on-site', 'remote', 'hybrid'),
  industry: Joi.string().max(100).trim(),
  skills: Joi.array().items(Joi.string().trim()).max(100),
  benefits: Joi.array().items(Joi.string().trim()).max(50),
  applicationUrl: Joi.string().uri().trim(),
  source: Joi.string().valid('linkedin', 'indeed', 'glassdoor', 'manual', 'api'),
  sourceId: Joi.string().trim(),
  status: Joi.string().valid('active', 'expired', 'filled', 'draft'),
  postedDate: Joi.date(),
  expiryDate: Joi.date(),
  contactInfo: Joi.object({
    email: Joi.string().email().trim(),
    phone: Joi.string().trim(),
    website: Joi.string().uri().trim()
  }),
  tags: Joi.array().items(Joi.string().trim()).max(20)
});

// Validation middleware for job creation
const validateJob = (req, res, next) => {
  const { error, value } = jobSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });

  if (error) {
    const errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn('Job validation failed:', { errors: errorDetails, body: req.body });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorDetails
    });
  }

  // Replace req.body with validated data
  req.body = value;
  next();
};

// Validation middleware for job updates
const validateJobUpdate = (req, res, next) => {
  const { error, value } = jobUpdateSchema.validate(req.body, { 
    abortEarly: false,
    stripUnknown: true 
  });

  if (error) {
    const errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn('Job update validation failed:', { errors: errorDetails, body: req.body });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorDetails
    });
  }

  // Replace req.body with validated data
  req.body = value;
  next();
};

// Search query validation
const searchQuerySchema = Joi.object({
  q: Joi.string().max(200).trim(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('relevance', 'postedDate', 'salary', 'company', 'location').default('relevance'),
  filters: Joi.string().max(1000) // JSON string
});

const validateSearchQuery = (req, res, next) => {
  const { error, value } = searchQuerySchema.validate(req.query, { 
    abortEarly: false,
    stripUnknown: true 
  });

  if (error) {
    const errorDetails = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn('Search query validation failed:', { errors: errorDetails, query: req.query });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid search parameters',
      details: errorDetails
    });
  }

  // Replace req.query with validated data
  req.query = value;
  next();
};

module.exports = {
  validateJob,
  validateJobUpdate,
  validateSearchQuery
};
