### Step 5: Authentication and Authorization

In **Step 5: Authentication and Authorization**, we will enhance and secure the **EduConnect: Adaptive Learning Backend** by implementing robust authentication mechanisms and fine-grained authorization controls. This step ensures that only authenticated users can access the system and that they have appropriate permissions based on their roles. We will cover:

1. **Reviewing Existing Authentication Setup**
2. **Implementing Role-Based Access Control (RBAC)**
3. **Integrating OAuth2 for Social Logins**
4. **Adding Account Verification and Password Reset Functionality**
5. **Securing Token Management with Refresh Tokens**
6. **Enhancing Authorization Middleware**
7. **Adhering to Security Best Practices**
8. **Comprehensive Testing of Authentication and Authorization**

---

#### 1. **Reviewing Existing Authentication Setup**

Before making enhancements, it's crucial to understand the current authentication implementation. From **Step 4**, we've established:

- **User Registration and Login:** Users can register and log in, receiving JWT access and refresh tokens.
- **JWT-Based Authentication Middleware:** Protects routes by verifying JWT tokens.
- **Role-Based Access Control (RBAC):** Basic role checks (e.g., 'admin', 'instructor') to restrict access to certain endpoints.

**Objective:** Strengthen and expand these capabilities to ensure security, flexibility, and scalability.

---

#### 2. **Implementing Role-Based Access Control (RBAC)**

RBAC allows us to assign permissions to users based on their roles, ensuring that users can only perform actions permitted by their roles.

**a. **Define User Roles and Permissions**

First, clearly define the roles and their associated permissions.

**Example Roles:**

- **Student:** Access to courses, learning materials, submit quizzes.
- **Instructor:** Create and manage courses, quizzes, view student progress.
- **Admin:** Full access, including user management, system settings.

**b. **Update User Model to Support Roles**

Ensure the `User` model can handle multiple roles.

**`models/user.js`:**

```javascript
// models/user.js

// ... existing imports and code

User.init(
  {
    // ... existing fields
    roles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: ['student'],
      validate: {
        isValidRole(value) {
          const validRoles = ['student', 'instructor', 'admin'];
          value.forEach(role => {
            if (!validRoles.includes(role)) {
              throw new Error(`Invalid role: ${role}`);
            }
          });
        },
      },
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    paranoid: true, // From Step 3: Soft deletes
  }
);

// ... existing associations and exports
```

**c. **Create Authorization Middleware**

Develop middleware to check if a user has the required role(s) to access a route.

**`src/middleware/authorize.js`:**

```javascript
// src/middleware/authorize.js

const CustomError = require('../utils/CustomError');

/**
 * Middleware to authorize based on user roles.
 * @param {Array} roles - Array of roles permitted to access the route.
 */
const authorize = (roles = []) => {
  // roles param can be a single role string (e.g., 'admin') or an array of roles
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return next(new CustomError('Access denied: No roles found', 403));
    }

    const hasRole = req.user.roles.some(role => roles.includes(role));

    if (!hasRole) {
      return next(new CustomError('Access denied: Insufficient permissions', 403));
    }

    next();
  };
};

module.exports = authorize;
```

**d. **Apply Authorization Middleware to Routes**

Use the `authorize` middleware in routes to enforce role-based access.

**Example: Protecting Course Creation Route for Instructors and Admins**

**`src/routes/v1/courseRoutes.js`:**

```javascript
// src/routes/v1/courseRoutes.js

// ... existing imports

const authorize = require('../../middleware/authorize');

// Create Course
router.post(
  '/',
  authMiddleware,
  authorize(['admin', 'instructor']),
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

// ... other routes
```

**e. **Example: Protecting Admin-Only Routes**

**`src/routes/v1/adminRoutes.js`:**

```javascript
// src/routes/v1/adminRoutes.js

const express = require('express');
const router = express.Router();
const { getAllUsers, deleteUserById, updateUserRoles } = require('../../controllers/adminController');
const { param, body } = require('express-validator');
const validate = require('../../middleware/validate');
const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/authorize');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-specific operations
 */

// Get All Users
router.get(
  '/users',
  authMiddleware,
  authorize('admin'),
  getAllUsers
);

// Update User Roles
router.put(
  '/users/:userId/roles',
  authMiddleware,
  authorize('admin'),
  [
    param('userId').isUUID().withMessage('Valid userId is required'),
    body('roles').isArray().withMessage('Roles must be an array of valid role strings'),
    body('roles.*').isIn(['student', 'instructor', 'admin']).withMessage('Invalid role provided'),
  ],
  validate,
  updateUserRoles
);

// Delete User
router.delete(
  '/users/:userId',
  authMiddleware,
  authorize('admin'),
  [
    param('userId').isUUID().withMessage('Valid userId is required'),
  ],
  validate,
  deleteUserById
);

module.exports = router;
```

**f. **Admin Controller and Service**

Implement controllers and services to handle admin operations like managing users.

**`src/controllers/adminController.js`:**

```javascript
// src/controllers/adminController.js

const adminService = require('../services/adminService');
const CustomError = require('../utils/CustomError');

// Get All Users
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await adminService.getAllUsers();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// Update User Roles
exports.updateUserRoles = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;

    const updatedUser = await adminService.updateUserRoles(userId, roles);
    if (!updatedUser) {
      throw new CustomError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// Delete User by ID
exports.deleteUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const success = await adminService.deleteUserById(userId);
    if (!success) {
      throw new CustomError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

**`src/services/adminService.js`:**

```javascript
// src/services/adminService.js

const userRepository = require('../repositories/userRepository');

const getAllUsers = async () => {
  return await userRepository.findAllUsers();
};

const updateUserRoles = async (userId, roles) => {
  return await userRepository.updateRoles(userId, roles);
};

const deleteUserById = async (userId) => {
  return await userRepository.delete(userId);
};

module.exports = {
  getAllUsers,
  updateUserRoles,
  deleteUserById,
};
```

**`src/repositories/userRepository.js`:**

```javascript
// src/repositories/userRepository.js

const { User } = require('../models');

class UserRepository {
  // ... existing methods

  async findAllUsers() {
    return await User.findAll({
      attributes: ['id', 'username', 'email', 'roles', 'createdAt', 'updatedAt'],
    });
  }

  async updateRoles(userId, roles) {
    const user = await User.findByPk(userId);
    if (!user) return null;
    await user.update({ roles });
    return user;
  }
}

module.exports = new UserRepository();
```

**g. **Register Admin Routes**

Add admin routes to your application.

**`src/app.js`:**

```javascript
// src/app.js

// ... existing imports

const adminRoutes = require('./routes/v1/adminRoutes');
app.use('/v1/admin', adminRoutes);

// ... existing code
```

---

#### 3. **Integrating OAuth2 for Social Logins**

Enhance user experience by allowing users to log in using third-party providers like Google, Facebook, or GitHub. We'll use **Passport.js** to facilitate OAuth2 integration.

**a. **Install Necessary Packages**

```bash
npm install passport passport-google-oauth20 passport-facebook passport-github2
```

**b. **Configure Passport Strategies**

Set up Passport strategies for each provider.

**`src/config/passport.js`:**

```javascript
// src/config/passport.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const userService = require('../services/userService');
const CustomError = require('../utils/CustomError');

// Serialize and Deserialize User (Optional if using sessions)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userService.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/v1/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user information
        const email = profile.emails[0].value;
        const username = profile.displayName;

        // Check if user exists
        let user = await userService.findUserByEmail(email);
        if (!user) {
          // Create new user
          user = await userService.createUser({
            username,
            email,
            password: '', // No password since using OAuth
            roles: ['student'],
          });
        }

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Facebook OAuth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: '/v1/auth/facebook/callback',
      profileFields: ['id', 'displayName', 'emails'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const username = profile.displayName;

        let user = await userService.findUserByEmail(email);
        if (!user) {
          user = await userService.createUser({
            username,
            email,
            password: '',
            roles: ['student'],
          });
        }

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// GitHub OAuth Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/v1/auth/github/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const username = profile.username;

        let user = await userService.findUserByEmail(email);
        if (!user) {
          user = await userService.createUser({
            username,
            email,
            password: '',
            roles: ['student'],
          });
        }

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

module.exports = passport;
```

**c. **Set Up OAuth Routes**

Create routes to initiate and handle callbacks from OAuth providers.

**`src/routes/v1/oauthRoutes.js`:**

```javascript
// src/routes/v1/oauthRoutes.js

const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const jwt = require('jsonwebtoken');
const CustomError = require('../../utils/CustomError');

/**
 * @swagger
 * tags:
 *   name: OAuth
 *   description: OAuth authentication routes
 */

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, issue JWT
    const token = jwt.sign(
      { id: req.user.id, roles: req.user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { id: req.user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect or respond with tokens
    res.status(200).json({
      success: true,
      data: {
        token,
        refreshToken,
      },
    });
  }
);

// Facebook OAuth
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, roles: req.user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { id: req.user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        refreshToken,
      },
    });
  }
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, roles: req.user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { id: req.user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        refreshToken,
      },
    });
  }
);

module.exports = router;
```

**d. **Register OAuth Routes**

Add OAuth routes to your application.

**`src/app.js`:**

```javascript
// src/app.js

// ... existing imports

const oauthRoutes = require('./routes/v1/oauthRoutes');
app.use('/v1/auth', oauthRoutes);

// ... existing code
```

**e. **Update Application Entry Point for Passport**

Initialize Passport in your application.

**`src/index.js`:**

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
const passport = require('./config/passport'); // Import Passport configuration

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);

// Initialize Passport
app.use(passport.initialize());

// ... existing WebSocket setup

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

**f. **Configure Environment Variables**

Add OAuth credentials to your `.env` file.

**`.env`:**

```env
# OAuth Credentials

# Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**g. **Secure OAuth Routes**

Ensure that OAuth callbacks and tokens are securely handled. Use HTTPS in production to encrypt data in transit.

---

#### 4. **Adding Account Verification and Password Reset Functionality**

Enhance security and user trust by implementing account verification (email confirmation) and password reset mechanisms.

**a. **Account Verification (Email Confirmation)**

**i. **Modify User Model**

Add `isVerified` and `verificationToken` fields to the `User` model.

**`models/user.js`:**

```javascript
// models/user.js

// ... existing imports and code

User.init(
  {
    // ... existing fields
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    paranoid: true,
  }
);

// ... existing associations and exports
```

**ii. **Create Migration for New Fields**

```bash
npx sequelize-cli migration:generate --name add-verification-fields-to-users
```

**`migrations/XXXXXX-add-verification-fields-to-users.js`:**

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'isVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('Users', 'verificationToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'verificationToken');
    await queryInterface.removeColumn('Users', 'isVerified');
  }
};
```

**Run Migration:**

```bash
npx sequelize-cli db:migrate
```

**iii. **Send Verification Email Upon Registration**

Use a library like **Nodemailer** to send verification emails.

**Install Nodemailer:**

```bash
npm install nodemailer
```

**Create Email Service:**

**`src/services/emailService.js`:**

```javascript
// src/services/emailService.js

const nodemailer = require('nodemailer');
const CustomError = require('../utils/CustomError');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // e.g., smtp.gmail.com
  port: process.env.EMAIL_PORT, // e.g., 587
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"EduConnect Support" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Verify Your EduConnect Account',
    html: `
      <p>Hello ${user.username},</p>
      <p>Thank you for registering at EduConnect. Please verify your email by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>If you did not register, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new CustomError('Failed to send verification email', 500);
  }
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"EduConnect Support" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Reset Your EduConnect Password',
    html: `
      <p>Hello ${user.username},</p>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new CustomError('Failed to send password reset email', 500);
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
```

**iv. **Update Registration Controller to Send Verification Email**

**`src/controllers/userController.js`:**

```javascript
// src/controllers/userController.js

const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');

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

    // Generate verification token
    const verificationToken = uuidv4();

    // Create user
    const user = await userService.createUser({
      username,
      email,
      password: hashedPassword,
      roles: ['student'],
      verificationToken,
    });

    // Send verification email
    await emailService.sendVerificationEmail(user, verificationToken);

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
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
```

**v. **Create Verification Endpoint**

Allow users to verify their email addresses.

**`src/routes/v1/userRoutes.js`:**

```javascript
// src/routes/v1/userRoutes.js

// ... existing imports and routes

const { verifyEmail } = require('../../controllers/userController');

// Email Verification
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      throw new CustomError('Verification token is missing', 400);
    }

    // Verify token
    const user = await userService.findUserByVerificationToken(token);
    if (!user) {
      throw new CustomError('Invalid or expired verification token', 400);
    }

    // Update user verification status
    await userService.verifyUser(user.id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
});
```

**`src/controllers/userController.js`:**

```javascript
// src/controllers/userController.js

// ... existing imports and code

// Verify Email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      throw new CustomError('Verification token is missing', 400);
    }

    // Find user by verification token
    const user = await userService.findUserByVerificationToken(token);
    if (!user) {
      throw new CustomError('Invalid or expired verification token', 400);
    }

    // Update user verification status
    await userService.verifyUser(user.id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

// ... existing code
```

**`src/services/userService.js`:**

```javascript
// src/services/userService.js

// ... existing imports and code

const findUserByVerificationToken = async (token) => {
  return await userRepository.findByVerificationToken(token);
};

const verifyUser = async (userId) => {
  return await userRepository.verifyUser(userId);
};

module.exports = {
  // ... existing exports
  findUserByVerificationToken,
  verifyUser,
};
```

**`src/repositories/userRepository.js`:**

```javascript
// src/repositories/userRepository.js

// ... existing imports and code

async findByVerificationToken(token) {
  return await User.findOne({ where: { verificationToken: token } });
}

async verifyUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;
  await user.update({ isVerified: true, verificationToken: null });
  return user;
}

module.exports = new UserRepository();
```

**b. **Password Reset Functionality**

Allow users to reset their passwords if they forget them.

**i. **Add Reset Token Fields to User Model

Add `resetPasswordToken` and `resetPasswordExpires` fields to the `User` model.

**`models/user.js`:**

```javascript
// models/user.js

// ... existing imports and code

User.init(
  {
    // ... existing fields
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    paranoid: true,
  }
);

// ... existing associations and exports
```

**ii. **Create Migration for Reset Fields**

```bash
npx sequelize-cli migration:generate --name add-reset-fields-to-users
```

**`migrations/XXXXXX-add-reset-fields-to-users.js`:**

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'resetPasswordToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Users', 'resetPasswordExpires', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'resetPasswordExpires');
    await queryInterface.removeColumn('Users', 'resetPasswordToken');
  }
};
```

**Run Migration:**

```bash
npx sequelize-cli db:migrate
```

**iii. **Create Password Reset Endpoints**

**`src/routes/v1/userRoutes.js`:**

```javascript
// src/routes/v1/userRoutes.js

// ... existing imports and routes

const { requestPasswordReset, resetPassword } = require('../../controllers/userController');

// Request Password Reset
router.post(
  '/request-password-reset',
  [
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  validate,
  requestPasswordReset
);

// Reset Password
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  validate,
  resetPassword
);

module.exports = router;
```

**`src/controllers/userController.js`:**

```javascript
// src/controllers/userController.js

const crypto = require('crypto');
const emailService = require('../services/emailService');

// Request Password Reset
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await userService.findUserByEmail(email);
    if (!user) {
      throw new CustomError('User with this email does not exist', 404);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Update user with reset token
    await userService.updateResetToken(user.id, resetTokenHash, resetTokenExpiry);

    // Send password reset email
    await emailService.sendPasswordResetEmail(user, resetToken);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Hash the provided token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by reset token and check expiry
    const user = await userService.findUserByResetToken(hashedToken, Date.now());
    if (!user) {
      throw new CustomError('Invalid or expired reset token', 400);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and remove reset token
    await userService.resetUserPassword(user.id, hashedPassword);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

**`src/services/userService.js`:**

```javascript
// src/services/userService.js

// ... existing imports and code

const updateResetToken = async (userId, token, expires) => {
  const user = await userRepository.findById(userId);
  if (!user) return null;
  await user.update({
    resetPasswordToken: token,
    resetPasswordExpires: expires,
  });
  return user;
};

const findUserByResetToken = async (token, currentTime) => {
  return await userRepository.findByResetToken(token, currentTime);
};

const resetUserPassword = async (userId, newPassword) => {
  const user = await userRepository.findById(userId);
  if (!user) return null;
  await user.update({
    password: newPassword,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });
  return user;
};

module.exports = {
  // ... existing exports
  updateResetToken,
  findUserByResetToken,
  resetUserPassword,
};
```

**`src/repositories/userRepository.js`:**

```javascript
// src/repositories/userRepository.js

// ... existing imports and code

async findByResetToken(token, currentTime) {
  return await User.findOne({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: { [Op.gt]: currentTime },
    },
  });
}

async updateResetToken(userId, token, expires) {
  const user = await User.findByPk(userId);
  if (!user) return null;
  await user.update({
    resetPasswordToken: token,
    resetPasswordExpires: expires,
  });
  return user;
}

async resetUserPassword(userId, newPassword) {
  const user = await User.findByPk(userId);
  if (!user) return null;
  await user.update({
    password: newPassword,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });
  return user;
}

module.exports = new UserRepository();
```

**iv. **Update Password Reset Email Template**

Ensure that the password reset email contains a secure link with the reset token.

**`src/services/emailService.js`:**

```javascript
// src/services/emailService.js

// ... existing code

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"EduConnect Support" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Reset Your EduConnect Password',
    html: `
      <p>Hello ${user.username},</p>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new CustomError('Failed to send password reset email', 500);
  }
};
```

---

#### 5. **Securing Token Management with Refresh Tokens**

Proper management of JWT access and refresh tokens is essential for maintaining security and user experience.

**a. **Store Refresh Tokens Securely**

Rather than sending refresh tokens to the client and storing them in the database, use a secure storage mechanism like **Redis**. This allows for easy invalidation and scalability.

**b. **Update Token Generation to Include Refresh Token Storage**

**`src/controllers/userController.js`:**

```javascript
// src/controllers/userController.js

const { redisClient } = require('../../config/redis');

// ... existing code

// Generate and Store Refresh Token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// After generating refresh token
// Store refresh token in Redis with user ID as key
await redisClient.set(`refresh_token_${user.id}`, refreshToken, {
  EX: 7 * 24 * 60 * 60, // 7 days in seconds
});
```

**c. **Modify Refresh Token Endpoint to Validate Against Redis**

Ensure that refresh tokens are valid and haven't been revoked.

**`src/controllers/userController.js`:**

```javascript
// src/controllers/userController.js

// Refresh Token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new CustomError('Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userId = decoded.id;

    // Check if refresh token exists in Redis
    const storedRefreshToken = await redisClient.get(`refresh_token_${userId}`);
    if (storedRefreshToken !== refreshToken) {
      throw new CustomError('Invalid refresh token', 401);
    }

    // Generate new access token
    const user = await userService.findUserById(userId);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

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
    next(new CustomError('Invalid refresh token', 401));
  }
};
```

**d. **Invalidate Refresh Tokens on Logout**

Ensure that refresh tokens are invalidated when users log out.

**Add Logout Endpoint:**

**`src/routes/v1/userRoutes.js`:**

```javascript
// src/routes/v1/userRoutes.js

// ... existing imports and routes

const { logout } = require('../../controllers/userController');

// Logout User
router.post('/logout', authMiddleware, logout);

module.exports = router;
```

**`src/controllers/userController.js`:**

```javascript
// src/controllers/userController.js

// Logout User
exports.logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const refreshTokenKey = `refresh_token_${userId}`;

    // Delete refresh token from Redis
    await redisClient.del(refreshTokenKey);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

---

#### 6. **Enhancing Authorization Middleware**

Ensure that authorization checks are thorough and cover all necessary scenarios.

**a. **Implement Ownership Checks**

For certain resources, users should only access or modify their own data.

**Example: Ensuring Users Can Only Access Their Own Profiles**

**`src/routes/v1/userRoutes.js`:**

```javascript
// src/routes/v1/userRoutes.js

// ... existing imports and routes

const { getOwnProfile } = require('../../controllers/userController');

// Get Own Profile
router.get('/me', authMiddleware, getOwnProfile);

module.exports = router;
```

**`src/controllers/userController.js`:**

```javascript
// src/controllers/userController.js

// Get Own Profile
exports.getOwnProfile = async (req, res, next) => {
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
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

**b. **Restrict Access to Admin Routes**

Ensure that only admins can access sensitive routes.

**`src/routes/v1/adminRoutes.js`:**

```javascript
// src/routes/v1/adminRoutes.js

// ... existing code

// Apply 'admin' role authorization
router.use(authorize('admin'));

// Admin-specific routes
// For example, user management routes

module.exports = router;
```

**c. **Implement Resource-Based Authorization**

For resources like courses, ensure that only owners (e.g., instructors) or admins can modify them.

**Example: Ensuring Only Course Instructors or Admins Can Update/Delete Courses**

Already partially implemented in **Step 4**, but reinforce as needed.

**`src/controllers/courseController.js`:**

```javascript
// src/controllers/courseController.js

exports.updateCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const updates = req.body;

    // Fetch course
    const course = await courseService.getCourseById(courseId);
    if (!course) {
      throw new CustomError('Course not found', 404);
    }

    // Check ownership or admin role
    if (req.user.roles.includes('admin') || course.instructorId === req.user.id) {
      const updatedCourse = await courseService.updateCourse(courseId, updates);
      res.status(200).json({
        success: true,
        data: updatedCourse,
      });
    } else {
      throw new CustomError('Access denied: Not authorized to update this course', 403);
    }
  } catch (error) {
    next(error);
  }
};
```

---

#### 7. **Adhering to Security Best Practices**

Implement industry-standard security measures to protect user data and system integrity.

**a. **Secure Password Storage**

- **Hash Passwords:** Already implemented using bcrypt.
- **Use Strong Salt Rounds:** Use at least 10 salt rounds to hash passwords.

**b. **Use HTTPS**

- Ensure that all communications between clients and the server are encrypted using HTTPS.
- In development, use tools like **mkcert** to create local SSL certificates.
- In production, obtain certificates from a trusted Certificate Authority (e.g., Let's Encrypt).

**c. **Implement Content Security Policy (CSP)**

Use **Helmet.js** to set security-related HTTP headers.

**`src/app.js`:**

```javascript
// src/app.js

const helmet = require('helmet');
app.use(helmet());

// Customize CSP as needed
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'trusted.cdn.com'],
      styleSrc: ["'self'", 'trusted.cdn.com'],
      imgSrc: ["'self'", 'data:', 'trusted.cdn.com'],
      connectSrc: ["'self'", 'api.educonnect.com', 'socket.io'],
      // Add more directives as needed
    },
  })
);
```

**d. **Prevent Cross-Site Scripting (XSS) and SQL Injection**

- **Input Validation and Sanitization:** Already implemented using **express-validator**.
- **ORM Usage:** Using Sequelize and Mongoose helps prevent SQL injection as they handle parameterization.

**e. **Rate Limiting**

Already implemented in **Step 2** using **express-rate-limit** to prevent brute-force attacks.

**f. **Secure Cookies (If Using Sessions)**

If implementing sessions, ensure cookies are secure.

**Example:**

```javascript
// src/app.js

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);
```

**g. **Implement CORS Properly**

Already configured in **Step 2**. Ensure that only trusted origins can access the API.

**h. **Enable HTTP Strict Transport Security (HSTS)**

Enforce the use of HTTPS.

**`src/app.js`:**

```javascript
// src/app.js

app.use(
  helmet.hsts({
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  })
);
```

**i. **Limit Payload Size**

Prevent denial-of-service (DoS) attacks by limiting request payload sizes.

**`src/app.js`:**

```javascript
// src/app.js

app.use(express.json({ limit: '10kb' })); // Limit JSON payloads to 10KB
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
```

---

#### 8. **Comprehensive Testing of Authentication and Authorization**

Ensure that authentication and authorization mechanisms work as intended through thorough testing.

**a. **Unit Tests for Authorization Middleware**

**`tests/unit/authorizeMiddleware.test.js`:**

```javascript
// tests/unit/authorizeMiddleware.test.js

const authorize = require('../../src/middleware/authorize');
const CustomError = require('../../src/utils/CustomError');

describe('Authorization Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { roles: ['student'] } };
    res = {};
    next = jest.fn();
  });

  it('should allow access if user has required role', () => {
    const middleware = authorize(['student']);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should deny access if user lacks required role', () => {
    const middleware = authorize(['admin']);
    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(CustomError));
    const error = next.mock.calls[0][0];
    expect(error.message).toBe('Access denied: Insufficient permissions');
    expect(error.status).toBe(403);
  });

  it('should allow access if user has one of the required roles', () => {
    req.user.roles = ['instructor'];
    const middleware = authorize(['admin', 'instructor']);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should handle single string role input', () => {
    const middleware = authorize('student');
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
```

**b. **Integration Tests for Protected Routes**

**Example: Testing Protected Admin Route**

**`tests/integration/adminRoutes.test.js`:**

```javascript
// tests/integration/adminRoutes.test.js

const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User } = require('../../src/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let adminToken;
let userToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Create admin user
  const adminPassword = await bcrypt.hash('adminpass', 10);
  const admin = await User.create({
    username: 'adminuser',
    email: 'admin@example.com',
    password: adminPassword,
    roles: ['admin'],
    isVerified: true,
  });

  // Create regular user
  const userPassword = await bcrypt.hash('userpass', 10);
  const user = await User.create({
    username: 'regularuser',
    email: 'user@example.com',
    password: userPassword,
    roles: ['student'],
    isVerified: true,
  });

  // Generate tokens
  adminToken = jwt.sign(
    { id: admin.id, roles: admin.roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  userToken = jwt.sign(
    { id: user.id, roles: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('Admin Routes', () => {
  it('should allow admin to get all users', async () => {
    const res = await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  it('should deny access to regular users', async () => {
    const res = await request(app)
      .get('/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Access denied: Insufficient permissions');
  });

  it('should allow admin to update user roles', async () => {
    const user = await User.findOne({ where: { email: 'user@example.com' } });
    const res = await request(app)
      .put(`/v1/admin/users/${user.id}/roles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roles: ['instructor'] });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roles).toContain('instructor');
  });

  it('should allow admin to delete a user', async () => {
    const user = await User.findOne({ where: { email: 'user@example.com' } });
    const res = await request(app)
      .delete(`/v1/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('User deleted successfully');
  });
});
```

**c. **Test OAuth Flows**

Testing OAuth flows can be complex due to external dependencies. Consider using tools like **nock** to mock external HTTP requests.

**Example: Mocking Google OAuth Callback**

**`tests/unit/googleOAuth.test.js`:**

```javascript
// tests/unit/googleOAuth.test.js

const passport = require('../../src/config/passport');
const request = require('supertest');
const app = require('../../src/app');
const nock = require('nock');
const { sequelize, User } = require('../../src/models');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Google OAuth', () => {
  it('should register and login user via Google OAuth', async () => {
    // Mock Google OAuth response
    nock('https://accounts.google.com')
      .post('/o/oauth2/token')
      .reply(200, {
        access_token: 'fake_access_token',
        id_token: 'fake_id_token',
      });

    nock('https://www.googleapis.com')
      .get('/oauth2/v3/userinfo')
      .reply(200, {
        sub: '1234567890',
        email: 'googleuser@example.com',
        email_verified: true,
        name: 'Google User',
        picture: 'https://example.com/avatar.jpg',
      });

    // Simulate OAuth callback
    const res = await request(app)
      .get('/v1/auth/google/callback?code=valid_code')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('refreshToken');

    // Verify user in database
    const user = await User.findOne({ where: { email: 'googleuser@example.com' } });
    expect(user).not.toBeNull();
    expect(user.username).toBe('Google User');
    expect(user.roles).toContain('student');
    expect(user.isVerified).toBe(true);
  });
});
```

**Note:** OAuth testing often requires integration testing environments or using service-specific testing tools. The above example uses **nock** to mock external requests but may need adjustments based on the OAuth provider's specifics.

---

#### 9. **Implement Multi-Factor Authentication (Optional)**

For enhanced security, consider adding Multi-Factor Authentication (MFA). This can be achieved using Time-based One-Time Passwords (TOTP) with apps like Google Authenticator.

**a. **Install Necessary Packages**

```bash
npm install speakeasy qrcode
```

**b. **Add MFA Fields to User Model**

Add `mfaEnabled` and `mfaSecret` fields to the `User` model.

**`models/user.js`:**

```javascript
// models/user.js

// ... existing imports and code

User.init(
  {
    // ... existing fields
    mfaEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    mfaSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    paranoid: true,
  }
);

// ... existing associations and exports
```

**c. **Create Migration for MFA Fields**

```bash
npx sequelize-cli migration:generate --name add-mfa-fields-to-users
```

**`migrations/XXXXXX-add-mfa-fields-to-users.js`:**

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'mfaEnabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('Users', 'mfaSecret', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'mfaSecret');
    await queryInterface.removeColumn('Users', 'mfaEnabled');
  }
};
```

**Run Migration:**

```bash
npx sequelize-cli db:migrate
```

**d. **MFA Setup Controller**

Allow users to enable MFA by generating a secret and QR code.

**`src/controllers/mfaController.js`:**

```javascript
// src/controllers/mfaController.js

const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const userService = require('../services/userService');
const CustomError = require('../utils/CustomError');

// Enable MFA - Generate Secret and QR Code
exports.enableMFA = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `EduConnect (${req.user.email})`,
    });

    // Save secret to user
    await userService.updateMFASecret(userId, secret.base32);

    // Generate QR code
    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode: qrCodeDataURL,
      },
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    next(error);
  }
};

// Verify MFA Token and Enable MFA
exports.verifyMFA = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    const user = await userService.findUserById(userId);
    if (!user || !user.mfaSecret) {
      throw new CustomError('MFA not set up', 400);
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw new CustomError('Invalid MFA token', 400);
    }

    // Enable MFA
    await userService.enableMFA(userId);

    res.status(200).json({
      success: true,
      message: 'MFA enabled successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Disable MFA
exports.disableMFA = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    const user = await userService.findUserById(userId);
    if (!user || !user.mfaSecret || !user.mfaEnabled) {
      throw new CustomError('MFA not enabled', 400);
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw new CustomError('Invalid MFA token', 400);
    }

    // Disable MFA
    await userService.disableMFA(userId);

    res.status(200).json({
      success: true,
      message: 'MFA disabled successfully',
    });
  } catch (error) {
    next(error);
  }
};
```

**e. **MFA Service**

**`src/services/userService.js`:**

```javascript
// src/services/userService.js

// ... existing imports and code

const updateMFASecret = async (userId, secret) => {
  const user = await userRepository.findById(userId);
  if (!user) return null;
  await user.update({ mfaSecret: secret });
  return user;
};

const enableMFA = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) return null;
  await user.update({ mfaEnabled: true });
  return user;
};

const disableMFA = async (userId) => {
  const user = await userRepository.findById(userId);
  if (!user) return null;
  await user.update({ mfaEnabled: false, mfaSecret: null });
  return user;
};

module.exports = {
  // ... existing exports
  updateMFASecret,
  enableMFA,
  disableMFA,
};
```

**f. **MFA Repository**

**`src/repositories/userRepository.js`:**

```javascript
// src/repositories/userRepository.js

// ... existing imports and code

module.exports = new UserRepository();
```

**g. **Add MFA Verification During Login**

Modify the login process to require MFA if enabled.

**`src/controllers/userController.js`:**

```javascript
// src/controllers/userController.js

// Modify Login User
exports.login = async (req, res, next) => {
  try {
    const { email, password, mfaToken } = req.body;

    // Find user
    const user = await userService.findUserByEmail(email);
    if (!user) {
      throw new CustomError('Invalid email or password', 401);
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new CustomError('Please verify your email before logging in', 403);
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new CustomError('Invalid email or password', 401);
    }

    // If MFA is enabled, verify token
    if (user.mfaEnabled) {
      if (!mfaToken) {
        throw new CustomError('MFA token is required', 401);
      }

      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaToken,
      });

      if (!verified) {
        throw new CustomError('Invalid MFA token', 401);
      }
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in Redis
    await redisClient.set(`refresh_token_${user.id}`, refreshToken, {
      EX: 7 * 24 * 60 * 60, // 7 days
    });

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
```

**h. **Update Login Validation**

Ensure that the login endpoint can handle optional MFA tokens.

**`src/routes/v1/userRoutes.js`:**

```javascript
// src/routes/v1/userRoutes.js

// ... existing imports and routes

// Login User with optional MFA token
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('mfaToken').optional().isNumeric().withMessage('MFA token must be numeric'),
  ],
  validate,
  login
);

// ... existing code
```

---

#### 10. **Summary**

In **Step 5: Authentication and Authorization**, we've significantly strengthened the security and control mechanisms of the **EduConnect** backend by:

- **Implementing Robust RBAC:** Defined clear roles and enforced permissions through middleware.
- **Integrating OAuth2:** Enabled users to log in via Google, Facebook, and GitHub using Passport.js strategies.
- **Adding Account Verification:** Ensured users verify their email addresses before accessing the system.
- **Implementing Password Reset:** Allowed users to securely reset their passwords through email links.
- **Securing Token Management:** Stored refresh tokens securely in Redis and enforced token validation.
- **Enhancing Authorization Middleware:** Implemented ownership and role-based checks for resource access.
- **Adhering to Security Best Practices:** Applied industry-standard security measures, including secure password storage, HTTPS enforcement, input validation, and rate limiting.
- **Conducting Comprehensive Testing:** Ensured all authentication and authorization flows work correctly through unit and integration tests.
- **Optional MFA Integration:** Provided the groundwork for adding Multi-Factor Authentication to bolster security further.

---

### **Next Steps**

With authentication and authorization robustly implemented, the next phase is **Step 6: Implement Adaptive Learning Algorithms**. In this step, we'll develop and integrate algorithms that tailor the learning experience based on user performance and progress, enhancing the personalized learning journey for each user.

Feel free to ask any questions or request further assistance regarding **Step 5: Authentication and Authorization**!

===