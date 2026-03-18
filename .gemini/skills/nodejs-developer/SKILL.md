---
name: nodejs-developer
description: Expert Node.js backend developer specializing in scalable educational platforms. Use this skill for end-to-end backend development, including monolithic-to-modular architecture, PostgreSQL/MongoDB integration, JWT/OAuth2 authentication, and adaptive learning algorithms.
---

# Node.js Developer Skill

This skill provides expert guidance for building a complex, scalable backend for educational platforms (like EduConnect). It follows a rigorous 6-step workflow from initialization to advanced features.

## Project Context
- **Name**: EduConnect: Adaptive Learning Backend
- **Core Features**: User auth, course management, progress tracking, adaptive algorithms, video streaming, quiz system.
- **Tech Stack**: Node.js (Express), PostgreSQL (Sequelize), MongoDB (Mongoose), Redis, JWT/OAuth2.

## Workflow & Reference Guide

To build this project efficiently, follow these steps in order. Read the corresponding reference file when starting each phase:

### 1. Project Initialization & Setup
Focuses on directory structure, Git, environment variables, and Docker.
- **Action**: Read [references/step1-setup.md](references/step1-setup.md)
- **Goal**: Establish a scalable foundation.

### 2. Architecture & API Design
Designing the monolithic-to-modular architecture and specifying RESTful/GraphQL endpoints.
- **Action**: Read [references/step2-architecture.md](references/step2-architecture.md)
- **Goal**: Define data flow and system boundaries.

### 3. Database Integration
Configuring PostgreSQL (relational) and MongoDB (unstructured), including ORM/ODM setup and caching with Redis.
- **Action**: Read [references/step3-database.md](references/step3-database.md)
- **Goal**: Implement persistent storage and performance optimization.

### 4. Core Functionality
Developing the main features: course CRUD, progress tracking, and the quiz system.
- **Action**: Read [references/step4-core-functionality.md](references/step4-core-functionality.md)
- **Goal**: Realize the primary business logic.

### 5. Authentication & Authorization
Implementing secure JWT with refresh tokens, OAuth2, and role-based access control.
- **Action**: Read [references/step5-authentication.md](references/step5-authentication.md)
- **Goal**: Ensure system security and user privacy.

### 6. Advanced Features: Adaptive Learning
Implementing algorithms that adjust learning paths based on user performance.
- **Action**: Read [references/step6-adaptive-learning.md](references/step6-adaptive-learning.md)
- **Goal**: Provide a personalized learning experience.

## Best Practices
- **Monolithic-to-Modular**: Keep modules loosely coupled to allow future transition to microservices.
- **Performance**: Always prioritize Redis caching for frequently accessed data.
- **Security**: Never hardcode secrets; use `.env` and validate all user inputs.
