import type { LearningPath, PathInput, TopicStatus } from '../types'

const topics = (titles: string[], completed: number, active = true) => titles.map((title, index) => ({
  id: `topic-${index}`, title,
  status: (index < completed ? 'COMPLETED' : index === completed && active ? 'IN_PROGRESS' : 'NOT_STARTED') as TopicStatus,
}))

export function initialPaths(): LearningPath[] {
  return [
    { id: 'java-backend', title: 'Java Backend Development', description: 'From core language concepts to resilient, production-ready services.', icon: 'coffee', color: 'sage', createdAt: 6,
      topics: topics(['Core Java', 'Collections', 'Exception handling', 'Generics', 'Multithreading', 'Spring Boot', 'REST APIs', 'Spring Security'], 4) },
    { id: 'system-design', title: 'System Design', description: 'Explore the decisions behind systems that scale gracefully.', icon: 'network', color: 'sand', createdAt: 5,
      topics: topics(['Networking fundamentals', 'Load balancing', 'Caching', 'Database design', 'Distributed systems', 'Design exercises'], 1) },
    { id: 'data-structures', title: 'Data Structures & Algorithms', description: 'Build a reliable toolkit for thinking through complex problems.', icon: 'code', color: 'lavender', createdAt: 4,
      topics: topics(['Arrays & strings', 'Linked lists', 'Stacks & queues', 'Trees', 'Graphs', 'Dynamic programming', 'Sorting & searching'], 2) },
    { id: 'sql-databases', title: 'SQL & Databases', description: 'Understand your data, write better queries, and model with intention.', icon: 'database', color: 'blue', createdAt: 3,
      topics: topics(['Relational models', 'SQL fundamentals', 'Joins & aggregation', 'Indexes', 'Transactions'], 5) },
    { id: 'python-fastapi', title: 'Python & FastAPI', description: 'A practical foundation for building clear, expressive Python APIs.', icon: 'terminal', color: 'rose', createdAt: 2,
      topics: topics(['Python essentials', 'Type hints', 'FastAPI fundamentals', 'Request validation'], 0, false) },
    { id: 'software-foundations', title: 'Software Foundations', description: 'The principles and patterns behind thoughtful software engineering.', icon: 'layers', color: 'gray', createdAt: 1,
      topics: topics(['Design principles', 'Testing strategies', 'Git workflows'], 0, false) },
  ]
}

export function createDemoPath(input: PathInput): LearningPath {
  return { ...input, id: crypto.randomUUID(), icon: 'layers', color: 'sage', topics: [], createdAt: Date.now() }
}
