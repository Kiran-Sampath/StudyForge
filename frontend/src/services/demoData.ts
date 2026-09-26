import type { ConfidenceLevel, Note, NoteFormat, NoteInput, TopicStatus } from '../types'
import * as pathsApi from './paths'
import * as topicsApi from './topics'
import * as notesApi from './notes'

type Diagram = 'pipeline' | 'request' | 'btree'
type DemoNote = {
  title: string
  content: string
  format: NoteFormat
  links: NoteInput['links']
  takeaway: string
  question: string
  confidence: ConfidenceLevel
  images?: { filename: string; alt: string; diagram: Diagram; inline?: boolean }[]
}
type DemoTopic = { title: string; description: string; status: TopicStatus; notes?: DemoNote[] }
type DemoPath = { title: string; description: string; topics: DemoTopic[] }

const samplePaths: DemoPath[] = [
  {
    title: 'Demo · Python for Data Analysis',
    description: 'A practical path from your first notebook to clear, reliable analysis.',
    topics: [
      { title: 'Set up a notebook workflow', description: 'Create a repeatable workspace for exploration.', status: 'COMPLETED' },
      { title: 'Load and inspect datasets', description: 'Read tabular data and learn what it contains.', status: 'IN_PROGRESS', notes: [{
        title: 'A reliable data workflow', format: 'markdown',
        content: '## Start with a small loop\n\nLoad the data, inspect its shape and types, then validate assumptions before transforming anything. Keeping these steps visible makes later analysis easier to trust.\n\n```python\nimport pandas as pd\n\ndf = pd.read_csv("sales.csv")\nprint(df.shape)\nprint(df.dtypes)\n```',
        links: [{ label: 'Pandas: 10 minutes to pandas', url: 'https://pandas.pydata.org/docs/user_guide/10min.html' }, { label: 'Pandas on GitHub', url: 'https://github.com/pandas-dev/pandas' }],
        takeaway: 'Inspect shape, types, and missing values before drawing conclusions.', question: 'Which columns need an explicit type or missing-value policy?', confidence: 'NEED_MORE_PRACTICE',
        images: [{ filename: 'data-workflow.png', alt: 'Four stages of a careful data workflow', diagram: 'pipeline', inline: true }],
      }] },
      { title: 'Clean and reshape data', description: 'Handle missing values, duplicates, and useful columns.', status: 'NOT_STARTED', notes: [{
        title: 'A small cleaning checklist', format: 'plain',
        content: 'Before changing rows, record how many you have. Standardize column names, inspect missingness, and keep the original input unchanged so each transformation can be repeated.',
        links: [{ label: 'Pandas: missing data', url: 'https://pandas.pydata.org/docs/user_guide/missing_data.html' }],
        takeaway: 'Make cleaning steps explicit and repeatable.', question: 'Would another analyst understand why each row was removed?', confidence: 'STILL_LEARNING',
      }] },
      { title: 'Explore and communicate findings', description: 'Summarize patterns and explain uncertainty.', status: 'NOT_STARTED' },
    ],
  },
  {
    title: 'Demo · Web APIs with FastAPI',
    description: 'Design clear HTTP interfaces, validate data, and handle failure well.',
    topics: [
      { title: 'Routes and request flow', description: 'Follow a request through routing and response.', status: 'COMPLETED' },
      { title: 'Schemas and validation', description: 'Shape input and output with typed models.', status: 'IN_PROGRESS', notes: [{
        title: 'A request has a lifecycle', format: 'markdown',
        content: '## Make each boundary clear\n\nA client sends a request, the route validates its input, application logic performs the work, and the response returns a useful result or a clear error.\n\n```python\nfrom fastapi import FastAPI\nfrom pydantic import BaseModel\n\napp = FastAPI()\n\nclass StudySession(BaseModel):\n    topic: str\n    minutes: int\n```',
        links: [{ label: 'FastAPI tutorial', url: 'https://fastapi.tiangolo.com/tutorial/' }, { label: 'FastAPI on GitHub', url: 'https://github.com/fastapi/fastapi' }],
        takeaway: 'Validate at the boundary so the rest of the app can use trusted types.', question: 'Which failures should be client errors and which are server errors?', confidence: 'NEED_MORE_PRACTICE',
        images: [{ filename: 'request-lifecycle.png', alt: 'Client, validation, application, and response flow', diagram: 'request', inline: true }],
      }] },
      { title: 'Errors and status codes', description: 'Return actionable errors with accurate HTTP status.', status: 'NOT_STARTED' },
      { title: 'Test and document an API', description: 'Exercise routes and keep the contract discoverable.', status: 'NOT_STARTED' },
    ],
  },
  {
    title: 'Demo · Relational Database Design',
    description: 'Move from a sound schema to queries and transactions you can reason about.',
    topics: [
      { title: 'Model entities and relationships', description: 'Choose keys and represent real-world relationships.', status: 'COMPLETED' },
      { title: 'Query with joins and aggregates', description: 'Combine related records without losing meaning.', status: 'COMPLETED' },
      { title: 'Indexes and query plans', description: 'Understand how indexes trade storage for faster reads.', status: 'IN_PROGRESS', notes: [{
        title: 'Indexes narrow the search', format: 'markdown',
        content: '## Think of an index as a lookup structure\n\nAn index helps the database find candidate rows without scanning the whole table. It speeds up selected reads, while adding storage and work to writes. Measure the query plan before adding one.\n\n```sql\nCREATE INDEX idx_events_created_at\nON events (created_at);\n```',
        links: [{ label: 'PostgreSQL: indexes', url: 'https://www.postgresql.org/docs/current/indexes.html' }, { label: 'PostgreSQL documentation', url: 'https://www.postgresql.org/docs/current/' }],
        takeaway: 'An index is useful when its read benefit justifies its write and storage cost.', question: 'Does the query plan use this index for the real workload?', confidence: 'CONFIDENT',
        images: [{ filename: 'btree-index.png', alt: 'A simplified B-tree index with leaf pages', diagram: 'btree' }],
      }] },
      { title: 'Transactions and isolation', description: 'Keep concurrent changes consistent and predictable.', status: 'NOT_STARTED', notes: [{
        title: 'Transactions protect a unit of work', format: 'markdown',
        content: 'A transaction groups related changes so they succeed or fail together. Keep transactions focused, and choose an isolation level based on the anomalies the workflow can tolerate.',
        links: [{ label: 'PostgreSQL: transaction isolation', url: 'https://www.postgresql.org/docs/current/transaction-iso.html' }],
        takeaway: 'Commit related changes together and keep the transaction boundary intentional.', question: 'What should happen if the second write fails?', confidence: 'STILL_LEARNING',
      }] },
    ],
  },
]

async function diagramFile(filename: string, kind: Diagram): Promise<File> {
  const response = await fetch(`/demo-assets/${kind}.png`)
  if (!response.ok) throw new Error('Could not load a sample diagram asset.')
  return new File([await response.blob()], filename, { type: 'image/png' })
}

function inputFromNote(note: Note): NoteInput {
  return { title: note.title, content: note.content, format: note.format, links: note.links, key_takeaway: note.key_takeaway, revisit_question: note.revisit_question, confidence: note.confidence }
}

export async function seedDemoWorkspace(onProgress: (message: string) => void) {
  let existingPaths = await pathsApi.listPaths()
  for (const [pathIndex, definition] of samplePaths.entries()) {
    onProgress(`Preparing path ${pathIndex + 1} of ${samplePaths.length}: ${definition.title.replace('Demo · ', '')}`)
    let path = existingPaths.find(item => item.title === definition.title)
    if (!path) {
      path = await pathsApi.createPath({ title: definition.title, description: definition.description })
      existingPaths = [path, ...existingPaths]
    }
    let existingTopics = await topicsApi.listTopics(path.id)
    for (const [topicIndex, topicDefinition] of definition.topics.entries()) {
      let topic = existingTopics.find(item => item.title === topicDefinition.title)
      if (!topic) {
        topic = await topicsApi.createTopic(path.id, { title: topicDefinition.title, description: topicDefinition.description })
        existingTopics.push(topic)
      }
      if (topic.status !== topicDefinition.status) topic = await topicsApi.updateTopic(topic.id, { status: topicDefinition.status })
      for (const noteDefinition of topicDefinition.notes ?? []) {
        onProgress(`Adding “${noteDefinition.title}”`)
        const existingNotes = await notesApi.listNotes(topic.id)
        let note = existingNotes.find(item => item.title === noteDefinition.title)
        if (!note) {
          const input: NoteInput = { title: noteDefinition.title, content: noteDefinition.content, format: noteDefinition.format, links: noteDefinition.links, key_takeaway: noteDefinition.takeaway, revisit_question: noteDefinition.question, confidence: noteDefinition.confidence }
          note = await notesApi.createNote(topic.id, input)
        }
        let images = await notesApi.listNoteImages(note.id)
        let updatedContent = note.content
        for (const imageDefinition of noteDefinition.images ?? []) {
          let image = images.find(item => item.filename === imageDefinition.filename)
          if (!image) {
            image = await notesApi.uploadNoteImage(note.id, await diagramFile(imageDefinition.filename, imageDefinition.diagram), imageDefinition.alt)
            images = [...images, image]
          }
          if (imageDefinition.inline && !updatedContent.includes(`![${imageDefinition.alt}]`)) {
            updatedContent += `\n\n![${imageDefinition.alt}](${image.url})`
          }
        }
        if (updatedContent !== note.content) {
          note = await notesApi.updateNote(note.id, { ...inputFromNote(note), content: updatedContent }) as Note
        }
      }
      onProgress(`Added ${topicIndex + 1} of ${definition.topics.length} topics to ${definition.title.replace('Demo · ', '')}`)
    }
  }
  onProgress('Sample workspace is ready.')
}

export const demoPathTitles = samplePaths.map(path => path.title)
