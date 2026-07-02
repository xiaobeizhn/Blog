// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { defineConfig, fontProviders } from 'astro/config';

// 部署后请把 site 改为你的 Netlify 域名（例如 https://your-blog.netlify.app）
// 影响sitemap、RSS、canonical URL 的生成
export default defineConfig({
	site: 'https://blog-xiaobeizhn.netlify.app',
	integrations: [mdx(), sitemap(), react()],
	// 纯静态输出（默认），dist/ 直接由 Netlify 托管，无需 SSR adapter
	output: 'static',
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
