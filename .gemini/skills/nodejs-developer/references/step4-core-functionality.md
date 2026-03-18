### Step 4: Implement Core Functionality

Great! Moving forward, in **Step 4: Implement Core Functionality**, we'll develop the main features and API endpoints of the **EduConnect: Adaptive Learning Backend**. This step ensures that the backend aligns with your **project_requirements**, including user authentication, course management, progress tracking, adaptive learning algorithms, video streaming integration, and the quiz system.

---

#### 1. **Set Up Express Middleware and Routing Structure**

Before diving into specific functionalities, ensure that your Express application is set up to handle routing and middleware effectively.

**a. Update `src/app.js`**

Create an `app.js` file to configure middleware and routes, separating it from `index.js` for better organization.

```javascript
// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); // For security headers
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { graphqlHTTP } = require('express-graphql');
const schema = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

const app = express();

// Middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Rate Limiting
app.use('/v1', rateLimiter);

// Routes
const userRoutes = require('./routes/v1/userRoutes');
const courseRoutes = require('./routes/v1/courseRoutes');
const progressRoutes = require('./routes/v1/progressRoutes');
const quizRoutes = require('./routes/v1/quizRoutes');
const learningMaterialRoutes = require('./routes/v1/learningMaterialRoutes');

app.use('/v1/users', userRoutes);
app.use('/v1/courses', courseRoutes);
app.use('/v1/progress', progressRoutes);
app.use('/v1/quizzes', quizRoutes);
app.use('/v1/learning-materials', learningMaterialRoutes);

// GraphQL Endpoint
app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    rootValue: resolvers,
    graphiql: process.env.NODE_ENV !== 'production'
  })
);

// API Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EduConnect API',
      version: '1.0.0',
      description: 'API documentation for EduConnect Backend',
    },
    servers: [
      {
        url: 'https://api.educonnect.com/v1',
      },
    ],
  },
  apis: ['./src/routes/v1/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
```

**b. Update `src/index.js`**

Modify `index.js` to use the newly created `app.js`.

```javascript
// src/index.js

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { sequelize } = require('./models'); // Sequelize instance
const connectDB = require('../config/mongoose');
const { connectRedis } = require('../config/redis');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);

// Optional: Initialize WebSocket server here if using libraries like Socket.io

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully.');

    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    await connectRedis();

    // Start the server
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

startServer();
```

---

#### 2. **Develop User Authentication and Management**

Implement user registration, login, profile management, and role-based access control.

**a. **User Routes**

**`src/routes/v1/userRoutes.js`**

```javascript
// src/routes/v1/userRoutes.js

const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, deleteUser, refreshToken } = require('../../controllers/userController');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

// Register User
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  validate,
  register
);

// Login User
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

// Refresh Token
router.post('/refresh-token', refreshToken);

// Get User Profile
router.get('/profile', authMiddleware, getProfile);

// Update User Profile
router.put(
  '/profile',
  authMiddleware,
  [
    body('username').optional().notEmpty().withMessage('Username cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    // Add more validations as needed
  ],
  validate,
  updateProfile
);

// Delete User
router.delete('/profile', authMiddleware, deleteUser);

module.exports = router;
```

**b. **User Controller**

**`src/controllers/userController.js`**

```javascript
// src/controllers/userController.js

const userService = require('../services/userService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const CustomError = require('../utils/CustomError');

// Helper to generate tokens
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, roles: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Register User
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      throw new CustomError('User already exists with this email', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await userService.createUser({
      username,
      email,
      password: hashedPassword,
      roles: ['student'],
    });

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Optionally, store refresh token in Redis or database

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login User
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await userService.findUserByEmail(email);
    if (!user) {
      throw new CustomError('Invalid email or password', 401);
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new CustomError('Invalid email or password', 401);
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Optionally, store refresh token in Redis or database

    res.status(200).json({
      success: true,
      data: {
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Refresh Token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new CustomError('Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await userService.findUserById(decoded.id);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Generate new access token
    const newToken = generateToken(user);

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new CustomError('Refresh token expired', 401));
    }
    next(error);
  }
};

// Get User Profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await userService.findUserById(req.user.id);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update User Profile
exports.updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await userService.updateUser(req.user.id, updates);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete User
exports.deleteUser = async (req, res, next) => {
  try {
    const success = await userService.deleteUser(req.user.id);
    if (!success) {
      throw new CustomError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'User account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

**c. **User Service**

**`src/services/userService.js`**

```javascript
// src/services/userService.js

const userRepository = require('../repositories/userRepository');

const createUser = async (userData) => {
  return await userRepository.create(userData);
};

const findUserByEmail = async (email) => {
  return await userRepository.findByEmail(email);
};

const findUserById = async (id) => {
  return await userRepository.findById(id);
};

const updateUser = async (id, updates) => {
  return await userRepository.update(id, updates);
};

const deleteUser = async (id) => {
  return await userRepository.delete(id);
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  deleteUser,
};
```

**d. **User Repository**

**`src/repositories/userRepository.js`**

```javascript
// src/repositories/userRepository.js

const { User, Course } = require('../models');

class UserRepository {
  async create(userData) {
    return await User.create(userData);
  }

  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async findById(id) {
    return await User.findByPk(id, {
      attributes: ['id', 'username', 'email', 'roles', 'createdAt', 'updatedAt'],
      include: [{ model: Course, as: 'courses', attributes: ['id', 'title'] }],
    });
  }

  async update(id, updates) {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.update(updates);
    return user;
  }

  async delete(id) {
    const user = await User.findByPk(id);
    if (!user) return false;
    await user.destroy(); // Soft delete if paranoid is enabled
    return true;
  }
}

module.exports = new UserRepository();
```

**e. **Authentication Middleware**

**`src/middleware/authMiddleware.js`**

```javascript
// src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const CustomError = require('../utils/CustomError');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new CustomError('Authorization header missing or malformed', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      roles: decoded.roles,
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new CustomError('Token expired', 401));
    }
    next(new CustomError('Invalid token', 401));
  }
};

module.exports = authMiddleware;
```

---

#### 3. **Implement Course Management**

Enable instructors/admins to create, read, update, and delete courses.

**a. **Course Routes**

**`src/routes/v1/courseRoutes.js`**

```javascript
// src/routes/v1/courseRoutes.js

const express = require('express');
const router = express.Router();
const { createCourse, getAllCourses, getCourseById, updateCourse, deleteCourse } = require('../../controllers/courseController');
const { body, param } = require('express-validator');
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management
 */

// Create Course
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['admin', 'instructor']),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('videos').isArray().withMessage('Videos should be an array of URLs'),
    body('materials').isArray().withMessage('Materials should be an array of URLs'),
  ],
  validate,
  createCourse
);

// Get All Courses with Pagination and Filtering
router.get('/', getAllCourses);

// Get Course by ID
router.get(
  '/:courseId',
  [
    param('courseId').isUUID().withMessage('Valid courseId is required'),
  ],
  validate,
  getCourseById
);

// Update Course
router.put(
  '/:courseId',
  authMiddleware,
  roleMiddleware(['admin', 'instructor']),
  [
    param('courseId').isUUID().withMessage('Valid courseId is required'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().notEmpty().withMessage('Description cannot be empty'),
    body('category').optional().notEmpty().withMessage('Category cannot be empty'),
    body('videos').optional().isArray().withMessage('Videos should be an array of URLs'),
    body('materials').optional().isArray().withMessage('Materials should be an array of URLs'),
  ],
  validate,
  updateCourse
);

// Delete Course
router.delete(
  '/:courseId',
  authMiddleware,
  roleMiddleware(['admin', 'instructor']),
  [
    param('courseId').isUUID().withMessage('Valid courseId is required'),
  ],
  validate,
  deleteCourse
);

module.exports = router;
```

**b. **Role-Based Access Control Middleware**

Ensure only users with specific roles can access certain endpoints.

**`src/middleware/roleMiddleware.js`**

```javascript
// src/middleware/roleMiddleware.js

const CustomError = require('../utils/CustomError');

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user.roles;
    const hasRole = userRoles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return next(new CustomError('Access denied: insufficient permissions', 403));
    }
    next();
  };
};

module.exports = roleMiddleware;
```

**c. **Course Controller**

**`src/controllers/courseController.js`**

```javascript
// src/controllers/courseController.js

const courseService = require('../services/courseService');
const CustomError = require('../utils/CustomError');

// Create Course
exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, category, videos, materials } = req.body;
    const instructorId = req.user.id;

    const course = await courseService.createCourse({
      title,
      description,
      category,
      videos,
      materials,
      instructorId,
    });

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Courses with Pagination and Filtering
exports.getAllCourses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const courses = await courseService.getAllCourses({ page, limit, category, search });

    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

// Get Course by ID
exports.getCourseById = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const course = await courseService.getCourseById(courseId);

    if (!course) {
      throw new CustomError('Course not found', 404);
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// Update Course
exports.updateCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const updates = req.body;

    // Verify that the user is the instructor or admin
    const course = await courseService.getCourseById(courseId);
    if (!course) {
      throw new CustomError('Course not found', 404);
    }

    if (req.user.roles.includes('admin') || course.instructorId === req.user.id) {
      const updatedCourse = await courseService.updateCourse(courseId, updates);
      res.status(200).json({
        success: true,
        data: updatedCourse,
      });
    } else {
      throw new CustomError('Access denied: not the course instructor', 403);
    }
  } catch (error) {
    next(error);
  }
};

// Delete Course
exports.deleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Verify that the user is the instructor or admin
    const course = await courseService.getCourseById(courseId);
    if (!course) {
      throw new CustomError('Course not found', 404);
    }

    if (req.user.roles.includes('admin') || course.instructorId === req.user.id) {
      await courseService.deleteCourse(courseId);
      res.status(200).json({
        success: true,
        message: 'Course deleted successfully',
      });
    } else {
      throw new CustomError('Access denied: not the course instructor', 403);
    }
  } catch (error) {
    next(error);
  }
};
```

**d. **Course Service**

**`src/services/courseService.js`**

```javascript
// src/services/courseService.js

const courseRepository = require('../repositories/courseRepository');
const learningMaterialService = require('./learningMaterialService');
const quizService = require('./quizService');

const createCourse = async (courseData) => {
  // Assuming courseData contains title, description, category, videos, materials, instructorId
  const course = await courseRepository.create(courseData);

  // Optionally, create learning materials and quizzes here or handle separately
  // Example:
  // await learningMaterialService.createLearningMaterials(course.id, courseData.materials);
  
  return course;
};

const getAllCourses = async ({ page, limit, category, search }) => {
  return await courseRepository.findAll({ page, limit, category, search });
};

const getCourseById = async (courseId) => {
  return await courseRepository.findById(courseId);
};

const updateCourse = async (courseId, updates) => {
  return await courseRepository.update(courseId, updates);
};

const deleteCourse = async (courseId) => {
  return await courseRepository.delete(courseId);
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
};
```

**e. **Course Repository**

**`src/repositories/courseRepository.js`**

```javascript
// src/repositories/courseRepository.js

const { Course, Quiz, User } = require('../models');
const { Op } = require('sequelize');

class CourseRepository {
  async create(courseData) {
    return await Course.create(courseData);
  }

  async findAll({ page, limit, category, search }) {
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Course.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'instructor', attributes: ['id', 'username', 'email'] }],
    });

    return {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      courses: rows,
    };
  }

  async findById(courseId) {
    return await Course.findByPk(courseId, {
      include: [
        { model: User, as: 'instructor', attributes: ['id', 'username', 'email'] },
        { model: Quiz, as: 'quizzes' },
      ],
    });
  }

  async update(courseId, updates) {
    const course = await Course.findByPk(courseId);
    if (!course) return null;
    await course.update(updates);
    return course;
  }

  async delete(courseId) {
    // Implement cascade deletion if needed, or handle in service
    return await Course.destroy({ where: { id: courseId } });
  }
}

module.exports = new CourseRepository();
```

---

#### 4. **Implement Progress Tracking**

Allow users to track their progress through courses, including completed modules and quiz scores.

**a. **Progress Routes**

**`src/routes/v1/progressRoutes.js`**

```javascript
// src/routes/v1/progressRoutes.js

const express = require('express');
const router = express.Router();
const { getUserProgress, updateUserProgress } = require('../../controllers/progressController');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: User progress tracking
 */

// Get User Progress
router.get('/', authMiddleware, getUserProgress);

// Update User Progress
router.put(
  '/',
  authMiddleware,
  [
    body('courseId').isUUID().withMessage('Valid courseId is required'),
    body('completedModules').isArray().withMessage('completedModules should be an array of module identifiers'),
    body('quizScores').isObject().withMessage('quizScores should be an object with quizId as keys and scores as values'),
  ],
  validate,
  updateUserProgress
);

module.exports = router;
```

**b. **Progress Controller**

**`src/controllers/progressController.js`**

```javascript
// src/controllers/progressController.js

const progressService = require('../services/progressService');
const CustomError = require('../utils/CustomError');

exports.getUserProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const progress = await progressService.getUserProgress(userId);

    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { courseId, completedModules, quizScores } = req.body;

    const updatedProgress = await progressService.updateUserProgress(userId, { courseId, completedModules, quizScores });

    res.status(200).json({
      success: true,
      data: updatedProgress,
    });
  } catch (error) {
    next(error);
  }
};
```

**c. **Progress Service**

**`src/services/progressService.js`**

```javascript
// src/services/progressService.js

const userProgressRepository = require('../repositories/userProgressRepository');
const courseService = require('./courseService');
const CustomError = require('../utils/CustomError');

const getUserProgress = async (userId) => {
  return await userProgressRepository.findByUserId(userId);
};

const updateUserProgress = async (userId, { courseId, completedModules, quizScores }) => {
  // Validate course existence
  const course = await courseService.getCourseById(courseId);
  if (!course) {
    throw new CustomError('Course not found', 404);
  }

  // Update progress
  const progress = await userProgressRepository.updateProgress(userId, courseId, { completedModules, quizScores });

  return progress;
};

module.exports = {
  getUserProgress,
  updateUserProgress,
};
```

**d. **Progress Repository**

**`src/repositories/userProgressRepository.js`**

```javascript
// src/repositories/userProgressRepository.js

const UserProgress = require('../models/mongoose/UserProgress');

class UserProgressRepository {
  async findByUserId(userId) {
    return await UserProgress.find({ userId }).lean();
  }

  async updateProgress(userId, courseId, updates) {
    const progress = await UserProgress.findOne({ userId, courseId });
    if (progress) {
      // Update existing progress
      if (updates.completedModules) {
        progress.completedModules = [...new Set([...progress.completedModules, ...updates.completedModules])];
      }
      if (updates.quizScores) {
        Object.keys(updates.quizScores).forEach(quizId => {
          progress.quizScores.set(quizId, updates.quizScores[quizId]);
        });
      }
      if (updates.adaptiveData) {
        progress.adaptiveData = { ...progress.adaptiveData, ...updates.adaptiveData };
      }
      await progress.save();
      return progress;
    } else {
      // Create new progress
      const newProgress = new UserProgress({
        userId,
        courseId,
        completedModules: updates.completedModules || [],
        quizScores: updates.quizScores || {},
        adaptiveData: updates.adaptiveData || {},
      });
      await newProgress.save();
      return newProgress;
    }
  }
}

module.exports = new UserProgressRepository();
```

---

#### 5. **Integrate Adaptive Learning Algorithms**

Implement adaptive learning algorithms that adjust course content based on user progress and performance.

**a. **Adaptive Learning Service**

**`src/services/adaptiveLearningService.js`**

```javascript
// src/services/adaptiveLearningService.js

const userProgressService = require('./progressService');
const learningMaterialService = require('./learningMaterialService');
const quizService = require('./quizService');

const adjustLearningPath = async (userId, courseId) => {
  // Fetch user progress
  const progress = await userProgressService.getUserProgress(userId);
  const courseProgress = progress.find(p => p.courseId === courseId);

  if (!courseProgress) {
    // Initialize progress if not exists
    await userProgressService.updateUserProgress(userId, { courseId, completedModules: [], quizScores: {} });
    return;
  }

  // Analyze quiz scores to determine areas of improvement
  const lowScores = Object.entries(courseProgress.quizScores)
    .filter(([quizId, score]) => score < 70)
    .map(([quizId]) => quizId);

  // Recommend additional materials or modules based on low scores
  if (lowScores.length > 0) {
    const recommendedMaterials = await learningMaterialService.getRecommendedMaterials(courseId, lowScores);
    // Update adaptive data or notify user
    // This can be expanded based on specific requirements
    return recommendedMaterials;
  }

  // Further adaptive logic can be implemented here
};

module.exports = {
  adjustLearningPath,
};
```

**b. **Invoke Adaptive Learning After Quiz Submission**

Modify the quiz submission controller to trigger the adaptive learning adjustment.

**`src/controllers/quizController.js`**

```javascript
// src/controllers/quizController.js

const quizService = require('../services/quizService');
const adaptiveLearningService = require('../services/adaptiveLearningService');
const CustomError = require('../utils/CustomError');

exports.submitQuiz = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    // Submit quiz and get results
    const quizResult = await quizService.submitQuiz(userId, quizId, answers);

    // Adjust learning path based on results
    await adaptiveLearningService.adjustLearningPath(userId, quizResult.courseId);

    res.status(200).json({
      success: true,
      data: quizResult,
    });
  } catch (error) {
    next(error);
  }
};
```

---

#### 6. **Integrate Video Streaming**

Allow users to stream video content within courses.

**a. **Video Streaming Service**

Depending on your video hosting strategy, you can either:

- **Host Videos on a CDN:** Use services like AWS S3 with CloudFront, Vimeo, or other video platforms.
- **Stream Directly from Server:** Not recommended for scalability but possible for small projects.

**Example: Serving Videos from AWS S3 with CloudFront**

1. **Upload Videos to S3:**
   - Organize videos into buckets or folders based on courses.
   
2. **Set Up CloudFront Distribution:**
   - Configure CloudFront to serve videos from S3.
   - Enable streaming features as needed.
   
3. **Store Video URLs in Course Data:**
   - In your course model, store the CloudFront URLs for video content.

**b. **Learning Material Service Update**

Ensure that video URLs are correctly integrated into learning materials.

**`src/services/learningMaterialService.js`**

```javascript
// src/services/learningMaterialService.js

const LearningMaterial = require('../models/mongoose/LearningMaterial');

const createLearningMaterial = async (materialData) => {
  const material = new LearningMaterial(materialData);
  return await material.save();
};

const getMaterialsByCourseId = async (courseId) => {
  return await LearningMaterial.find({ courseId });
};

const getRecommendedMaterials = async (courseId, lowScores) => {
  // Implement logic to fetch recommended materials based on lowScores
  // For example, fetch materials related to specific modules or topics
  // This is a placeholder implementation
  return await LearningMaterial.find({ courseId, resourceType: 'document' });
};

module.exports = {
  createLearningMaterial,
  getMaterialsByCourseId,
  getRecommendedMaterials,
};
```

**c. **Serve Video Content Securely**

Ensure that video URLs are secured, possibly with signed URLs that expire after a certain time to prevent unauthorized access.

**Example: Generating Signed URLs with AWS SDK**

```javascript
// src/services/videoService.js

const AWS = require('aws-sdk');
const CustomError = require('../utils/CustomError');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const generateSignedUrl = (bucketName, key, expires = 3600) => {
  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: expires, // URL expiration time in seconds
  };
  return s3.getSignedUrl('getObject', params);
};

const getVideoUrl = async (courseId, videoKey) => {
  try {
    const signedUrl = generateSignedUrl(process.env.AWS_S3_BUCKET, `courses/${courseId}/videos/${videoKey}`);
    return signedUrl;
  } catch (error) {
    throw new CustomError('Failed to generate video URL', 500);
  }
};

module.exports = {
  getVideoUrl,
};
```

**d. **Video Controller**

**`src/controllers/videoController.js`**

```javascript
// src/controllers/videoController.js

const videoService = require('../services/videoService');
const CustomError = require('../utils/CustomError');

exports.getVideo = async (req, res, next) => {
  try {
    const { courseId, videoKey } = req.params;

    // Optionally, verify user has access to the course

    const videoUrl = await videoService.getVideoUrl(courseId, videoKey);

    res.status(200).json({
      success: true,
      data: {
        url: videoUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

**e. **Video Routes**

**`src/routes/v1/videoRoutes.js`**

```javascript
// src/routes/v1/videoRoutes.js

const express = require('express');
const router = express.Router();
const { getVideo } = require('../../controllers/videoController');
const { param } = require('express-validator');
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Videos
 *   description: Video streaming
 */

// Get Video URL
router.get(
  '/:courseId/videos/:videoKey',
  authMiddleware,
  [
    param('courseId').isUUID().withMessage('Valid courseId is required'),
    param('videoKey').notEmpty().withMessage('videoKey is required'),
  ],
  validate,
  getVideo
);

module.exports = router;
```

**f. **Register Video Routes**

Add video routes to `app.js` or the appropriate routing file.

```javascript
// src/app.js

// ... existing imports

const videoRoutes = require('./routes/v1/videoRoutes');
app.use('/v1/videos', videoRoutes);

// ... existing code
```

---

#### 7. **Develop Quiz System**

Allow instructors to create quizzes and users to submit answers, with automatic grading.

**a. **Quiz Routes**

**`src/routes/v1/quizRoutes.js`**

```javascript
// src/routes/v1/quizRoutes.js

const express = require('express');
const router = express.Router();
const { createQuiz, getQuizById, submitQuiz } = require('../../controllers/quizController');
const { body, param } = require('express-validator');
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/authMiddleware');
const roleMiddleware = require('../../middleware/roleMiddleware');

/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Quiz management
 */

// Create Quiz
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['admin', 'instructor']),
  [
    body('courseId').isUUID().withMessage('Valid courseId is required'),
    body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
    body('questions.*.questionText').notEmpty().withMessage('Question text is required'),
    body('questions.*.options').isArray({ min: 2 }).withMessage('At least two options are required'),
    body('questions.*.correctAnswer').notEmpty().withMessage('Correct answer is required'),
  ],
  validate,
  createQuiz
);

// Get Quiz by ID
router.get(
  '/:quizId',
  [
    param('quizId').isUUID().withMessage('Valid quizId is required'),
  ],
  validate,
  getQuizById
);

// Submit Quiz Answers
router.post(
  '/:quizId/submit',
  authMiddleware,
  [
    param('quizId').isUUID().withMessage('Valid quizId is required'),
    body('answers').isObject().withMessage('Answers must be provided as an object'),
    body('answers.*').notEmpty().withMessage('Each answer must have a selected option'),
  ],
  validate,
  submitQuiz
);

module.exports = router;
```

**b. **Quiz Controller**

**`src/controllers/quizController.js`**

```javascript
// src/controllers/quizController.js

const quizService = require('../services/quizService');
const CustomError = require('../utils/CustomError');

exports.createQuiz = async (req, res, next) => {
  try {
    const { courseId, questions } = req.body;
    const instructorId = req.user.id;

    // Create quiz
    const quiz = await quizService.createQuiz({ courseId, questions, instructorId });

    res.status(201).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

exports.getQuizById = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const quiz = await quizService.getQuizById(quizId);

    if (!quiz) {
      throw new CustomError('Quiz not found', 404);
    }

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

exports.submitQuiz = async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    // Submit quiz
    const quizResult = await quizService.submitQuiz(userId, quizId, answers);

    res.status(200).json({
      success: true,
      data: quizResult,
    });
  } catch (error) {
    next(error);
  }
};
```

**c. **Quiz Service**

**`src/services/quizService.js`**

```javascript
// src/services/quizService.js

const quizRepository = require('../repositories/quizRepository');
const courseService = require('./courseService');
const userProgressService = require('./progressService');
const CustomError = require('../utils/CustomError');

const createQuiz = async ({ courseId, questions, instructorId }) => {
  // Validate course ownership
  const course = await courseService.getCourseById(courseId);
  if (!course) {
    throw new CustomError('Course not found', 404);
  }

  if (course.instructorId !== instructorId && !['admin'].some(role => role === 'admin')) {
    throw new CustomError('Not authorized to add quiz to this course', 403);
  }

  // Create quiz
  const quiz = await quizRepository.createQuiz({ courseId, questions });
  return quiz;
};

const getQuizById = async (quizId) => {
  return await quizRepository.findById(quizId);
};

const submitQuiz = async (userId, quizId, answers) => {
  const quiz = await quizRepository.findById(quizId);
  if (!quiz) {
    throw new CustomError('Quiz not found', 404);
  }

  // Grade the quiz
  let score = 0;
  const correctAnswers = [];

  quiz.questions.forEach((question, index) => {
    const userAnswer = answers[`question${index + 1}`];
    if (userAnswer && userAnswer === question.correctAnswer) {
      score += 1;
      correctAnswers.push({
        questionId: question.id,
        correctOption: question.correctAnswer,
      });
    }
  });

  const total = quiz.questions.length;
  const percentageScore = (score / total) * 100;

  // Update user progress
  await userProgressService.updateUserProgress(userId, quiz.courseId, {
    quizScores: { [`quiz${quizId}`]: percentageScore },
  });

  // Return results
  return {
    quizId,
    score: percentageScore,
    total,
    correctAnswers,
  };
};

module.exports = {
  createQuiz,
  getQuizById,
  submitQuiz,
};
```

**d. **Quiz Repository**

**`src/repositories/quizRepository.js`**

```javascript
// src/repositories/quizRepository.js

const { Quiz } = require('../models');

class QuizRepository {
  async createQuiz({ courseId, questions }) {
    return await Quiz.create({ courseId, questions });
  }

  async findById(quizId) {
    return await Quiz.findByPk(quizId, {
      include: [{ model: require('./courseRepository').Course, as: 'course' }],
    });
  }
}

module.exports = new QuizRepository();
```

**e. **Mongoose Schema for Quizzes (Optional)**

If you decide to store quizzes in MongoDB, adjust the schema and repository accordingly. However, since quizzes are more structured, storing them in PostgreSQL is recommended.

---

#### 8. **Integrate Real-Time Features with WebSockets**

Enable real-time updates such as live notifications and progress tracking.

**a. **Set Up WebSocket Server**

Use **Socket.io** for handling WebSocket connections.

**Install Socket.io:**

```bash
npm install socket.io
```

**b. **Configure WebSocket in `index.js`**

Modify `index.js` to set up the Socket.io server.

```javascript
// src/index.js

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { sequelize } = require('./models'); // Sequelize instance
const connectDB = require('../config/mongoose');
const { connectRedis } = require('../config/redis');
const logger = require('./utils/logger');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['https://www.educonnect.com', 'https://app.educonnect.com'], // Allowed origins
    methods: ['GET', 'POST'],
  },
});

// Middleware for authenticating WebSocket connections
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = {
      id: decoded.id,
      roles: decoded.roles,
    };
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Handle WebSocket connections
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.user.id}`);

  // Join rooms based on user or course
  socket.join(`user_${socket.user.id}`);
  // Additional room logic as needed

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.user.id}`);
  });
});

// Export io for use in services/controllers
module.exports = { io };

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await sequelize.authenticate();
    logger.info('PostgreSQL connected successfully.');

    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    await connectRedis();

    // Start the server
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

startServer();
```

**c. **Emit Events from Services**

Trigger real-time events from your services whenever certain actions occur.

**Example: Notify Users When a New Course is Created**

**Modify Course Service:**

```javascript
// src/services/courseService.js

const courseRepository = require('../repositories/courseRepository');
const learningMaterialService = require('./learningMaterialService');
const quizService = require('./quizService');
const { io } = require('../index'); // Import the Socket.io instance

const createCourse = async (courseData) => {
  // Create course
  const course = await courseRepository.create(courseData);

  // Emit event to notify users
  io.emit('NEW_COURSE', {
    courseId: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
  });

  return course;
};

// ... other methods

module.exports = {
  createCourse,
  // ... other exports
};
```

**Example: Real-Time Progress Update**

**Modify Progress Service:**

```javascript
// src/services/progressService.js

const userProgressRepository = require('../repositories/userProgressRepository');
const courseService = require('./courseService');
const { io } = require('../index'); // Import the Socket.io instance

const getUserProgress = async (userId) => {
  return await userProgressRepository.findByUserId(userId);
};

const updateUserProgress = async (userId, { courseId, completedModules, quizScores }) => {
  // Validate course existence
  const course = await courseService.getCourseById(courseId);
  if (!course) {
    throw new CustomError('Course not found', 404);
  }

  // Update progress
  const progress = await userProgressRepository.updateProgress(userId, courseId, { completedModules, quizScores });

  // Emit real-time update to the user
  io.to(`user_${userId}`).emit('PROGRESS_UPDATE', {
    courseId,
    completedModules: progress.completedModules,
    quizScores: progress.quizScores,
  });

  return progress;
};

module.exports = {
  getUserProgress,
  updateUserProgress,
};
```

**d. **Client-Side Integration**

Ensure that your frontend clients connect to the WebSocket server and handle incoming events appropriately.

**Example using Socket.io Client:**

```javascript
// frontend/src/socket.js

import { io } from 'socket.io-client';

const socket = io('https://api.educonnect.com', {
  auth: {
    token: 'JWT_TOKEN', // Replace with actual token
  },
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('NEW_COURSE', (data) => {
  // Handle new course notification
  console.log('New Course Available:', data);
});

socket.on('PROGRESS_UPDATE', (data) => {
  // Handle progress update
  console.log('Progress Updated:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});

export default socket;
```

---

#### 9. **Implement Video Streaming Integration**

Integrate video streaming services to deliver course videos seamlessly.

**a. **Use Third-Party Video Platforms**

Consider integrating with platforms like **Vimeo**, **YouTube**, or **AWS Elemental Media Services** for scalable video streaming.

**Example: Embedding Vimeo Videos**

1. **Upload Videos to Vimeo:**
   - Use Vimeo’s API to upload and manage videos programmatically.

2. **Store Vimeo Video URLs in Learning Materials:**
   - When creating learning materials, include Vimeo embed URLs.

3. **Frontend Integration:**
   - Use Vimeo’s embed player in your frontend application to stream videos.

**b. **Implement Video Upload and Management (Optional)**

If you choose to manage video uploads within your application:

1. **Set Up File Uploads:**
   - Use libraries like **Multer** for handling multipart/form-data.

   **Install Multer:**

   ```bash
   npm install multer
   ```

2. **Create Video Upload Controller:**

   **`src/controllers/videoUploadController.js`**

   ```javascript
   // src/controllers/videoUploadController.js

   const multer = require('multer');
   const path = require('path');
   const videoService = require('../services/videoService');
   const CustomError = require('../utils/CustomError');

   // Configure Multer Storage
   const storage = multer.diskStorage({
     destination: function (req, file, cb) {
       cb(null, 'uploads/videos/');
     },
     filename: function (req, file, cb) {
       cb(null, `${Date.now()}-${file.originalname}`);
     },
   });

   // File Filter
   const fileFilter = (req, file, cb) => {
     const fileTypes = /mp4|avi|mkv/;
     const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
     const mimetype = fileTypes.test(file.mimetype);

     if (mimetype && extname) {
       return cb(null, true);
     } else {
       cb(new CustomError('Only video files are allowed', 400));
     }
   };

   const upload = multer({
     storage,
     limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
     fileFilter,
   });

   // Video Upload Handler
   exports.uploadVideo = [
     upload.single('video'),
     async (req, res, next) => {
       try {
         if (!req.file) {
           throw new CustomError('No file uploaded', 400);
         }

         // Process and store video (e.g., upload to S3)
         const videoUrl = await videoService.uploadVideoToS3(req.file);

         res.status(201).json({
           success: true,
           data: {
             url: videoUrl,
           },
         });
       } catch (error) {
         next(error);
       }
     },
   ];
   ```

3. **Video Upload Service**

   **`src/services/videoService.js`**

   ```javascript
   // src/services/videoService.js

   const AWS = require('aws-sdk');
   const fs = require('fs');
   const path = require('path');
   const CustomError = require('../utils/CustomError');

   const s3 = new AWS.S3({
     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
     region: process.env.AWS_REGION,
   });

   const uploadVideoToS3 = async (file) => {
     const fileContent = fs.readFileSync(file.path);
     const params = {
       Bucket: process.env.AWS_S3_BUCKET,
       Key: `videos/${Date.now()}-${file.originalname}`,
       Body: fileContent,
       ContentType: file.mimetype,
     };

     try {
       const data = await s3.upload(params).promise();
       // Optionally, delete the local file after upload
       fs.unlinkSync(file.path);
       return data.Location; // URL of the uploaded video
     } catch (error) {
       throw new CustomError('Failed to upload video', 500);
     }
   };

   module.exports = {
     uploadVideoToS3,
   };
   ```

4. **Video Upload Routes**

   **`src/routes/v1/videoUploadRoutes.js`**

   ```javascript
   // src/routes/v1/videoUploadRoutes.js

   const express = require('express');
   const router = express.Router();
   const { uploadVideo } = require('../../controllers/videoUploadController');
   const authMiddleware = require('../../middleware/authMiddleware');
   const roleMiddleware = require('../../middleware/roleMiddleware');

   /**
    * @swagger
    * tags:
    *   name: Video Upload
    *   description: Upload and manage course videos
    */

   // Upload Video
   router.post(
     '/upload',
     authMiddleware,
     roleMiddleware(['admin', 'instructor']),
     uploadVideo
   );

   module.exports = router;
   ```

5. **Register Video Upload Routes**

   Add video upload routes to `app.js` or the appropriate routing file.

   ```javascript
   // src/app.js

   // ... existing imports

   const videoUploadRoutes = require('./routes/v1/videoUploadRoutes');
   app.use('/v1/video', videoUploadRoutes);

   // ... existing code
   ```

---

#### 10. **Implement Quiz System Enhancements**

Enhance the quiz system with features like timed quizzes, question types, and feedback.

**a. **Add Timed Quizzes**

1. **Update Quiz Schema:**

   **`models/quiz.js`**

   ```javascript
   // models/quiz.js

   'use strict';
   const { Model } = require('sequelize');
   module.exports = (sequelize, DataTypes) => {
     class Quiz extends Model {
       static associate(models) {
         // Define associations here
         Quiz.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
       }
     }
     Quiz.init(
       {
         title: {
           type: DataTypes.STRING,
           allowNull: false
         },
         courseId: {
           type: DataTypes.UUID,
           allowNull: false,
           references: {
             model: 'Courses',
             key: 'id'
           }
         },
         questions: {
           type: DataTypes.JSONB,
           allowNull: false
         },
         timeLimit: { // Time limit in minutes
           type: DataTypes.INTEGER,
           allowNull: true
         }
       },
       {
         sequelize,
         modelName: 'Quiz',
         tableName: 'Quizzes',
         timestamps: true
       }
     );
     return Quiz;
   };
   ```

2. **Create Migration for `timeLimit`:**

   ```bash
   npx sequelize-cli migration:generate --name add-timeLimit-to-quizzes
   ```

   **`migrations/XXXXXX-add-timeLimit-to-quizzes.js`:**

   ```javascript
   'use strict';

   module.exports = {
     up: async (queryInterface, Sequelize) => {
       await queryInterface.addColumn('Quizzes', 'timeLimit', {
         type: Sequelize.INTEGER,
         allowNull: true,
       });
     },

     down: async (queryInterface, Sequelize) => {
       await queryInterface.removeColumn('Quizzes', 'timeLimit');
     }
   };
   ```

   **Run Migration:**

   ```bash
   npx sequelize-cli db:migrate
   ```

3. **Update Quiz Controller to Handle `timeLimit`:**

   **`src/controllers/quizController.js`**

   ```javascript
   // Modify createQuiz to include timeLimit

   exports.createQuiz = async (req, res, next) => {
     try {
       const { courseId, questions, timeLimit } = req.body;
       const instructorId = req.user.id;

       // Create quiz
       const quiz = await quizService.createQuiz({ courseId, questions, timeLimit, instructorId });

       res.status(201).json({
         success: true,
         data: quiz,
       });
     } catch (error) {
       next(error);
     }
   };
   ```

4. **Update Quiz Service to Handle `timeLimit`:**

   **`src/services/quizService.js`**

   ```javascript
   const createQuiz = async ({ courseId, questions, timeLimit, instructorId }) => {
     // Validate course ownership
     const course = await courseService.getCourseById(courseId);
     if (!course) {
       throw new CustomError('Course not found', 404);
     }

     if (course.instructorId !== instructorId && !['admin'].includes('admin')) {
       throw new CustomError('Not authorized to add quiz to this course', 403);
     }

     // Create quiz
     const quiz = await quizRepository.createQuiz({ courseId, questions, timeLimit });
     return quiz;
   };
   ```

5. **Handle Timed Quizzes on the Frontend:**

   Implement countdown timers and enforce time limits when users take quizzes. Notify users when time expires and automatically submit their answers.

---

#### 11. **Implement Comprehensive Testing**

Ensure the reliability and correctness of your backend by writing and running comprehensive tests.

**a. **Unit Tests**

Write unit tests for individual components like services and repositories.

**Example: Testing Course Service**

**`tests/unit/courseService.test.js`**

```javascript
// tests/unit/courseService.test.js

const courseService = require('../../src/services/courseService');
const courseRepository = require('../../src/repositories/courseRepository');
const { Course } = require('../../src/models');
const CustomError = require('../../src/utils/CustomError');

jest.mock('../../src/repositories/courseRepository');

describe('Course Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a course successfully', async () => {
    const courseData = {
      title: 'Test Course',
      description: 'Course Description',
      category: 'Testing',
      videos: ['video1.mp4'],
      materials: ['material1.pdf'],
      instructorId: 'instructor-uuid',
    };

    courseRepository.create.mockResolvedValue({ id: 'course-uuid', ...courseData });

    const course = await courseService.createCourse(courseData);
    expect(course).toHaveProperty('id', 'course-uuid');
    expect(course.title).toBe('Test Course');
    expect(courseRepository.create).toHaveBeenCalledWith(courseData);
  });

  it('should throw an error if course does not exist', async () => {
    courseService.getCourseById = jest.fn().mockResolvedValue(null);
    const courseData = {
      title: 'Test Course',
      description: 'Course Description',
      category: 'Testing',
      videos: ['video1.mp4'],
      materials: ['material1.pdf'],
      instructorId: 'instructor-uuid',
    };

    await expect(courseService.createCourse(courseData)).rejects.toThrow(CustomError);
  });

  // Add more tests as needed
});
```

**b. **Integration Tests**

Test the interaction between different modules, such as controllers and services.

**Example: Testing User Registration Endpoint**

**`tests/integration/userRegistration.test.js`**

```javascript
// tests/integration/userRegistration.test.js

const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/models');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('User Registration', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/v1/users/register')
      .send({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123',
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  it('should not register a user with existing email', async () => {
    // Attempt to register with the same email
    const res = await request(app)
      .post('/v1/users/register')
      .send({
        username: 'testuser2',
        email: 'testuser@example.com',
        password: 'password123',
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message', 'User already exists with this email');
  });

  // Add more tests as needed
});
```

**c. **End-to-End (E2E) Tests**

Simulate real user scenarios to test the entire application flow.

**Example: Using Cypress for E2E Testing**

1. **Install Cypress:**

   ```bash
   npm install --save-dev cypress
   ```

2. **Initialize Cypress:**

   ```bash
   npx cypress open
   ```

3. **Write E2E Tests:**

   **`cypress/integration/userFlow.spec.js`**

   ```javascript
   // cypress/integration/userFlow.spec.js

   describe('User Registration and Login', () => {
     it('should register and login a user', () => {
       // Register User
       cy.request('POST', 'https://api.educonnect.com/v1/users/register', {
         username: 'e2etestuser',
         email: 'e2etestuser@example.com',
         password: 'password123',
       }).then((response) => {
         expect(response.status).to.eq(201);
         expect(response.body.data).to.have.property('token');
         const token = response.body.data.token;

         // Login User
         cy.request('POST', 'https://api.educonnect.com/v1/users/login', {
           email: 'e2etestuser@example.com',
           password: 'password123',
         }).then((loginResponse) => {
           expect(loginResponse.status).to.eq(200);
           expect(loginResponse.body.data).to.have.property('token');
         });
       });
     });
   });
   ```

4. **Run Cypress Tests:**

   ```bash
   npx cypress run
   ```

---

#### 12. **Summary**

In **Step 4: Implement Core Functionality**, we've:

- **Set Up Express Middleware and Routing:** Organized the application structure for scalability and maintainability.
- **Developed User Authentication and Management:** Enabled secure user registration, login, profile management, and role-based access control.
- **Implemented Course Management:** Allowed instructors/admins to create, read, update, and delete courses.
- **Set Up Progress Tracking:** Enabled users to track their progress through courses, including completed modules and quiz scores.
- **Integrated Adaptive Learning Algorithms:** Adjusted learning paths based on user performance to enhance the learning experience.
- **Implemented Video Streaming Integration:** Facilitated seamless video content delivery using third-party platforms like AWS S3 and CloudFront.
- **Developed Quiz System:** Allowed creation and submission of quizzes with automatic grading and feedback.
- **Integrated Real-Time Features with WebSockets:** Enabled live notifications and real-time progress updates using Socket.io.
- **Enhanced Quiz System:** Added features like timed quizzes to improve the assessment process.
- **Implemented Comprehensive Testing:** Ensured backend reliability through unit, integration, and end-to-end testing.

---

### Next Steps

With the core functionalities implemented, the next phase is **Step 5: Authentication and Authorization**. In this step, we'll refine the authentication mechanisms, manage user roles and permissions, and ensure that only authorized users can access specific resources.

Feel free to let me know if you need further details on any of the implemented features or if you're ready to proceed to the next step!

====