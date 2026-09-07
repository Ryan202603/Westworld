import type { GenerateJob, Project, StoryboardResult } from './types'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const b = (await res.json()) as { message?: string; error?: string }
      msg = b.message ?? b.error ?? msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  listProjects: () => req<Project[]>('/projects'),
  createProject: (input: { title: string; content: string }) =>
    req<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }),
  getProject: (id: string) => req<Project>(`/projects/${id}`),
  deleteProject: (id: string) => req<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  generate: (projectId: string, chapterId: string) =>
    req<{ jobId: string; status: string; chapterId: string }>(`/projects/${projectId}/chapters/${chapterId}/generate`, {
      method: 'POST'
    }),
  getJob: (projectId: string, jobId: string) => req<GenerateJob>(`/projects/${projectId}/jobs/${jobId}`),
  latestStoryboard: (projectId: string, chapterId: string) =>
    req<StoryboardResult>(`/projects/${projectId}/chapters/${chapterId}/storyboard`)
}
