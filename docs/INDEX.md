# 📚 Documentation Structure

## Overview

La documentación está organizadamente estructurada para que cada usuario pueda encontrar rápidamente lo que necesita.

```
mindy-smart-closet/
├── README.md                           ← START HERE (project overview)
├── Software Design Document (SDD).md   ← Technical specification (complete)
│
└── docs/
    ├── ARCHITECTURE.md                 ← System design & folder structure
    ├── REFACTOR.md                     ← Ongoing refactor: decisions + phase log
    ├── API.md                          ← API reference (3 endpoints)
    ├── TESTING.md                      ← Testing strategy & execution
    ├── CONTRIBUTING.md                 ← How to contribute
    └── ROADMAP.md                      ← Features planned & in progress
```

---

## 📖 Which Doc Should I Read?

### 🆕 **New to Mindy?**
1. **README.md** (5 min)
   - What is Mindy?
   - Quick start
   - Tech stack overview
2. **ARCHITECTURE.md** (10 min)
   - Folder structure
   - Data flow
   - How it works

### 👨‍💻 **Ready to Code?**
1. **CONTRIBUTING.md** (10 min)
   - Code style guidelines
   - PR workflow
   - Testing expectations
2. **ARCHITECTURE.md** (reference)
   - Component organization
   - State management
3. **API.md** (reference)
   - How to call backend APIs
   - Error handling

### 🔧 **Setting up locally?**
1. **README.md** → Quick Start section
2. **CONTRIBUTING.md** → Development Tips

### 🧪 **Testing & Quality?**
1. **TESTING.md** (15 min)
   - Run unit tests
   - Run E2E tests
   - Performance baselines
2. **README.md** → Testing & Quality section

### 📡 **Building an API integration?**
1. **API.md** (20 min)
   - All endpoints documented
   - Request/response examples
   - Error handling
   - Rate limiting

### 🗓️ **Planning features?**
1. **ROADMAP.md** (10 min)
   - What's done
   - What's next
   - Future plans

### 🏗️ **Understanding the architecture?**
1. **SDD.md** (30+ min)
   - Complete technical specification
   - Database schema
   - Business rules
   - All implementation details

---

## 📊 Document Comparison

| Document | Audience | Length | Depth |
|---|---|---|---|
| **README** | Everyone | 200 lines | Quick overview |
| **SDD** | Tech leads, architects | 700+ lines | Complete spec |
| **ARCHITECTURE** | Developers | 400 lines | System design |
| **API** | Backend/Frontend devs | 300 lines | Endpoint docs |
| **TESTING** | QA, Developers | 400 lines | Test strategy |
| **CONTRIBUTING** | Contributors | 300 lines | Workflow |
| **ROADMAP** | PO, Tech leads | 200 lines | Plans |

---

## 🎯 Quick Reference by Role

### Product Owner (PO)
```
README (Features section)
    ↓
ROADMAP (what's next)
    ↓
SDD (business rules section 6)
```

### Frontend Developer
```
README (Quick Start)
    ↓
CONTRIBUTING (code style)
    ↓
ARCHITECTURE (folder structure)
    ↓
API.md (how to call endpoints)
```

### Backend Developer
```
ARCHITECTURE (API flow)
    ↓
API.md (endpoint specs)
    ↓
SDD (database schema section 4)
```

### DevOps / Infrastructure
```
README (deployment section)
    ↓
ARCHITECTURE (infrastructure layer)
    ↓
SDD (deployment section 12)
```

### QA / Testing
```
TESTING.md (test strategy)
    ↓
CONTRIBUTING.md (testing section)
    ↓
README (quality metrics)
```

### New Team Member
```
README (5 min)
    ↓
ARCHITECTURE (10 min)
    ↓
CONTRIBUTING.md (10 min)
    ↓
Start coding!
```

---

## 📋 Content Summary

### README.md
- 🎯 Project vision & features
- 🚀 Quick start (install, setup, run)
- 🛠️ Tech stack table
- 📦 Project structure (abbreviated)
- 🧪 Testing commands
- 🚀 Deployment checklist
- 📚 Links to detailed docs
- 🎯 Roadmap summary
- 🤝 Contributing link

### Software Design Document (SDD)
- 📊 Complete technical specification
- 🔐 Security & authentication
- 💾 Database schema (4 tables)
- 🎯 Business rules & flows
- 📱 UI/UX patterns
- 🤖 AI integration details
- 📈 Performance baselines
- 🗓️ Backlog (prioritized)
- 🚀 Deployment status

### ARCHITECTURE.md
- 🏗️ Design principles
- 📁 Full folder structure (detailed)
- 📊 Data flow diagram
- 💾 Database schema (concise)
- 🧠 State management (Zustand, TanStack Query)
- 🤖 AI integration architecture
- ⚡ Performance optimizations
- 🔒 Security layers

### API.md
- 📡 3 endpoints: weather, recommender, analyze
- 📥 Request body examples
- 📤 Response examples
- 🔒 Authentication & rate limits
- ❌ Error responses
- 💻 Code examples (TypeScript)
- 🔄 Retry & error handling patterns
- 📊 Monitoring & observability

### TESTING.md
- 🧪 Unit tests (Vitest, 90% threshold)
- 🎭 E2E tests (Playwright, 8 specs)
- 📊 Load tests (k6, weather & recommender)
- ♿ a11y tests (axe-core)
- 📈 Performance baselines
- 🐛 Debugging tips
- 🌱 Test data seeding

### CONTRIBUTING.md
- 🎯 Code style (TypeScript, React, CSS, imports)
- 🧪 Testing expectations
- 📝 Commit message format
- 📋 PR checklist
- 🔄 Review process
- 💻 Development tips
- 📖 Documentation updates
- 🤝 Code of conduct

### ROADMAP.md
- ✅ MVP completed features
- 🔄 In progress (a11y audit, rain filtering)
- 📋 Coming soon (similarity, starter wardrobe, tomorrow's outfit)
- 🎯 H2 2026 (ML, social features)
- 🛠️ Infrastructure improvements
- 📊 Success metrics
- 💡 Backlog ideas

---

## 🔗 Cross-References

### README points to:
- ARCHITECTURE (folder structure details)
- API.md (endpoint documentation)
- TESTING.md (test execution)
- CONTRIBUTING.md (code contribution)
- SDD (complete spec)
- ROADMAP.md (future features)

### ARCHITECTURE points to:
- API.md (detailed endpoint docs)
- SDD (database schema, security)
- TESTING.md (test strategy)

### CONTRIBUTING points to:
- TESTING.md (testing guidelines)
- SDD (code style, constants)
- ARCHITECTURE.md (folder structure)

### TESTING points to:
- SDD (performance baselines)
- README.md (quality metrics)

### ROADMAP points to:
- CONTRIBUTING.md (how to help)
- SDD (current implementation details)

---

## 📱 How to Use This Documentation

### During Onboarding (Day 1)
1. ☑️ Read README (20 min)
2. ☑️ Read ARCHITECTURE.md (15 min)
3. ☑️ `pnpm dev` (see it working)
4. ☑️ Read CONTRIBUTING.md (10 min)
5. ✅ Ready to code!

### When Adding a Feature
1. ☑️ Check ROADMAP.md (is it planned?)
2. ☑️ Read related section in SDD
3. ☑️ Check ARCHITECTURE.md (where to put it?)
4. ☑️ Implement + test
5. ☑️ Follow CONTRIBUTING.md (PR process)

### When Debugging
1. ☑️ Check error in API.md (rate limit? auth?)
2. ☑️ Look at TESTING.md (debug mode)
3. ☑️ Check SDD business rules (expected behavior?)
4. ☑️ Search in ARCHITECTURE.md (data flow)

### When Reviewing Code
1. ☑️ Check CONTRIBUTING.md (code style)
2. ☑️ Check TESTING.md (coverage threshold)
3. ☑️ Check SDD (business logic correctness)
4. ☑️ Check ARCHITECTURE.md (folder/naming conventions)

### When Planning Future Work
1. ☑️ Check ROADMAP.md (what's priority?)
2. ☑️ Check SDD section 11 (backlog with effort)
3. ☑️ Check CONTRIBUTING.md (template for issues)

---

## 🎓 Learning Paths

### Path 1: Get Productive ASAP (2 hours)
```
README (20 min)
  ↓
CONTRIBUTING (20 min)
  ↓
ARCHITECTURE (overview, 15 min)
  ↓
Setup local (15 min)
  ↓
Run tests (10 min)
  ↓
Make first PR (45 min)
```

### Path 2: Deep Understanding (Full Day)
```
README (20 min)
  ↓
ARCHITECTURE (30 min)
  ↓
SDD (60 min - skim sections 1-6)
  ↓
API.md (30 min)
  ↓
TESTING.md (30 min)
  ↓
CONTRIBUTING (20 min)
  ↓
Hands-on: Build a feature (2 hours)
```

### Path 3: Maintenance & Troubleshooting (Variable)
```
When issue occurs:
  → Check README (known issues)
  → Check API.md (rate limit, errors)
  → Check SDD section 8 (security)
  → Check TESTING.md (debug mode)
  → Search in ARCHITECTURE.md
```

---

## ❓ FAQ

**Q: Where do I find what I need to know?**
A: Use "Which Doc Should I Read?" table above based on your role.

**Q: How complete is the documentation?**
A: README + SDD are 100% up-to-date. Architecture/API/Testing are comprehensive. Roadmap changes frequently.

**Q: Should I read everything?**
A: No. Start with README + CONTRIBUTING. Reference others as needed.

**Q: Where do I report doc issues?**
A: GitHub Issues with label `docs`.

**Q: How are docs kept up-to-date?**
A: Docs updated in same PR as code changes (required in CONTRIBUTING.md).

---

## 📞 Need Help?

- 💬 Confused about architecture? Read ARCHITECTURE.md
- 🧪 Don't know how to test? Read TESTING.md
- 🤔 What should I work on? Check ROADMAP.md
- 🐛 Found a bug? Check API.md for error handling
- 📝 Ready to contribute? Read CONTRIBUTING.md

**Still stuck?** Open a GitHub Issue or Discussion! 🙋

---

**Last updated:** 2026-10-11  
**Total docs:** 7 files (~2500 lines)  
**Quick start time:** 20-45 minutes
