const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const logger = require('../utils/logger');

// GET /api/search - Advanced search with text search and filters
router.get('/', async (req, res) => {
  try {
    const {
      q, // search query
      page = 1,
      limit = 20,
      sort = 'relevance',
      filters = '{}'
    } = req.query;

    let searchQuery = {};
    let sortObj = {};

    // Parse filters from query string
    let parsedFilters = {};
    try {
      parsedFilters = JSON.parse(filters);
    } catch (e) {
      logger.warn('Invalid filters format:', filters);
    }

    // Build search query
    if (q && q.trim()) {
      // Text search using MongoDB text index
      searchQuery.$text = { $search: q.trim() };
      
      // Add text score for relevance sorting
      if (sort === 'relevance') {
        sortObj = { score: { $meta: 'textScore' } };
      }
    }

    // Apply filters
    if (parsedFilters.jobType) searchQuery.jobType = parsedFilters.jobType;
    if (parsedFilters.remote) searchQuery.remote = parsedFilters.remote;
    if (parsedFilters.experienceLevel) searchQuery.experienceLevel = parsedFilters.experienceLevel;
    if (parsedFilters.industry) searchQuery.industry = { $regex: parsedFilters.industry, $options: 'i' };
    if (parsedFilters.location) searchQuery.location = { $regex: parsedFilters.location, $options: 'i' };
    if (parsedFilters.company) searchQuery.company = { $regex: parsedFilters.company, $options: 'i' };
    
    // Salary filters
    if (parsedFilters.minSalary || parsedFilters.maxSalary) {
      searchQuery.salary = {};
      if (parsedFilters.minSalary) searchQuery.salary.min = { $gte: parseInt(parsedFilters.minSalary) };
      if (parsedFilters.maxSalary) searchQuery.salary.max = { $lte: parseInt(parsedFilters.maxSalary) };
    }
    
    // Skills filters
    if (parsedFilters.skills && Array.isArray(parsedFilters.skills)) {
      searchQuery.skills = { $in: parsedFilters.skills };
    }
    
    // Date filters
    if (parsedFilters.postedAfter) {
      searchQuery.postedDate = { $gte: new Date(parsedFilters.postedAfter) };
    }
    if (parsedFilters.postedBefore) {
      if (searchQuery.postedDate) {
        searchQuery.postedDate.$lte = new Date(parsedFilters.postedBefore);
      } else {
        searchQuery.postedDate = { $lte: new Date(parsedFilters.postedBefore) };
      }
    }

    // Default filters
    searchQuery.status = 'active';
    
    // Apply default sorting if not relevance
    if (sort !== 'relevance') {
      sortObj = {};
      switch (sort) {
        case 'postedDate':
          sortObj.postedDate = -1;
          break;
        case 'salary':
          sortObj['salary.max'] = -1;
          break;
        case 'company':
          sortObj.company = 1;
          break;
        case 'location':
          sortObj.location = 1;
          break;
        default:
          sortObj.postedDate = -1;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute search
    let searchPipeline = [
      { $match: searchQuery }
    ];

    // Add text score if text search is performed
    if (q && q.trim()) {
      searchPipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
    }

    // Add sorting and pagination
    searchPipeline.push(
      { $sort: sortObj },
      { $skip: skip },
      { $limit: parseInt(limit) },
      { $project: { __v: 0 } }
    );

    const jobs = await Job.aggregate(searchPipeline);
    
    // Get total count for pagination
    const total = await Job.countDocuments(searchQuery);
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
      },
      searchInfo: {
        query: q || '',
        filters: parsedFilters,
        sort,
        resultsCount: jobs.length
      }
    });

  } catch (error) {
    logger.error('Error performing search:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// GET /api/search/suggestions - Get search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const query = q.trim();
    let suggestions = [];

    switch (type) {
      case 'jobs':
        suggestions = await Job.distinct('title', {
          title: { $regex: query, $options: 'i' },
          status: 'active'
        }).limit(10);
        break;
        
      case 'companies':
        suggestions = await Job.distinct('company', {
          company: { $regex: query, $options: 'i' },
          status: 'active'
        }).limit(10);
        break;
        
      case 'locations':
        suggestions = await Job.distinct('location', {
          location: { $regex: query, $options: 'i' },
          status: 'active'
        }).limit(10);
        break;
        
      case 'skills':
        suggestions = await Job.distinct('skills', {
          skills: { $regex: query, $options: 'i' },
          status: 'active'
        }).limit(10);
        break;
        
      default:
        // Get suggestions from all fields
        const [jobTitles, companies, locations, skills] = await Promise.all([
          Job.distinct('title', { title: { $regex: query, $options: 'i' }, status: 'active' }).limit(5),
          Job.distinct('company', { company: { $regex: query, $options: 'i' }, status: 'active' }).limit(5),
          Job.distinct('location', { location: { $regex: query, $options: 'i' }, status: 'active' }).limit(5),
          Job.distinct('skills', { skills: { $regex: query, $options: 'i' }, status: 'active' }).limit(5)
        ]);
        
        suggestions = [
          ...jobTitles.map(title => ({ type: 'job', value: title })),
          ...companies.map(company => ({ type: 'company', value: company })),
          ...locations.map(location => ({ type: 'location', value: location })),
          ...skills.map(skill => ({ type: 'skill', value: skill }))
        ];
    }

    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    logger.error('Error getting search suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

// GET /api/search/filters - Get available filter options
router.get('/filters', async (req, res) => {
  try {
    const [jobTypes, remoteOptions, experienceLevels, industries, locations] = await Promise.all([
      Job.distinct('jobType', { status: 'active' }),
      Job.distinct('remote', { status: 'active' }),
      Job.distinct('experienceLevel', { status: 'active' }),
      Job.distinct('industry', { status: 'active', industry: { $exists: true, $ne: '' } }),
      Job.distinct('location', { status: 'active' })
    ]);

    // Get salary ranges
    const salaryStats = await Job.aggregate([
      { $match: { status: 'active', 'salary.min': { $exists: true }, 'salary.max': { $exists: true } } },
      {
        $group: {
          _id: null,
          minSalary: { $min: '$salary.min' },
          maxSalary: { $max: '$salary.max' },
          avgSalary: { $avg: { $avg: ['$salary.min', '$salary.max'] } }
        }
      }
    ]);

    // Get top skills
    const topSkills = await Job.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: {
        jobTypes: jobTypes.sort(),
        remoteOptions: remoteOptions.sort(),
        experienceLevels: experienceLevels.sort(),
        industries: industries.sort(),
        locations: locations.sort(),
        salaryRange: salaryStats[0] || { minSalary: 0, maxSalary: 0, avgSalary: 0 },
        topSkills: topSkills.map(skill => skill._id)
      }
    });

  } catch (error) {
    logger.error('Error getting filter options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get filter options'
    });
  }
});

module.exports = router;
