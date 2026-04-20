import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || '/api/tasks'

function App() {
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState({ loading: false, error: '' })

  const activeCount = useMemo(
    () => tasks.filter((task) => (task.status || 'pending') === 'pending').length,
    [tasks],
  )

  const completedCount = useMemo(
    () => tasks.filter((task) => (task.status || 'pending') === 'completed').length,
    [tasks],
  )

  const completionPercent = useMemo(
    () => (tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0),
    [completedCount, tasks.length],
  )

  const formatDate = (value) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))

  const parseJsonSafe = async (response) => {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  const fetchTasks = async () => {
    setStatus({ loading: true, error: '' })
    try {
      const response = await fetch(API_URL)
      if (!response.ok) throw new Error('Unable to load tasks')
      const data = await parseJsonSafe(response)
      if (!data) throw new Error('Invalid response from server')
      setTasks(data)
    } catch (error) {
      setStatus({ loading: false, error: error.message })
    } finally {
      setStatus((prev) => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleCreateTask = async (event) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle || !trimmedDescription) {
      setStatus({ loading: false, error: 'Title and description are required' })
      return
    }

    setStatus({ loading: true, error: '' })
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
        }),
      })
      if (!response.ok) {
        const body = await parseJsonSafe(response)
        throw new Error(body?.error || 'Unable to add task')
      }
      setTitle('')
      setDescription('')
      await fetchTasks()
    } catch (error) {
      setStatus({ loading: false, error: error.message })
    }
  }

  const toggleTaskStatus = async (task) => {
    const currentStatus = task.status || 'pending'
    setStatus({ loading: true, error: '' })
    try {
      const response = await fetch(`${API_URL}/${task._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: currentStatus === 'completed' ? 'pending' : 'completed',
        }),
      })
      if (!response.ok) throw new Error('Unable to update task')
      await fetchTasks()
    } catch (error) {
      setStatus({ loading: false, error: error.message })
    }
  }

  const removeTask = async (id) => {
    setStatus({ loading: true, error: '' })
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Unable to remove task')
      await fetchTasks()
    } catch (error) {
      setStatus({ loading: false, error: error.message })
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">MERN Task Manager</p>
          <h1>Task Management System</h1>
          <p className="lead">
            Create and track tasks with title, description, status, and created date.
          </p>
        </div>
        <div className="stats">
          <div>
            <strong>{tasks.length}</strong>
            <span>Total</span>
          </div>
          <div>
            <strong>{activeCount}</strong>
            <span>Pending</span>
          </div>
          <div>
            <strong>{completedCount}</strong>
            <span>Completed</span>
          </div>
        </div>
        <div className="completion-row">
          <span>Completion</span>
          <div className="completion-bar">
            <div className="completion-fill" style={{ width: `${completionPercent}%` }} />
          </div>
          <span className="completion-percent">{completionPercent}%</span>
        </div>
      </header>

      <main className="task-main">
        <form className="task-form" onSubmit={handleCreateTask}>
          <label htmlFor="task-title">Task title</label>
          <input
            id="task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Enter a task title"
          />
          <label htmlFor="task-description">Task description</label>
          <textarea
            id="task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe this task"
            rows={4}
          />
          <button type="submit" disabled={status.loading}>
            Add task
          </button>
        </form>

        {status.error && <p className="error">{status.error}</p>}

        <section className="task-list">
          {status.loading ? (
            <p className="empty-state">Loading tasks…</p>
          ) : tasks.length === 0 ? (
            <p className="empty-state">No tasks yet. Add one to get started.</p>
          ) : (
            tasks.map((task) => (
              <article key={task._id} className="task-item">
                <div className="task-summary">
                  <div className="task-headline">
                    <button
                      type="button"
                      className={`task-toggle ${(task.status || 'pending') === 'completed' ? 'done' : ''}`}
                      onClick={() => toggleTaskStatus(task)}
                      aria-label={`Mark ${task.title} as ${(task.status || 'pending') === 'completed' ? 'pending' : 'completed'}`}
                    >
                      {(task.status || 'pending') === 'completed' ? 'Mark pending' : 'Mark complete'}
                    </button>
                    <div>
                      <h2 className={task.status === 'completed' ? 'task-title done' : 'task-title'}>
                        {task.title}
                      </h2>
                      <p className="task-description">{task.description}</p>
                    </div>
                  </div>
                  <div className="task-meta">
                    <span className={`task-label ${task.status || 'pending'}`}>{task.status || 'pending'}</span>
                    <span>{formatDate(task.createdAt)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="task-delete"
                  onClick={() => removeTask(task._id)}
                  aria-label={`Remove ${task.title}`}
                >
                  ×
                </button>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  )
}

export default App
