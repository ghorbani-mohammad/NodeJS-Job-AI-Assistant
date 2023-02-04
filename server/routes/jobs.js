const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { validateJob, validateJobUpdate } = require('../middleware/validation');
const logger = require('../utils/logger');

// GET /api/jobs - List all jobs with filtering, pagination, and sorting
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'postedDate',
      order = 'desc',
      status = 'active',
      jobType,
      remote,
      experienceLevel,
      industry,
      location,
      minSalary,
      maxSalary,
      skills,
      company
    } = req.query;

    // Build filter object
    const filter = { status };
    
    if (jobType) filter.jobType = jobType;
    if (remote) filter.remote = remote;
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (industry) filter.industry = { $regex: industry, $options: 'i' };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (company) filter.company = { $regex: company, $options: 'i' };
    
    // Salary filter
    if (minSalary || maxSalary) {
      filter.salary = {};
      if (minSalary) filter.salary.min = { $gte: parseInt(minSalary) };
      if (maxSalary) filter.salary.max = { $lte: parseInt(maxSalary) };
    }
    
    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      filter.skills = { $in: skillsArray };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const jobs = await Job.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await Job.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Increment view count for each job
    const jobIds = jobs.map(job => job._id);
    await Job.updateMany(
      { _id: { $in: jobIds } },
      { $inc: { views: 1 } }
    );

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    logger.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
});

// GET /api/jobs/:id - Get a specific job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).select('-__v');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Increment view count
    await Job.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    logger.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job'
    });
  }
});

// POST /api/jobs - Create a new job
router.post('/', validateJob, async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();

    logger.info(`New job created: ${job.title} at ${job.company}`);

    res.status(201).json({
      success: true,
      data: job
    });

  } catch (error) {
    logger.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create job'
    });
  }
});

// PUT /api/jobs/:id - Update a job
router.put('/:id', validateJobUpdate, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    logger.info(`Job updated: ${job.title} at ${job.company}`);

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    logger.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job'
    });
  }
});

// DELETE /api/jobs/:id - Delete a job
router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    logger.info(`Job deleted: ${job.title} at ${job.company}`);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete job'
    });
  }
});

// PATCH /api/jobs/:id/status - Update job status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'expired', 'filled', 'draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    logger.info(`Job status updated: ${job.title} - ${status}`);

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    logger.error('Error updating job status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job status'
    });
  }
});

// GET /api/jobs/stats/overview - Get job statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Job.aggregate([
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          activeJobs: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          totalViews: { $sum: '$views' },
          totalApplications: { $sum: '$applications' }
        }
      }
    ]);

    const jobTypeStats = await Job.aggregate([
      { $group: { _id: '$jobType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const remoteStats = await Job.aggregate([
      { $group: { _id: '$remote', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const industryStats = await Job.aggregate([
      { $match: { industry: { $exists: true, $ne: '' } } },
      { $group: { _id: '$industry', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalJobs: 0,
          activeJobs: 0,
          totalViews: 0,
          totalApplications: 0
        },
        jobTypes: jobTypeStats,
        remoteOptions: remoteStats,
        topIndustries: industryStats
      }
    });

  } catch (error) {
    logger.error('Error fetching job stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job statistics'
    });
  }
});

module.exports = router;
