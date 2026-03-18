### Step 3: Database Integration

In **Step 3**, we'll set up the database solutions for **EduConnect: Adaptive Learning Backend** based on your **database_strategy**. This involves integrating **PostgreSQL** for relational data (users, courses, quizzes) and **MongoDB** for unstructured data (learning materials, user progress). We'll configure connections, set up ORMs/ODMs, and define schemas/models to interact with the databases effectively.

---

#### 1. **Choose and Configure Database Solutions**

Given your project requirements, we'll use:

- **PostgreSQL** for relational data:
  - **Data Models:** Users, Courses, Quizzes
  - **ORM:** **Sequelize** (a promise-based Node.js ORM for PostgreSQL)
  
- **MongoDB** for unstructured data:
  - **Data Models:** Learning Materials, User Progress
  - **ODM:** **Mongoose** (an elegant MongoDB object modeling tool)

**Why These Choices?**

- **Sequelize:** Provides a robust ORM with support for migrations, associations, and easy query building for PostgreSQL.
- **Mongoose:** Offers a straightforward ODM with schema validation, middleware, and seamless integration with MongoDB.

---

#### 2. **Install Necessary Dependencies**

Navigate to your project directory and install the required packages:

```bash
# PostgreSQL and Sequelize
npm install sequelize pg pg-hstore

# Sequelize CLI for migrations and model generation
npm install --save-dev sequelize-cli

# MongoDB and Mongoose
npm install mongoose
```

**Explanation of Packages:**

- `sequelize`: The core Sequelize library.
- `pg`: PostgreSQL client for Node.js.
- `pg-hstore`: A module for serializing and deserializing JSON data into the hstore format used by PostgreSQL.
- `sequelize-cli`: Command-line interface for Sequelize, useful for migrations and model management.
- `mongoose`: ODM for MongoDB.

---

#### 3. **Configure PostgreSQL with Sequelize**

##### a. **Initialize Sequelize**

Initialize Sequelize in your project to set up the necessary configuration files.

```bash
npx sequelize-cli init
```

This command creates the following folders:

```
config/
  └── config.json
models/
migrations/
seeders/
```

##### b. **Update Sequelize Configuration**

Modify the `config/config.json` file to include your PostgreSQL database credentials. It's recommended to use environment variables for sensitive information.

**Example `config/config.json`:**

```json
{
  "development": {
    "username": "your_pg_username",
    "password": "your_pg_password",
    "database": "educonnect_dev",
    "host": "127.0.0.1",
    "dialect": "postgres"
  },
  "test": {
    "username": "your_pg_username",
    "password": "your_pg_password",
    "database": "educonnect_test",
    "host": "127.0.0.1",
    "dialect": "postgres"
  },
  "production": {
    "username": "your_pg_username",
    "password": "your_pg_password",
    "database": "educonnect_prod",
    "host": "127.0.0.1",
    "dialect": "postgres"
  }
}
```

**Using Environment Variables:**

To enhance security, replace hardcoded credentials with environment variables. Install the `dotenv` package if not already installed.

```bash
npm install dotenv
```

**Update `config/config.js`:**

Rename `config/config.json` to `config/config.js` and modify it to use environment variables.

```javascript
// config/config.js

require('dotenv').config(); // Load environment variables

module.exports = {
  development: {
    username: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE_DEV,
    host: process.env.PG_HOST,
    dialect: 'postgres'
  },
  test: {
    username: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE_TEST,
    host: process.env.PG_HOST,
    dialect: 'postgres'
  },
  production: {
    username: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE_PROD,
    host: process.env.PG_HOST,
    dialect: 'postgres'
  }
};
```

**Update Environment Variables in `.env`:**

```env
# PostgreSQL Configuration
PG_USERNAME=your_pg_username
PG_PASSWORD=your_pg_password
PG_DATABASE_DEV=educonnect_dev
PG_DATABASE_TEST=educonnect_test
PG_DATABASE_PROD=educonnect_prod
PG_HOST=127.0.0.1
```

##### c. **Define Sequelize Models**

Create models for **User**, **Course**, and **Quiz**.

**Example: User Model**

```bash
npx sequelize-cli model:generate --name User --attributes username:string,email:string,password:string,roles:array
```

This command generates a model and a migration file for the `User` model. Modify the generated files as needed.

**`models/user.js`:**

```javascript
// models/user.js

'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Define associations here
      User.hasMany(models.Course, { foreignKey: 'instructorId', as: 'courses' });
      User.hasMany(models.Progress, { foreignKey: 'userId', as: 'progresses' });
      // Add more associations as needed
    }
  }
  User.init(
    {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      roles: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: ['student']
      }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      timestamps: true
    }
  );
  return User;
};
```

**Example: Course Model**

```bash
npx sequelize-cli model:generate --name Course --attributes title:string,description:text,category:string,instructorId:uuid
```

**`models/course.js`:**

```javascript
// models/course.js

'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      // Define associations here
      Course.belongsTo(models.User, { foreignKey: 'instructorId', as: 'instructor' });
      Course.hasMany(models.Quiz, { foreignKey: 'courseId', as: 'quizzes' });
      // Add more associations as needed
    }
  }
  Course.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false
      },
      instructorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      }
    },
    {
      sequelize,
      modelName: 'Course',
      tableName: 'Courses',
      timestamps: true
    }
  );
  return Course;
};
```

**Example: Quiz Model**

```bash
npx sequelize-cli model:generate --name Quiz --attributes title:string,courseId:uuid,questions:jsonb
```

**`models/quiz.js`:**

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

**Run Migrations:**

After defining the models, run the migrations to create the corresponding tables in PostgreSQL.

```bash
npx sequelize-cli db:create
npx sequelize-cli db:migrate
```

**Notes:**

- Ensure that PostgreSQL is running and accessible with the provided credentials.
- You can create seeders if you need to populate the database with initial data.

---

#### 4. **Configure MongoDB with Mongoose**

##### a. **Set Up MongoDB Connection**

Create a configuration file for MongoDB connection using Mongoose.

**Create `config/mongoose.js`:**

```javascript
// config/mongoose.js

const mongoose = require('mongoose');
const logger = require('../src/utils/logger'); // Assuming you have a logger utility

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useFindAndModify: false, // Deprecated in Mongoose 6
      // useCreateIndex: true     // Deprecated in Mongoose 6
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
```

**Update `.env` with MongoDB URI:**

```env
# MongoDB Configuration
MONGO_URI=mongodb://username:password@localhost:27017/educonnect
```

##### b. **Define Mongoose Schemas and Models**

Create schemas for **Learning Materials** and **User Progress**.

**Example: Learning Material Schema**

```javascript
// models/mongoose/LearningMaterial.js

const mongoose = require('mongoose');

const LearningMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    content: {
      type: String, // Could also be rich text or markdown
      required: true
    },
    courseId: {
      type: String, // Reference to Course ID in PostgreSQL
      required: true
    },
    resourceType: {
      type: String,
      enum: ['video', 'document', 'image', 'other'],
      default: 'other'
    },
    url: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LearningMaterial', LearningMaterialSchema);
```

**Example: User Progress Schema**

```javascript
// models/mongoose/UserProgress.js

const mongoose = require('mongoose');

const UserProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Reference to User ID in PostgreSQL
      required: true
    },
    courseId: {
      type: String, // Reference to Course ID in PostgreSQL
      required: true
    },
    completedModules: {
      type: [String],
      default: []
    },
    quizScores: {
      type: Map,
      of: Number, // Map of quizId to score
      default: {}
    },
    adaptiveData: {
      // Data used by adaptive learning algorithms
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProgress', UserProgressSchema);
```

##### c. **Connect to MongoDB in the Application Entry Point**

Modify your `src/index.js` to connect to both PostgreSQL and MongoDB during startup.

**`src/index.js`:**

```javascript
// src/index.js

require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.createServer(app);

// PostgreSQL Connection
const { sequelize } = require('./models'); // Sequelize instance

// MongoDB Connection
const connectDB = require('../config/mongoose');

// Middleware Setup
app.use(express.json());

// Import Routes
const userRoutes = require('./routes/v1/userRoutes');
// ... import other routes

// Use Routes
app.use('/v1/users', userRoutes);
// ... use other routes

// API Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

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
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Connect to Databases and Start Server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully.');

    // Connect to MongoDB
    await connectDB();

    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

startServer();
```

**Explanation:**

- **Sequelize Connection:** Uses the `sequelize.authenticate()` method to verify the connection to PostgreSQL.
- **Mongoose Connection:** Invokes the `connectDB` function to establish a connection to MongoDB.
- **Error Handling:** If either connection fails, the server exits to prevent running without a database connection.

---

#### 5. **Define Relationships and Associations**

Properly defining relationships ensures data integrity and simplifies data retrieval.

##### a. **PostgreSQL Associations with Sequelize**

**User and Course Relationship:**

- **One-to-Many:** A **User** (instructor) can create multiple **Courses**.

**`models/user.js`:**

```javascript
// models/user.js

// ... existing code

static associate(models) {
  // One-to-Many: User -> Courses
  User.hasMany(models.Course, { foreignKey: 'instructorId', as: 'courses' });
  
  // Additional associations
  User.hasMany(models.Progress, { foreignKey: 'userId', as: 'progresses' });
}
```

**Course and Quiz Relationship:**

- **One-to-Many:** A **Course** can have multiple **Quizzes**.

**`models/course.js`:**

```javascript
// models/course.js

// ... existing code

static associate(models) {
  // Belongs to User
  Course.belongsTo(models.User, { foreignKey: 'instructorId', as: 'instructor' });
  
  // One-to-Many: Course -> Quizzes
  Course.hasMany(models.Quiz, { foreignKey: 'courseId', as: 'quizzes' });
}
```

**Quiz Association:**

- **Belongs to Course**

**`models/quiz.js`:**

```javascript
// models/quiz.js

// ... existing code

static associate(models) {
  // Belongs to Course
  Quiz.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
}
```

##### b. **MongoDB References**

Since MongoDB is used for unstructured data, references to PostgreSQL entities (like `courseId` and `userId`) are maintained as simple string fields. This denormalized approach is suitable for unstructured data and allows for flexibility.

---

#### 6. **Implement Repository or Service Layers**

To maintain a clean separation of concerns and facilitate easier testing and maintenance, implement repository or service layers that handle database interactions.

**Example: User Service for PostgreSQL**

```javascript
// src/services/userService.js

const { User } = require('../models');

const createUser = async (userData) => {
  return await User.create(userData);
};

const findUserByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const findUserById = async (id) => {
  return await User.findByPk(id, {
    include: [{ model: Course, as: 'courses' }]
  });
};

// Add more user-related database operations as needed

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  // ... other exports
};
```

**Example: Learning Material Service for MongoDB**

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

// Add more learning material-related database operations as needed

module.exports = {
  createLearningMaterial,
  getMaterialsByCourseId,
  // ... other exports
};
```

**Benefits:**

- **Encapsulation:** Database logic is encapsulated within service layers, keeping controllers clean.
- **Reusability:** Services can be reused across different parts of the application.
- **Testability:** Services can be easily mocked or stubbed during testing.

---

#### 7. **Handle Migrations and Seeders for PostgreSQL**

Properly managing database schema changes is crucial for maintaining data integrity.

##### a. **Creating Migrations**

Sequelize CLI allows you to create migrations that modify the database schema.

**Example: Adding a New Column to Users Table**

```bash
npx sequelize-cli migration:generate --name add-profile-picture-to-users
```

**`migrations/XXXXXX-add-profile-picture-to-users.js`:**

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'profilePicture', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'profilePicture');
  }
};
```

**Run Migrations:**

```bash
npx sequelize-cli db:migrate
```

##### b. **Creating Seeders**

Seeders allow you to populate the database with initial or test data.

**Example: Seeding Admin User**

```bash
npx sequelize-cli seed:generate --name admin-user
```

**`seeders/XXXXXX-admin-user.js`:**

```javascript
'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('AdminP@ssw0rd', 10);
    return queryInterface.bulkInsert('Users', [
      {
        id: 'admin-uuid',
        username: 'admin',
        email: 'admin@educonnect.com',
        password: hashedPassword,
        roles: ['admin'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', { email: 'admin@educonnect.com' }, {});
  }
};
```

**Run Seeders:**

```bash
npx sequelize-cli db:seed:all
```

**Notes:**

- Ensure that seeders are idempotent and can be safely rolled back if needed.
- Use UUIDs or other unique identifiers as necessary.

---

#### 8. **Implement Data Validation and Sanitization**

Ensuring data integrity is essential for both PostgreSQL and MongoDB. Use validation at the model level and within request handling.

##### a. **Sequelize Model Validations**

Leverage Sequelize's built-in validators.

**Example: User Model Email Validation**

```javascript
// models/user.js

email: {
  type: DataTypes.STRING,
  allowNull: false,
  unique: true,
  validate: {
    isEmail: {
      msg: 'Must be a valid email address'
    }
  }
}
```

##### b. **Mongoose Schema Validations**

Use Mongoose's schema validation features.

**Example: Learning Material URL Validation**

```javascript
// models/mongoose/LearningMaterial.js

url: {
  type: String,
  required: true,
  validate: {
    validator: function(v) {
      return /^https?:\/\/.+\..+/.test(v);
    },
    message: props => `${props.value} is not a valid URL!`
  }
}
```

##### c. **Request Validation with Middleware**

Implement request validation using middleware like **Joi** or **express-validator**.

**Install `express-validator`:**

```bash
npm install express-validator
```

**Example: User Registration Validation**

```javascript
// src/routes/v1/userRoutes.js

const express = require('express');
const router = express.Router();
const { register } = require('../../controllers/userController');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  validate, // Middleware to handle validation results
  register
);

module.exports = router;
```

**Create `validate.js` Middleware:**

```javascript
// src/middleware/validate.js

const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => err.msg)
    });
  }
  next();
};

module.exports = validate;
```

---

#### 9. **Implement Connection Pooling and Optimize Database Performance**

Efficient database connections and query optimizations are vital for performance.

##### a. **Sequelize Connection Pool Configuration**

Adjust the Sequelize configuration to use connection pooling.

**Update `config/config.js`:**

```javascript
// config/config.js

// ... existing code

development: {
  username: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE_DEV,
  host: process.env.PG_HOST,
  dialect: 'postgres',
  pool: {
    max: 10, // Maximum number of connections
    min: 0,
    acquire: 30000,
    idle: 10000
  }
},
// ... other environments
```

##### b. **Indexing in PostgreSQL**

Ensure that frequently queried fields are indexed to speed up read operations.

**Example: Adding Index on Email Field**

Modify the migration file or create a new migration to add an index.

```bash
npx sequelize-cli migration:generate --name add-email-index-to-users
```

**`migrations/XXXXXX-add-email-index-to-users.js`:**

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('Users', ['email'], {
      unique: true,
      name: 'users_email_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Users', 'users_email_idx');
  }
};
```

**Run Migrations:**

```bash
npx sequelize-cli db:migrate
```

##### c. **Mongoose Connection Options**

Optimize Mongoose connection settings for performance.

```javascript
// config/mongoose.js

const mongoose = require('mongoose');
const logger = require('../src/utils/logger'); // Assuming you have a logger utility

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Additional options for performance
      poolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
```

---

#### 10. **Implement Caching with Redis**

Enhance performance by caching frequently accessed data using **Redis**.

##### a. **Install Redis and Dependencies**

**Install Redis on Your Machine:**

Refer to the [official Redis installation guide](https://redis.io/topics/quickstart) for your operating system.

**Install Redis Client for Node.js:**

```bash
npm install redis
```

##### b. **Configure Redis Client**

Create a Redis client and set up caching mechanisms.

**Create `config/redis.js`:**

```javascript
// config/redis.js

const redis = require('redis');
const logger = require('../src/utils/logger'); // Assuming you have a logger utility

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Redis connection error:', error);
  }
};

module.exports = { redisClient, connectRedis };
```

**Update `.env` with Redis URL:**

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
```

##### c. **Integrate Redis in Application Entry Point**

Modify `src/index.js` to connect to Redis.

```javascript
// src/index.js

// ... existing imports

// Redis Connection
const { connectRedis } = require('../config/redis');

// ... existing code

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully.');

    // Connect to MongoDB
    await connectDB();

    // Connect to Redis
    await connectRedis();

    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};
```

##### d. **Implement Caching in Services**

**Example: Caching Courses Data**

```javascript
// src/services/courseService.js

const { Course } = require('../models');
const { redisClient } = require('../../config/redis');

const getAllCourses = async () => {
  const cacheKey = 'all_courses';
  
  // Check Redis Cache
  const cachedCourses = await redisClient.get(cacheKey);
  if (cachedCourses) {
    return JSON.parse(cachedCourses);
  }
  
  // Fetch from Database
  const courses = await Course.findAll();
  
  // Cache the Result in Redis for 1 hour
  await redisClient.setEx(cacheKey, 3600, JSON.stringify(courses));
  
  return courses;
};

module.exports = {
  getAllCourses,
  // ... other exports
};
```

**Benefits:**

- **Reduced Latency:** Faster data retrieval for cached data.
- **Lower Database Load:** Decreases the number of read operations on the database.
- **Scalability:** Supports handling high traffic by offloading repetitive queries to Redis.

---

#### 11. **Implement Database Security Best Practices**

Ensuring the security of your databases is paramount. Follow these best practices:

##### a. **Use Environment Variables for Credentials**

Avoid hardcoding sensitive information. Store all database credentials in environment variables.

**Example `.env`:**

```env
# PostgreSQL
PG_USERNAME=your_pg_username
PG_PASSWORD=your_pg_password
PG_DATABASE_DEV=educonnect_dev
PG_DATABASE_TEST=educonnect_test
PG_DATABASE_PROD=educonnect_prod
PG_HOST=127.0.0.1

# MongoDB
MONGO_URI=mongodb://username:password@localhost:27017/educonnect

# Redis
REDIS_URL=redis://localhost:6379
```

##### b. **Restrict Database Access**

- **Network Security:** Ensure databases are not publicly accessible. Use firewall rules to allow access only from trusted IPs or internal networks.
- **User Privileges:** Grant the minimum necessary privileges to database users. For example, the application user should only have access to specific databases and operations.

##### c. **Encrypt Data in Transit and at Rest**

- **TLS/SSL:** Use encrypted connections for PostgreSQL and MongoDB to protect data in transit.
  
  **PostgreSQL Example:**
  
  Update `config/config.js` to include SSL settings if connecting to a remote PostgreSQL server.
  
  ```javascript
  // config/config.js

  development: {
    username: process.env.PG_USERNAME,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE_DEV,
    host: process.env.PG_HOST,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Set to true in production with valid certificates
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  // ... other environments
  ```
  
- **At Rest:** Use disk encryption for databases if supported by your hosting environment.

##### d. **Regular Backups**

Implement regular backups for both PostgreSQL and MongoDB to prevent data loss.

- **PostgreSQL:** Use `pg_dump` for backups.
  
  ```bash
  pg_dump -U your_pg_username -h your_pg_host -F c -b -v -f educonnect_dev.backup educonnect_dev
  ```

- **MongoDB:** Use `mongodump` for backups.
  
  ```bash
  mongodump --uri="mongodb://username:password@localhost:27017/educonnect" --out=/backup/educonnect/
  ```

##### e. **Monitor and Audit Database Access**

Use monitoring tools to track database access and detect suspicious activities.

- **PostgreSQL:** Enable logging for connections and queries.
- **MongoDB:** Use MongoDB's built-in auditing features or integrate with external monitoring tools.

---

#### 12. **Test Database Integration**

Ensure that both PostgreSQL and MongoDB integrations work as expected by writing and running tests.

##### a. **Set Up Test Databases**

Create separate databases for testing to prevent contamination of development or production data.

**Update `.env.test`:**

```env
# PostgreSQL Test Configuration
PG_USERNAME=your_pg_username
PG_PASSWORD=your_pg_password
PG_DATABASE_TEST=educonnect_test
PG_HOST=127.0.0.1

# MongoDB Test Configuration
MONGO_URI=mongodb://username:password@localhost:27017/educonnect_test

# Redis Test Configuration
REDIS_URL=redis://localhost:6379
```

##### b. **Configure Jest for Testing**

Ensure Jest uses the test databases by setting the `NODE_ENV` to `test`.

**Update `package.json`:**

```json
"scripts": {
  "test": "NODE_ENV=test jest"
}
```

##### c. **Write Tests for Services**

**Example: Testing User Service**

```javascript
// tests/unit/userService.test.js

const { createUser, findUserByEmail } = require('../../src/services/userService');
const { sequelize, User } = require('../../src/models');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Recreate database
});

afterAll(async () => {
  await sequelize.close();
});

describe('User Service', () => {
  it('should create a new user', async () => {
    const userData = {
      username: 'testuser',
      email: 'testuser@example.com',
      password: await bcrypt.hash('password123', 10),
      roles: ['student']
    };
    const user = await createUser(userData);
    expect(user).toHaveProperty('id');
    expect(user.email).toBe('testuser@example.com');
  });

  it('should find a user by email', async () => {
    const user = await findUserByEmail('testuser@example.com');
    expect(user).not.toBeNull();
    expect(user.username).toBe('testuser');
  });
});
```

**Example: Testing Learning Material Service**

```javascript
// tests/unit/learningMaterialService.test.js

const { createLearningMaterial, getMaterialsByCourseId } = require('../../src/services/learningMaterialService');
const mongoose = require('mongoose');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Learning Material Service', () => {
  it('should create a new learning material', async () => {
    const materialData = {
      title: 'Node.js Basics',
      content: 'Introduction to Node.js',
      courseId: 'course-uuid',
      resourceType: 'video',
      url: 'https://example.com/video.mp4'
    };
    const material = await createLearningMaterial(materialData);
    expect(material).toHaveProperty('_id');
    expect(material.title).toBe('Node.js Basics');
  });

  it('should retrieve materials by course ID', async () => {
    const materials = await getMaterialsByCourseId('course-uuid');
    expect(materials.length).toBe(1);
    expect(materials[0].title).toBe('Node.js Basics');
  });
});
```

**Run Tests:**

```bash
npm test
```

**Notes:**

- Ensure that test databases are properly isolated.
- Use mock data to prevent dependency on actual data.
- Consider using tools like **Factory Girl** or **Faker** for generating test data.

---

#### 13. **Implement Data Access Patterns**

Adopt data access patterns that promote scalability and maintainability.

##### a. **Repository Pattern**

Encapsulate data access logic within repository classes.

**Example: User Repository**

```javascript
// src/repositories/userRepository.js

const { User } = require('../models');

class UserRepository {
  async create(userData) {
    return await User.create(userData);
  }

  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  async findById(id) {
    return await User.findByPk(id, {
      include: [{ model: Course, as: 'courses' }]
    });
  }

  // Add more methods as needed
}

module.exports = new UserRepository();
```

**Benefits:**

- **Abstraction:** Hides the complexity of ORM/ODM operations.
- **Flexibility:** Allows easy switching of ORM/ODM without affecting business logic.
- **Testability:** Facilitates mocking repositories during testing.

---

#### 14. **Handle Transactions and Data Consistency**

Ensure data consistency across both PostgreSQL and MongoDB, especially when operations involve both databases.

##### a. **Sequelize Transactions**

Use Sequelize's transaction management to handle multiple related operations atomically.

**Example: Creating a Course with Initial Quiz**

```javascript
// src/services/courseService.js

const { sequelize, Course, Quiz } = require('../models');
const CustomError = require('../utils/CustomError');

const createCourseWithQuiz = async (courseData, quizData) => {
  const transaction = await sequelize.transaction();
  try {
    const course = await Course.create(courseData, { transaction });
    const quiz = await Quiz.create(
      { ...quizData, courseId: course.id },
      { transaction }
    );
    await transaction.commit();
    return { course, quiz };
  } catch (error) {
    await transaction.rollback();
    throw new CustomError('Failed to create course and quiz', 500);
  }
};

module.exports = {
  createCourseWithQuiz,
  // ... other exports
};
```

**Notes:**

- Transactions ensure that either all operations succeed or none do, maintaining data integrity.
- Handle exceptions to rollback transactions in case of failures.

##### b. **Cross-Database Transactions**

Handling transactions that span both PostgreSQL and MongoDB is complex due to the lack of native support for distributed transactions in most setups.

**Approach:**

- **Two-Phase Commit:** Implement a two-phase commit protocol, which can be cumbersome.
- **Eventual Consistency:** Design the system to handle eventual consistency, ensuring that data across databases synchronize over time.

**Recommendation:**

For simplicity and given the project scope, adopt **eventual consistency** and ensure robust error handling and retry mechanisms.

---

#### 15. **Monitor and Optimize Database Performance**

Regularly monitor database performance and optimize queries to ensure responsiveness.

##### a. **Use Sequelize Logging**

Enable Sequelize's logging to monitor executed queries.

**Update `config/config.js`:**

```javascript
// config/config.js

development: {
  // ... existing configurations
  logging: (msg) => console.log(msg), // Enable logging
},
// ... other environments
```

**Disable Logging in Production:**

```javascript
production: {
  // ... existing configurations
  logging: false, // Disable logging to enhance performance
},
```

##### b. **Analyze Slow Queries**

Identify and optimize slow-running queries.

**Tools:**

- **PostgreSQL:** Use the `pg_stat_statements` extension to track query performance.
  
  **Enable `pg_stat_statements`:**
  
  ```sql
  -- In psql
  CREATE EXTENSION pg_stat_statements;
  ```
  
  **Querying Slow Queries:**
  
  ```sql
  SELECT
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time
  FROM
    pg_stat_statements
  ORDER BY
    total_time DESC
  LIMIT 10;
  ```

- **MongoDB:** Use the `explain` method to analyze query performance.

  **Example:**

  ```javascript
  // In Mongoose
  LearningMaterial.find({ courseId: 'course-uuid' }).explain('executionStats');
  ```

##### c. **Implement Indexing Strategically**

Avoid over-indexing, which can degrade write performance. Index fields that are frequently queried or used in join operations.

**Example: Indexing `courseId` in Learning Materials**

```javascript
// models/mongoose/LearningMaterial.js

const LearningMaterialSchema = new mongoose.Schema(
  {
    // ... existing fields
    courseId: {
      type: String,
      required: true,
      index: true // Creates an index
    },
    // ... other fields
  },
  { timestamps: true }
);
```

---

#### 16. **Ensure Data Backup and Recovery**

Implement reliable backup and recovery strategies to prevent data loss.

##### a. **Automate Backups**

Set up automated backup schedules for both PostgreSQL and MongoDB.

**PostgreSQL:**

- **Cron Job Example:**

  ```bash
  # Backup daily at 2 AM
  0 2 * * * pg_dump -U your_pg_username -h your_pg_host -F c -b -v -f /backup/educonnect_dev_$(date +\%F).backup educonnect_dev
  ```

**MongoDB:**

- **Cron Job Example:**

  ```bash
  # Backup daily at 3 AM
  0 3 * * * mongodump --uri="mongodb://username:password@localhost:27017/educonnect" --out=/backup/educonnect_$(date +\%F)/
  ```

##### b. **Test Recovery Procedures**

Regularly test backups to ensure they can be restored successfully.

**PostgreSQL Restore Example:**

```bash
pg_restore -U your_pg_username -h your_pg_host -d educonnect_dev_restored -v /backup/educonnect_dev.backup
```

**MongoDB Restore Example:**

```bash
mongorestore --uri="mongodb://username:password@localhost:27017/educonnect_restored" /backup/educonnect/
```

---

#### 17. **Implement Data Seeding for Development and Testing**

Populate databases with initial data to facilitate development and testing.

##### a. **PostgreSQL Seeders**

Already covered in **Section 7.b**, but ensure comprehensive seed data.

**Example: Seeding Multiple Users and Courses**

```javascript
// seeders/XXXXXX-multiple-users-and-courses.js

'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await queryInterface.bulkInsert('Users', [
      {
        id: 'user-uuid-1',
        username: 'john_doe',
        email: 'john@example.com',
        password: hashedPassword,
        roles: ['student'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'user-uuid-2',
        username: 'jane_instructor',
        email: 'jane@example.com',
        password: hashedPassword,
        roles: ['instructor'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    await queryInterface.bulkInsert('Courses', [
      {
        id: 'course-uuid-1',
        title: 'Introduction to Node.js',
        description: 'Learn the basics of Node.js.',
        category: 'Programming',
        instructorId: 'user-uuid-2',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Add more seed data as needed
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Courses', null, {});
    await queryInterface.bulkDelete('Users', null, {});
  }
};
```

##### b. **MongoDB Seeders**

Create scripts to seed MongoDB collections.

**Example: Seeding Learning Materials**

```javascript
// scripts/seedLearningMaterials.js

require('dotenv').config();
const mongoose = require('mongoose');
const LearningMaterial = require('../src/models/mongoose/LearningMaterial');
const logger = require('../src/utils/logger');

const seedLearningMaterials = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const materials = [
      {
        title: 'Node.js Basics',
        content: 'Introduction to Node.js',
        courseId: 'course-uuid-1',
        resourceType: 'video',
        url: 'https://example.com/video1.mp4'
      },
      {
        title: 'Advanced Node.js',
        content: 'Deep dive into Node.js',
        courseId: 'course-uuid-1',
        resourceType: 'document',
        url: 'https://example.com/doc1.pdf'
      }
    ];

    await LearningMaterial.insertMany(materials);
    logger.info('Learning materials seeded successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding learning materials:', error);
    process.exit(1);
  }
};

seedLearningMaterials();
```

**Run the Seeder:**

```bash
node scripts/seedLearningMaterials.js
```

---

#### 18. **Ensure Data Consistency Across Databases**

While PostgreSQL and MongoDB operate independently, maintaining consistency between related data is crucial.

##### a. **Referential Integrity**

Since MongoDB does not enforce referential integrity, ensure that references (like `userId` and `courseId`) are validated at the application level.

**Example: Validating `courseId` Before Adding Learning Material**

```javascript
// src/controllers/learningMaterialController.js

const courseService = require('../services/courseService');
const learningMaterialService = require('../services/learningMaterialService');
const CustomError = require('../utils/CustomError');

exports.addLearningMaterial = async (req, res, next) => {
  try {
    const { courseId, title, content, resourceType, url } = req.body;

    // Validate that the course exists in PostgreSQL
    const course = await courseService.findCourseById(courseId);
    if (!course) {
      throw new CustomError('Course not found', 404);
    }

    // Create Learning Material in MongoDB
    const material = await learningMaterialService.createLearningMaterial({
      courseId,
      title,
      content,
      resourceType,
      url
    });

    res.status(201).json({ success: true, data: material });
  } catch (error) {
    next(error);
  }
};
```

##### b. **Cascade Operations**

Implement cascade operations manually where necessary.

**Example: Deleting a Course and Its Learning Materials**

```javascript
// src/services/courseService.js

const { Course, Quiz } = require('../models');
const LearningMaterial = require('../models/mongoose/LearningMaterial');

const deleteCourse = async (courseId) => {
  const transaction = await sequelize.transaction();
  try {
    // Delete quizzes associated with the course
    await Quiz.destroy({ where: { courseId }, transaction });

    // Delete the course
    await Course.destroy({ where: { id: courseId }, transaction });

    // Commit PostgreSQL transactions
    await transaction.commit();

    // Delete learning materials from MongoDB
    await LearningMaterial.deleteMany({ courseId });

    return true;
  } catch (error) {
    await transaction.rollback();
    throw new CustomError('Failed to delete course', 500);
  }
};

module.exports = {
  deleteCourse,
  // ... other exports
};
```

**Notes:**

- **Consistency Checks:** Regularly verify that references between databases remain consistent.
- **Error Handling:** Implement robust error handling to manage failures in cross-database operations.

---

#### 19. **Implement Pagination and Query Optimization**

Efficient data retrieval is essential, especially for endpoints that return large datasets.

##### a. **Sequelize Pagination**

**Example: Paginating Courses**

```javascript
// src/services/courseService.js

const getAllCourses = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const { count, rows } = await Course.findAndCountAll({
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });
  return {
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    courses: rows
  };
};

module.exports = {
  getAllCourses,
  // ... other exports
};
```

##### b. **Mongoose Pagination**

**Example: Paginating Learning Materials**

```javascript
// src/services/learningMaterialService.js

const getMaterialsByCourseId = async (courseId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const materials = await LearningMaterial.find({ courseId })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });
  
  const total = await LearningMaterial.countDocuments({ courseId });
  
  return {
    totalItems: total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    materials
  };
};

module.exports = {
  getMaterialsByCourseId,
  // ... other exports
};
```

##### c. **Optimize Queries**

- **Select Specific Fields:** Retrieve only necessary fields to reduce data transfer.
  
  **Sequelize Example:**

  ```javascript
  const user = await User.findByPk(id, {
    attributes: ['id', 'username', 'email']
  });
  ```

- **Use Aggregations in MongoDB:** For complex data retrieval, utilize MongoDB's aggregation framework.

  **Example: Aggregating User Progress**

  ```javascript
  const aggregateProgress = async (userId) => {
    return await UserProgress.aggregate([
      { $match: { userId } },
      { $group: { _id: '$courseId', totalCompleted: { $sum: { $size: '$completedModules' } } } }
    ]);
  };
  ```

---

#### 20. **Implement Soft Deletes (Optional)**

Soft deletes allow you to mark records as deleted without permanently removing them, facilitating data recovery and auditing.

##### a. **Sequelize Soft Deletes**

**Add `deletedAt` Field and Enable Paranoid Mode**

Modify the model definitions to include `deletedAt` and enable paranoid mode.

**Example: User Model with Soft Deletes**

```javascript
// models/user.js

// ... existing code

User.init(
  {
    // ... existing fields
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    paranoid: true, // Enables soft deletes
    deletedAt: 'deletedAt'
  }
);
```

**Migration to Add `deletedAt` Column:**

```bash
npx sequelize-cli migration:generate --name add-deletedAt-to-users
```

**`migrations/XXXXXX-add-deletedAt-to-users.js`:**

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'deletedAt');
  }
};
```

**Run Migration:**

```bash
npx sequelize-cli db:migrate
```

**Notes:**

- **Paranoid Mode:** When enabled, Sequelize excludes soft-deleted records from query results by default.
- **Restoring Records:** Implement methods to restore soft-deleted records if necessary.

---

### **Summary**

In **Step 3: Database Integration**, we've successfully:

- **Chosen and Configured Databases:**
  - **PostgreSQL** with **Sequelize** for relational data.
  - **MongoDB** with **Mongoose** for unstructured data.

- **Installed Necessary Dependencies:** Included Sequelize, Sequelize CLI, pg, pg-hstore for PostgreSQL, and Mongoose for MongoDB.

- **Configured Database Connections:** Set up configuration files and environment variables for secure and flexible connections.

- **Defined Models and Schemas:**
  - **Sequelize Models:** User, Course, Quiz with associations.
  - **Mongoose Schemas:** LearningMaterial, UserProgress.

- **Implemented Repository and Service Layers:** Encapsulated database interactions for better maintainability and testability.

- **Handled Migrations and Seeders:** Managed database schema changes and populated initial data.

- **Ensured Data Validation and Security:** Applied validations at the model and request levels, secured database credentials, and implemented connection pooling.

- **Optimized Performance:** Configured caching with Redis, implemented pagination, and optimized queries.

- **Established Backup and Recovery Procedures:** Automated backups and tested recovery processes to safeguard data.

- **Ensured Data Consistency:** Maintained references between PostgreSQL and MongoDB and handled cross-database operations carefully.

- **Optional Enhancements:** Implemented soft deletes for data recovery and auditing purposes.

---

### **Next Steps**

With the databases integrated and configured, the next step is to **Step 4: Implement Core Functionality**. In this phase, we'll develop the main features and API endpoints, ensuring alignment with your **project_requirements** such as user authentication, course management, progress tracking, adaptive learning algorithms, video streaming integration, and the quiz system.

Feel free to ask any questions or request further assistance regarding **Step 3: Database Integration**!

===