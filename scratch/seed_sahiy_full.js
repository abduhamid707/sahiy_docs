const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb://127.0.0.1:27017/sahiy_docs";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('sahiy_docs');
    
    // Find the Sahiy.uz project
    const project = await db.collection('projects').findOne({ name: "Sahiy.uz" });
    if (!project) {
      console.log("Sahiy.uz project not found. Please run test_db.js first.");
      return;
    }

    const admin = await db.collection('users').findOne({ email: "admin@gmail.com" });
    const adminId = admin?._id;

    // Define categories
    const categories = [
      { name: "Architecture", order: 0 },
      { name: "Frontend", order: 1 },
      { name: "Backend", order: 2 },
      { name: "Infrastructure", order: 3 },
      { name: "API Reference", order: 4 },
      { name: "Runbooks", order: 5 }
    ];

    console.log("Seeding categories...");
    const categoryIds = {};
    for (const cat of categories) {
      const existingCat = await db.collection('categories').findOne({ name: cat.name, projectId: project._id });
      if (existingCat) {
        categoryIds[cat.name] = existingCat._id;
      } else {
        const result = await db.collection('categories').insertOne({
          ...cat,
          projectId: project._id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        categoryIds[cat.name] = result.insertedId;
      }
    }

    // Define Documents
    const documents = [
      {
        title: "System Overview",
        category: "Architecture",
        content: `# Sahiy.uz System Architecture

Sahiy.uz is a multi-vendor marketplace platform built for high scalability and performance.

## Core Components
- **Public Web**: Next.js 14 (App Router)
- **API Gateway**: NestJS Microservices
- **Database**: PostgreSQL (Primary) & Redis (Caching)
- **Search Engine**: Elasticsearch
- **Storage**: AWS S3 Compatible (Minio)

## High-Level Diagram
\`\`\`mermaid
graph TD
    Client[Browser/Mobile] --> CF[Cloudflare]
    CF --> LB[Nginx Load Balancer]
    LB --> FE[Next.js Frontend]
    LB --> API[NestJS API Gateway]
    API --> Auth[Auth Service]
    API --> Order[Order Service]
    API --> Product[Product Service]
    Order --> DB[(PostgreSQL)]
    Product --> ES[Elasticsearch]
\`\`\`
`,
      },
      {
        title: "Database Schema",
        category: "Architecture",
        content: `# Database Schema Design

We follow a relational structure with JSONB support for dynamic attributes.

## Main Entities
### Users
- \`id\`: UUID
- \`email\`: String (Unique)
- \`role\`: Enum (CUSTOMER, SELLER, ADMIN)

### Products
- \`id\`: UUID
- \`slug\`: String
- \`price\`: Decimal
- \`metadata\`: JSONB (Attributes like color, size)

### Orders
- \`id\`: UUID
- \`status\`: Enum (PENDING, PAID, SHIPPED)
- \`total\`: Decimal
`,
      },
      {
        title: "Frontend Coding Standards",
        category: "Frontend",
        content: `# Frontend Standards & Best Practices

## Tech Stack
- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **State**: TanStack Query (Server) & Zustand (Client)
- **Forms**: React Hook Form + Zod

## Rules
1. **Components**: Use functional components with TypeScript.
2. **Naming**: PascalCase for components, camelCase for hooks/utilities.
3. **Icons**: Use \`lucide-react\` exclusively.
4. **Performance**: Always use \`next/image\` for media.
`,
      },
      {
        title: "API Authentication",
        category: "Backend",
        content: `# API Authentication Guide

We use **JWT (JSON Web Tokens)** for stateless authentication.

## Flow
1. Client sends credentials to \`/api/auth/login\`.
2. Server validates and returns \`accessToken\` and \`refreshToken\`.
3. Client includes \`Authorization: Bearer <token>\` in headers.

## Security
- Tokens expire in 15 minutes.
- Refresh tokens are stored in HttpOnly cookies.
- Password hashing using Argon2.
`,
      },
      {
        title: "Deployment Workflow",
        category: "Infrastructure",
        content: `# Deployment & CI/CD

Our infrastructure is fully containerized using Docker.

## Pipeline (GitHub Actions)
1. **Lint & Test**: Runs on every PR.
2. **Build**: Docker image created and pushed to Registry.
3. **Deploy**: Kubernetes rollout triggered via Helm.

## Environments
- **Staging**: \`staging.sahiy.uz\`
- **Production**: \`sahiy.uz\`
`,
      },
      {
        title: "Emergency Runbook",
        category: "Runbooks",
        content: `# Incident Response Runbook

## Level 1: Site Down
1. Check Nginx status: \`systemctl status nginx\`
2. Check DB connectivity.
3. Check Error logs: \`docker logs api-gateway\`

## Level 2: Slow Performance
1. Check Redis cache hit rate.
2. Check DB slow query logs.
3. Scale pods: \`kubectl scale deployment/api --replicas=10\`
`
      }
    ];

    console.log("Seeding documents...");
    for (const doc of documents) {
      await db.collection('documents').updateOne(
        { title: doc.title, categoryId: categoryIds[doc.category] },
        { 
          $set: {
            content: doc.content,
            status: "REVIEWED",
            allowedRoles: project.allowedRoles,
            owner: adminId,
            lastUpdatedBy: adminId,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    }

    console.log("Sahiy.uz has been fully populated with professional documentation!");
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
