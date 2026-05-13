# Graph Report - .  (2026-05-11)

## Corpus Check
- Corpus is ~33,264 words - fits in a single context window. You may not need a graph.

## Summary
- 257 nodes · 272 edges · 53 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.8)
- Token cost: 1,850 input · 2,100 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth Service & Infrastructure|Auth Service & Infrastructure]]
- [[_COMMUNITY_Projects UI Audit|Projects UI Audit]]
- [[_COMMUNITY_Project Page & Mutations|Project Page & Mutations]]
- [[_COMMUNITY_Projects Service Backend|Projects Service Backend]]
- [[_COMMUNITY_Projects API Controller|Projects API Controller]]
- [[_COMMUNITY_Auth Frontend & API Client|Auth Frontend & API Client]]
- [[_COMMUNITY_Auth Controller|Auth Controller]]
- [[_COMMUNITY_Projects Sidebar & Modal|Projects Sidebar & Modal]]
- [[_COMMUNITY_Auth Shared UI|Auth Shared UI]]
- [[_COMMUNITY_App Health & Entry|App Health & Entry]]
- [[_COMMUNITY_Sprint DTOs|Sprint DTOs]]
- [[_COMMUNITY_Item & Comment DTOs|Item & Comment DTOs]]
- [[_COMMUNITY_Projects Views|Projects Views]]
- [[_COMMUNITY_Original Sidebar|Original Sidebar]]
- [[_COMMUNITY_App Service|App Service]]
- [[_COMMUNITY_Project DTOs|Project DTOs]]
- [[_COMMUNITY_Prisma Service|Prisma Service]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Home Page|Home Page]]
- [[_COMMUNITY_Providers|Providers]]
- [[_COMMUNITY_Projects List Page|Projects List Page]]
- [[_COMMUNITY_My Tasks Page|My Tasks Page]]
- [[_COMMUNITY_My Work Page|My Work Page]]
- [[_COMMUNITY_Assigned Page|Assigned Page]]
- [[_COMMUNITY_Overview Page|Overview Page]]
- [[_COMMUNITY_API Bootstrap|API Bootstrap]]
- [[_COMMUNITY_App Module|App Module]]
- [[_COMMUNITY_Redis Module|Redis Module]]
- [[_COMMUNITY_Auth Module|Auth Module]]
- [[_COMMUNITY_Login DTO|Login DTO]]
- [[_COMMUNITY_Verify OTP DTO|Verify OTP DTO]]
- [[_COMMUNITY_Resend OTP DTO|Resend OTP DTO]]
- [[_COMMUNITY_Signup DTO|Signup DTO]]
- [[_COMMUNITY_JWT Auth Guard|JWT Auth Guard]]
- [[_COMMUNITY_Mail Module|Mail Module]]
- [[_COMMUNITY_Projects Module|Projects Module]]
- [[_COMMUNITY_Prisma Module|Prisma Module]]
- [[_COMMUNITY_Design Token System|Design Token System]]
- [[_COMMUNITY_Shared Types Common|Shared Types Common]]
- [[_COMMUNITY_Shared Types Index|Shared Types Index]]
- [[_COMMUNITY_Shared User Type|Shared User Type]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Next Env Types|Next Env Types]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Next Config|Next Config]]
- [[_COMMUNITY_Projects Loading|Projects Loading]]
- [[_COMMUNITY_Project Detail Loading|Project Detail Loading]]
- [[_COMMUNITY_Dashboard Loading|Dashboard Loading]]
- [[_COMMUNITY_Rich Editor|Rich Editor]]
- [[_COMMUNITY_Project Store|Project Store]]
- [[_COMMUNITY_My Work Page Audit|My Work Page Audit]]
- [[_COMMUNITY_My Tasks Page Audit|My Tasks Page Audit]]
- [[_COMMUNITY_Assigned Page Audit|Assigned Page Audit]]

## God Nodes (most connected - your core abstractions)
1. `ProjectsService` - 22 edges
2. `ProjectsController` - 19 edges
3. `AuthService` - 13 edges
4. `Board Tab` - 10 edges
5. `Projects UI Audit` - 9 edges
6. `handleSubmit()` - 8 edges
7. `AuthController` - 8 edges
8. `RedisService` - 7 edges
9. `MailService` - 6 edges
10. `Backlog Tab` - 6 edges

## Surprising Connections (you probably didn't know these)
- `handleSubmit()` --calls--> `saveToken()`  [INFERRED]
  apps/web/app/(auth)/login/page.tsx → apps/web/lib/api.ts

## Hyperedges (group relationships)
- **Hardcoded NB-218 Panel Routing Pattern** —  [EXTRACTED 1.00]
- **Silent Item Discard in Create Flow** —  [EXTRACTED 1.00]
- **Board Duplicate Story Groups Overlap** —  [EXTRACTED 1.00]

## Communities

### Community 0 - "Auth Service & Infrastructure"
Cohesion: 0.1
Nodes (5): AuthService, JwtStrategy, MailService, handleResend(), RedisService

### Community 1 - "Projects UI Audit"
Cohesion: 0.09
Nodes (33): Active Sprint, Backlog Tab, blSprints / blBacklog State, BLStatusPill, Board Tab, Broken Ticket-ID Navigation Bug, Complete Sprint Modal, CreateStoryPanel (+25 more)

### Community 2 - "Project Page & Mutations"
Cohesion: 0.09
Nodes (4): handleClose(), handleCreate(), mkIcon(), onDragStart()

### Community 3 - "Projects Service Backend"
Cohesion: 0.15
Nodes (1): ProjectsService

### Community 4 - "Projects API Controller"
Cohesion: 0.1
Nodes (1): ProjectsController

### Community 5 - "Auth Frontend & API Client"
Cohesion: 0.13
Nodes (5): getToken(), req(), saveToken(), handleSubmit(), validate()

### Community 6 - "Auth Controller"
Cohesion: 0.22
Nodes (1): AuthController

### Community 7 - "Projects Sidebar & Modal"
Cohesion: 0.4
Nodes (2): genKey(), handleNameChange()

### Community 8 - "Auth Shared UI"
Cohesion: 0.4
Nodes (0): 

### Community 9 - "App Health & Entry"
Cohesion: 0.5
Nodes (1): AppController

### Community 10 - "Sprint DTOs"
Cohesion: 0.5
Nodes (3): CompleteSprintDto, CreateSprintDto, UpdateSprintDto

### Community 11 - "Item & Comment DTOs"
Cohesion: 0.5
Nodes (3): CreateCommentDto, CreateItemDto, UpdateItemDto

### Community 12 - "Projects Views"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Original Sidebar"
Cohesion: 0.67
Nodes (0): 

### Community 14 - "App Service"
Cohesion: 0.67
Nodes (1): AppService

### Community 15 - "Project DTOs"
Cohesion: 0.67
Nodes (2): CreateProjectDto, UpdateProjectDto

### Community 16 - "Prisma Service"
Cohesion: 0.67
Nodes (1): PrismaService

### Community 17 - "Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Home Page"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Providers"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Projects List Page"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "My Tasks Page"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "My Work Page"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Assigned Page"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Overview Page"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "API Bootstrap"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "App Module"
Cohesion: 1.0
Nodes (1): AppModule

### Community 27 - "Redis Module"
Cohesion: 1.0
Nodes (1): RedisModule

### Community 28 - "Auth Module"
Cohesion: 1.0
Nodes (1): AuthModule

### Community 29 - "Login DTO"
Cohesion: 1.0
Nodes (1): LoginDto

### Community 30 - "Verify OTP DTO"
Cohesion: 1.0
Nodes (1): VerifyOtpDto

### Community 31 - "Resend OTP DTO"
Cohesion: 1.0
Nodes (1): ResendOtpDto

### Community 32 - "Signup DTO"
Cohesion: 1.0
Nodes (1): SignupDto

### Community 33 - "JWT Auth Guard"
Cohesion: 1.0
Nodes (1): JwtAuthGuard

### Community 34 - "Mail Module"
Cohesion: 1.0
Nodes (1): MailModule

### Community 35 - "Projects Module"
Cohesion: 1.0
Nodes (1): ProjectsModule

### Community 36 - "Prisma Module"
Cohesion: 1.0
Nodes (1): PrismaModule

### Community 37 - "Design Token System"
Cohesion: 1.0
Nodes (2): Design Token System (projects.css, 2376 lines), app/projects/projects.css

### Community 38 - "Shared Types Common"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Shared Types Index"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Shared User Type"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Next Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Next Config"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Projects Loading"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Project Detail Loading"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Dashboard Loading"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Rich Editor"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Project Store"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "My Work Page Audit"
Cohesion: 1.0
Nodes (1): app/projects/my-work/page.tsx

### Community 51 - "My Tasks Page Audit"
Cohesion: 1.0
Nodes (1): app/projects/my-tasks/page.tsx

### Community 52 - "Assigned Page Audit"
Cohesion: 1.0
Nodes (1): app/projects/assigned/page.tsx

## Knowledge Gaps
- **31 isolated node(s):** `AppModule`, `RedisModule`, `AuthModule`, `LoginDto`, `VerifyOtpDto` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Root Layout`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Home Page`** (2 nodes): `page.tsx`, `Home()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Providers`** (2 nodes): `providers.tsx`, `Providers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Projects List Page`** (2 nodes): `page.tsx`, `ProjectsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `My Tasks Page`** (2 nodes): `page.tsx`, `MyTasksPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `My Work Page`** (2 nodes): `page.tsx`, `MyWorkPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Assigned Page`** (2 nodes): `page.tsx`, `AssignedPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Overview Page`** (2 nodes): `page.tsx`, `OverviewPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Bootstrap`** (2 nodes): `main.ts`, `bootstrap()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Module`** (2 nodes): `AppModule`, `app.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Redis Module`** (2 nodes): `redis.module.ts`, `RedisModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Module`** (2 nodes): `auth.module.ts`, `AuthModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login DTO`** (2 nodes): `login.dto.ts`, `LoginDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Verify OTP DTO`** (2 nodes): `verify-otp.dto.ts`, `VerifyOtpDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Resend OTP DTO`** (2 nodes): `resend-otp.dto.ts`, `ResendOtpDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Signup DTO`** (2 nodes): `signup.dto.ts`, `SignupDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `JWT Auth Guard`** (2 nodes): `jwt-auth.guard.ts`, `JwtAuthGuard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mail Module`** (2 nodes): `mail.module.ts`, `MailModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Projects Module`** (2 nodes): `projects.module.ts`, `ProjectsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Module`** (2 nodes): `prisma.module.ts`, `PrismaModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Design Token System`** (2 nodes): `Design Token System (projects.css, 2376 lines)`, `app/projects/projects.css`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Types Common`** (1 nodes): `common.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Types Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared User Type`** (1 nodes): `user.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next Env Types`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next Config`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Projects Loading`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Detail Loading`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Loading`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Rich Editor`** (1 nodes): `RichEditor.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Store`** (1 nodes): `projectStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `My Work Page Audit`** (1 nodes): `app/projects/my-work/page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `My Tasks Page Audit`** (1 nodes): `app/projects/my-tasks/page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Assigned Page Audit`** (1 nodes): `app/projects/assigned/page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleSubmit()` connect `Auth Frontend & API Client` to `Auth Service & Infrastructure`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `AppModule`, `RedisModule`, `AuthModule` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth Service & Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Projects UI Audit` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Project Page & Mutations` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Projects API Controller` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Auth Frontend & API Client` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._