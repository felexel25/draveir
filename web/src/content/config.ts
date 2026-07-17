import { defineCollection, z } from 'astro:content';

const sagas = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    order: z.number(),
  }),
});

const phases = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    description: z.string(),
    order: z.number(),
  }),
});

const novels = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    synopsis: z.string(),
    status: z.string().nullable(),
    format: z.string().nullable().default(null),
    categories: z.array(z.string()),
    tags: z.array(z.string()),
    featured: z.boolean(),
    saga: z.string().nullable().default(null),
    sagaOrder: z.number().nullable().default(null),
    phase: z.string().nullable().default(null),
    phaseOrder: z.number().nullable().default(null),
    releaseWindow: z.string().nullable().default(null),
    related: z.array(z.string()).default([]),
  }),
});

const chapters = defineCollection({
  type: 'content',
  schema: z.object({
    novelSlug: z.string(),
    number: z.number(),
    title: z.string(),
    chapterSlug: z.string(),
    publishedAt: z.string(),
  }),
});

const lockedChapters = defineCollection({
  type: 'data',
  schema: z.object({
    novelSlug: z.string(),
    number: z.number(),
    title: z.string(),
    chapterSlug: z.string(),
    unlocksAt: z.string(),
  }),
});

export const collections = { sagas, phases, novels, chapters, lockedChapters };
