import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// 加载 src/content/blog/ 下的 Markdown 和 MDX 文件
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// 校验 frontmatter
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		// 头图：支持字符串 URL（后台上传到 /images/ 的图片）
		heroImage: z.string().optional(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
	}),
});

export const collections = { blog };
