# CSV Import Specification - Nostradamus Project Management

## Overview

This document defines the technical specification for CSV file import in the Nostradamus project management tool. It outlines the required format, validation rules, and business logic for each column.

## File Format

- **Format**: CSV (Comma-Separated Values)
- **Encoding**: UTF-8
- **Header Row**: Required (first row must contain column names)
- **Date Format**: `yyyy-MM-dd` (ISO 8601)

## Column Definitions

### 1. Mandatory Columns

The following columns are **required** and must contain values for each row:

| Column | Type | Description | Validation |
|--------|------|-------------|------------|
| `id` | String | Unique task identifier | Must be unique across all tasks |
| `name` | String | Task title/description | Non-empty string |
| `status` | Enum | Current task status | Must be one of: `completed`, `in-progress`, `not-started` |
| `profile_type` | String | Profile/role type | Non-empty string (e.g., backend, frontend, mobile, devops, qa) |
| `remaining_estimate_hours` | Number | Remaining work estimate in hours | Non-negative number |

### 2. Optional Columns

| Column | Type | Description | Default Value |
|--------|------|-------------|---------------|
| `startDate` | Date | Planned start date | Calculated from dependencies or project start |
| `endDate` | Date | Planned end date | Calculated from startDate + remaining hours / resource_allocation |
| `progress` | Number | Completion percentage (0-100) | 0 if not provided |
| `assignee` | String | Person assigned to task | Empty/unassigned |
| `dependency` | String | Task ID this task depends on | None |
| `resource_allocation` | Number | Team capacity/parallel workers | 1.0 (one full-time person) |

## Detailed Column Logic

### 2.1 `id` - Primary Key

**Purpose**: Unique identifier for each task

**Rules**:
- Must be unique across entire CSV file
- Used as primary key for task differentiation
- Used in `dependency` field to reference tasks
- Cannot be empty or duplicate

**Validation**:
```
- Check: id exists and is non-empty
- Check: id is unique (no duplicates in file)
```

**Example**: `task-1`, `PROJ-123`, `feature-auth-001`

---

### 2.2 `name` - Task Title

**Purpose**: Functional description of work to be done

**Rules**:
- Serves as identifying label for task in UI
- Describes what needs to be done
- Cannot be empty

**Validation**:
```
- Check: name exists and is non-empty
- Recommended: length <= 200 characters
```

**Example**: `"User Authentication Service"`, `"Product Discovery & Requirements"`

---

### 2.3 `startDate` - Task Start Date

**Purpose**: Date when task is planned to start

**Format**: `yyyy-MM-dd` (e.g., `2025-08-01`)

**Rules**:
- Optional field
- If task has a `dependency`, the actual start date is **MAX(planned startDate, dependency.endDate)**
- Dependency end date takes **priority** over planned start date
- If not provided, calculated from dependencies or project start

**Validation**:
```
- If provided: must be valid date in format yyyy-MM-dd
- If dependency exists and dependency.endDate > startDate:
    actual_start = dependency.endDate
- If not provided: use project.startDate or dependency.endDate
```

**Dependency Logic**:
```javascript
if (task.dependency) {
  const depTask = findTask(task.dependency)
  const dependencyEnd = depTask.endDate

  if (task.startDate < dependencyEnd) {
    // Dependency takes priority
    task.actualStartDate = dependencyEnd
  }
}
```

**Example**:
- Planned: `2025-08-01`
- Dependency ends: `2025-08-15`
- **Actual start**: `2025-08-15` (dependency takes priority)

---

### 2.4 `endDate` - Task End Date

**Purpose**: Date when task is planned to complete

**Format**: `yyyy-MM-dd` (e.g., `2025-08-31`)

**Rules**:
- Optional field
- Similar dependency logic as `startDate`
- If task has dependency, end date adjusts based on actual start
- If not provided, calculated from start date + remaining_estimate_hours

**Validation**:
```
- If provided: must be valid date in format yyyy-MM-dd
- Should be >= startDate (after validation adjustments)
- If not provided: calculated from actualStartDate + remaining_estimate_hours
```

**Calculation**:
```javascript
if (!task.endDate) {
  // Estimate: 8 hours per working day
  const estimatedDays = Math.ceil(task.remaining_estimate_hours / 8)
  task.endDate = addBusinessDays(task.actualStartDate, estimatedDays)
}
```

**Example**:
- Start: `2025-08-01`
- Remaining hours: `80`
- **Calculated end**: `2025-08-11` (80h ÷ 8h/day = 10 days)

---

### 2.5 `progress` - Completion Percentage

**Purpose**: Shows completion percentage of task

**Type**: Number (0-100)

**Rules**:
- Optional field
- Range: 0 to 100
- If not provided or empty: defaults to `0` (0% complete)
- Used for visual progress indicators

**Validation**:
```
- If provided: must be number between 0 and 100
- If empty or not provided: default = 0
```

**Status Relationship**:
```javascript
// Suggested correlation (not enforced):
if (status === 'not-started') progress = 0
if (status === 'in-progress') progress = 1-99
if (status === 'completed') progress = 100
```

**Example**: `0`, `45`, `100`

---

### 2.6 `status` - Task Status

**Purpose**: Current state of the task

**Type**: Enum (3 possible values)

**Rules**:
- **Mandatory** field
- Must be one of: `completed`, `in-progress`, `not-started`
- Case-sensitive
- Used for filtering, color coding, burndown calculations

**Validation**:
```
- Check: status exists and is non-empty
- Check: status in ['completed', 'in-progress', 'not-started']
```

**Values**:
| Value | Description | UI Color |
|-------|-------------|----------|
| `completed` | Task is finished | Teal (#2DD4BF) |
| `in-progress` | Task is actively being worked on | Salmon (#FF9A66) |
| `not-started` | Task hasn't begun yet | Gray (#B3B3BA) |

**Example**: `in-progress`

---

### 2.7 `assignee` - Assigned Person

**Purpose**: Person responsible for the task

**Type**: String

**Rules**:
- Optional field
- Can be empty
- Free-form text (name, email, or user ID)
- Used for team visualization and filtering

**Validation**:
```
- No strict validation
- Can be empty
```

**Example**: `"Sarah Chen"`, `"john.doe@company.com"`, `"user-123"`

---

### 2.8 `profile_type` - Role/Profile Type

**Purpose**: Type of expertise/role required for task

**Type**: String

**Rules**:
- **Mandatory** field
- Cannot be empty
- Typically one of: `backend`, `frontend`, `mobile`, `devops`, `qa`, `product`, `design`
- Used for:
  - Burndown chart breakdown by profile
  - Resource allocation visualization
  - Team capacity planning

**Validation**:
```
- Check: profile_type exists and is non-empty
- Recommended values: backend, frontend, mobile, devops, qa, product, design
- Case-insensitive comparison recommended
```

**Example**: `backend`, `frontend`, `qa`

---

### 2.9 `remaining_estimate_hours` - Remaining Work Estimate

**Purpose**: Hours of work remaining to complete the task

**Type**: Number (positive)

**Rules**:
- **Mandatory** field
- Must be non-negative number
- Critical for burndown chart calculations
- Represents work **remaining**, not total effort
- For completed tasks, should be `0`

**Validation**:
```
- Check: remaining_estimate_hours exists and is non-empty
- Check: remaining_estimate_hours >= 0
- If status === 'completed': should be 0 (recommended)
```

**Burndown Logic**:
```javascript
// Task contributes to burndown based on status and dates
if (task.status === 'completed' || task.endDate < currentDate) {
  remainingHours = 0
} else if (task.startDate > currentDate) {
  remainingHours = task.remaining_estimate_hours  // Not started
} else {
  remainingHours = task.remaining_estimate_hours  // In progress
}
```

**Example**: `80`, `24`, `0`

---

### 2.10 `dependency` - Task Dependency

**Purpose**: Critical dependency - task cannot start until dependency is completed

**Type**: String (Task ID reference)

**Rules**:
- Optional field
- If present, must reference a valid task `id` in the same CSV
- Creates a **strong dependency**: dependent task cannot start until this task is done
- Affects automatic start/end date calculations
- Can only have single direct dependency (for multiple, chain dependencies)

**Validation**:
```
- If provided: must reference existing task id
- Check: no circular dependencies (A depends on B, B depends on A)
- Check: dependency task exists in CSV
```

**Dependency Resolution**:
```javascript
function resolveStartDate(task) {
  if (!task.dependency) {
    return task.startDate || project.startDate
  }

  const depTask = findTask(task.dependency)
  const depEndDate = depTask.endDate

  // Task starts AFTER dependency completes
  return max(task.startDate, depEndDate)
}
```

**Example**:
```csv
id,name,dependency
task-1,Design API,
task-2,Implement API,task-1
task-3,Write Tests,task-2
```
→ task-2 starts after task-1 ends, task-3 starts after task-2 ends

---

### 2.11 `resource_allocation` - Team Capacity / Parallel Workers

**Purpose**: Represents team capacity allocated to this task (number of parallel workers or resource availability)

**Type**: Number (positive decimal)

**Rules**:
- **Optional** field (default: 1.0)
- Represents effective team capacity:
  - `1.0` = one full-time person
  - `0.5` = half-time person or 50% availability
  - `2.0` = two people working in parallel
  - `0.1` = 10% of a person's time
- Affects task duration calculation
- Minimum: 0.01 (1% capacity)
- Maximum: 1000 (large team)

**Validation**:
```
- If provided: must be positive number > 0
- If not provided: defaults to 1.0
- Recommended range: 0.01 to 1000
- Check: resource_allocation > 0
```

**Duration Calculation**:
```javascript
// Task duration affected by resource allocation
const workHours = task.remaining_estimate_hours  // e.g., 80h
const capacity = task.resource_allocation || 1.0  // e.g., 2.0 (two people)

// Calculate working days needed
const effectiveHours = workHours / capacity  // 80 / 2.0 = 40h
const workingDays = Math.ceil(effectiveHours / 8)  // 40 / 8 = 5 days

task.endDate = addDays(task.startDate, workingDays)
```

**Examples**:

| remaining_estimate_hours | resource_allocation | Calculation | Duration |
|-------------------------|---------------------|-------------|----------|
| 80h | 1.0 (default) | 80 / 1.0 / 8 | 10 days |
| 80h | 2.0 (two people) | 80 / 2.0 / 8 | 5 days |
| 80h | 0.5 (part-time) | 80 / 0.5 / 8 | 20 days |
| 120h | 4.0 (team of 4) | 120 / 4.0 / 8 | 4 days |
| 40h | 0.25 (25% time) | 40 / 0.25 / 8 | 20 days |

**Use Cases**:
- **Team parallelization**: Multiple people working simultaneously
- **Part-time allocation**: Person working 50% on this, 50% on other tasks
- **Capacity planning**: Model different team size scenarios
- **Bottleneck analysis**: Identify tasks with low resource allocation

**CSV Example**:
```csv
id,name,profile_type,remaining_estimate_hours,resource_allocation
task-1,API Design,backend,40,1.0
task-2,Frontend Dev,frontend,80,2.0
task-3,Code Review,qa,20,0.5
```

**Example**: `1.0`, `2.5`, `0.5`, `4.0`

---

## Validation Rules Summary

### File-Level Validation

1. **Header validation**: All mandatory columns present
2. **Unique IDs**: No duplicate `id` values
3. **Circular dependencies**: No dependency cycles
4. **Valid references**: All `dependency` values reference existing task IDs

### Row-Level Validation

1. **Mandatory fields**: `id`, `name`, `status`, `profile_type`, `remaining_estimate_hours` must exist
2. **Status enum**: `status` must be one of allowed values
3. **Date format**: `startDate`, `endDate` must be valid `yyyy-MM-dd`
4. **Number range**: `progress` (0-100), `remaining_estimate_hours` (≥0)

### Validation Error Messages

```javascript
{
  "MISSING_MANDATORY_FIELD": "Missing required field '{field}' in row {row}",
  "DUPLICATE_ID": "Duplicate task ID '{id}' found in rows {rows}",
  "INVALID_STATUS": "Invalid status '{status}' in row {row}. Must be: completed, in-progress, not-started",
  "INVALID_DATE_FORMAT": "Invalid date format '{date}' in row {row}. Expected: yyyy-MM-dd",
  "INVALID_NUMBER": "Invalid number '{value}' for field '{field}' in row {row}",
  "INVALID_DEPENDENCY": "Task '{id}' references non-existent dependency '{dependency}' in row {row}",
  "CIRCULAR_DEPENDENCY": "Circular dependency detected: {chain}"
}
```

## Example Valid CSV

```csv
id,name,startDate,endDate,progress,status,assignee,profile_type,remaining_estimate_hours,resource_allocation,dependency
task-1,Product Discovery,2025-08-01,2025-08-14,100,completed,Sarah Chen,product,0,1.0,
task-2,API Design,2025-08-15,2025-08-28,100,completed,Mike Johnson,backend,0,1.0,task-1
task-3,Database Schema,2025-08-15,2025-08-21,100,completed,Mike Johnson,backend,0,1.0,task-1
task-4,Auth Service,2025-08-29,2025-09-18,85,in-progress,Elena Popov,backend,24,1.5,task-2
task-5,User Dashboard,2025-09-01,2025-09-25,60,in-progress,Tom Wilson,frontend,96,2.0,task-2
```

## Business Logic Flow

### Import Process

1. **Parse CSV** → Extract rows and columns
2. **Validate Headers** → Ensure mandatory columns present
3. **Validate Rows** → Check each row for:
   - Mandatory fields
   - Data types and formats
   - Valid enum values
4. **Validate References** → Check:
   - ID uniqueness
   - Dependency references
   - Circular dependencies
5. **Calculate Dates** → Apply dependency logic:
   - Resolve actual start dates
   - Calculate missing end dates
6. **Import Data** → If all validations pass

### Dependency Resolution Algorithm

```javascript
function resolveDependencies(tasks) {
  const resolved = new Set()
  const visiting = new Set()

  function resolve(taskId) {
    if (resolved.has(taskId)) return
    if (visiting.has(taskId)) throw new Error('Circular dependency')

    visiting.add(taskId)
    const task = findTask(taskId)

    if (task.dependency) {
      resolve(task.dependency)
      const depTask = findTask(task.dependency)
      task.actualStartDate = max(task.startDate, depTask.endDate)
    } else {
      task.actualStartDate = task.startDate || projectStart
    }

    if (!task.endDate) {
      // Calculate duration considering resource allocation
      const resourceAllocation = task.resource_allocation || 1.0
      const effectiveHours = task.remaining_estimate_hours / resourceAllocation
      const days = Math.ceil(effectiveHours / 8)
      task.endDate = addBusinessDays(task.actualStartDate, days)
    }

    visiting.delete(taskId)
    resolved.add(taskId)
  }

  tasks.forEach(task => resolve(task.id))
}
```

## Integration with Charts

### Gantt Chart
- Uses `actualStartDate` and `endDate` for bar positioning
- Colors bars based on `status`
- Shows `progress` as filled percentage
- Displays `dependency` relationships

### Burndown Chart
- Calculates remaining work per day based on:
  - Task `status`
  - Task `startDate` and `endDate`
  - `remaining_estimate_hours`
- Groups by `profile_type` for stacked area view
- Uses `status === 'completed'` to determine when hours drop to 0

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-07 | System | Initial specification |

---

**Last Updated**: 2025-01-07
**Document Owner**: Nostradamus Development Team
