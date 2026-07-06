import { defineCollection, z } from 'astro:content';

const novels = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    synopsis: z.string(),
    status: z.string().nullable(),
    categories: z.array(z.string()),
    tags: z.array(z.string()),
    featured: z.boolean(),
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

export const collections = { novels, chapters };
