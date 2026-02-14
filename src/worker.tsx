import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { createClient } from '@supabase/supabase-js'
import { derivePersonalRecordRows, PersistedPersonalRecord } from './lib/personalRecords'
import {
  buildExercisePayload,
  canEditExercise,
  validateExerciseName,
} from './lib/exerciseUtils'

// For Workers Sites, we need to import the manifest
// @ts-ignore
import manifest from '__STATIC_CONTENT_MANIFEST'

type WorkerBindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

const app = new Hono<{ Bindings: WorkerBindings }>()

const getSupabaseClient = (c: { env: WorkerBindings }, accessToken: string) =>
  createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

const getAccessToken = (authorizationHeader?: string | null) => {
  if (!authorizationHeader) return null
  if (!authorizationHeader.startsWith('Bearer ')) return null
  return authorizationHeader.replace('Bearer ', '').trim()
}

const getAuthedClient = async (c: any) => {
  const accessToken = getAccessToken(c.req.header('Authorization'))
  if (!accessToken) {
    return { client: null, userId: null, response: c.json({ error: 'Unauthorized' }, 401) }
  }

  const client = getSupabaseClient(c, accessToken)
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError || !user) {
    return { client: null, userId: null, response: c.json({ error: 'Unauthorized' }, 401) }
  }

  return { client, userId: user.id, response: null }
}

app.get('/api/pr', async (c) => {
  const auth = await getAuthedClient(c)
  if (auth.response) return auth.response

  const { client, userId } = auth

  const [historyResult, exerciseResult, persistedResult] = await Promise.all([
    client
      .from('workout_sessions')
      .select('completed_at, exercises_completed')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false }),
    client.from('exercises').select('id,name,primary_muscle,equipment').order('name', { ascending: true }),
    client
      .from('personal_records')
      .select('exercise_name,weight,reps,date')
      .eq('user_id', userId),
  ])

  if (historyResult.error) return c.json({ error: historyResult.error.message }, 500)
  if (exerciseResult.error) return c.json({ error: exerciseResult.error.message }, 500)
  if (persistedResult.error) return c.json({ error: persistedResult.error.message }, 500)

  const persistedMap: Record<string, PersistedPersonalRecord> = {}
    ; (persistedResult.data || []).forEach((entry: any) => {
      persistedMap[entry.exercise_name] = {
        weight: entry.weight,
        reps: entry.reps,
        date: entry.date,
      }
    })

  const records = derivePersonalRecordRows(
    (historyResult.data as any[]) || [],
    (exerciseResult.data as any[]) || [],
    persistedMap
  )

  return c.json({ data: records })
})

app.get('/api/exercises', async (c) => {
  const auth = await getAuthedClient(c)
  if (auth.response) return auth.response

  const { client } = auth
  const { data, error } = await client.from('exercises').select('*').order('name', { ascending: true })

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ data })
})

app.post('/api/exercises', async (c) => {
  const auth = await getAuthedClient(c)
  if (auth.response) return auth.response

  const { client, userId } = auth
  const body = await c.req.json()

  const existingByName = await client.from('exercises').select('id,name')
  if (existingByName.error) return c.json({ error: existingByName.error.message }, 500)
  const name = typeof body?.name === 'string' ? body.name : ''
  const validation = validateExerciseName(
    name,
    (existingByName.data || []).map((exercise: any) => ({ id: exercise.id, name: exercise.name }))
  )
  if (validation.error && validation.error !== 'Exercise with this name already exists') {
    return c.json({ error: validation.error }, 400)
  }
  if (validation.error === 'Exercise with this name already exists') {
    return c.json({ error: validation.error }, 409)
  }

  const payload = buildExercisePayload(body)

  const { data: created, error: createError } = await client
    .from('exercises')
    .insert([{ ...payload, user_id: userId }])
    .select('*')
    .single()

  if (createError) return c.json({ error: createError.message }, 500)
  return c.json({ data: created }, 201)
})

app.patch('/api/exercises/:id', async (c) => {
  const auth = await getAuthedClient(c)
  if (auth.response) return auth.response

  const { client, userId } = auth
  const id = c.req.param('id')
  const body = await c.req.json()

  const { data: existing, error: existingError } = await client
    .from('exercises')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (existingError) return c.json({ error: existingError.message }, 500)
  if (!existing) return c.json({ error: 'Exercise not found' }, 404)

  if (!canEditExercise(existing.user_id, userId)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const updates: Record<string, unknown> = {}

  if (typeof body?.name === 'string') {
    const { data: existingNames, error: namesError } = await client.from('exercises').select('id,name')
    if (namesError) return c.json({ error: namesError.message }, 500)

    const nameValidation = validateExerciseName(
      body.name,
      (existingNames || []).map((exercise: any) => ({ id: exercise.id, name: exercise.name })),
      id
    )
    if (nameValidation.error) {
      const status = nameValidation.error === 'Exercise with this name already exists' ? 409 : 400
      return c.json({ error: nameValidation.error }, status)
    }

    updates.name = nameValidation.trimmedName
  }

  if (typeof body?.primary_muscle === 'string') updates.primary_muscle = body.primary_muscle
  if (typeof body?.equipment === 'string') updates.equipment = body.equipment
  if (typeof body?.category === 'string') updates.category = body.category
  if (body?.tracking_type === 'reps' || body?.tracking_type === 'time') {
    updates.tracking_type = body.tracking_type
  }
  if (Array.isArray(body?.secondary_muscles)) {
    updates.secondary_muscles = body.secondary_muscles.filter((item: unknown) => typeof item === 'string')
  }
  if (typeof body?.instructions === 'string') {
    updates.instructions = body.instructions.trim() || null
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400)
  }

  const { data: updated, error: updateError } = await client
    .from('exercises')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (updateError) return c.json({ error: updateError.message }, 500)
  return c.json({ data: updated })
})

// Serve static files
app.use('/*', serveStatic({ root: './', manifest }))

// Fallback to index.html for SPA routing
app.get('*', serveStatic({ path: './index.html', manifest }))

export default app
